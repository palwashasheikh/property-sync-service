# Property Listing Sync Service

A backend service that aggregates property listings from multiple UAE real estate platforms (Bayut, Property Finder, Dubizzle), normalizes them into a unified schema, detects cross-platform duplicates, and exposes a clean paginated REST API.

---

## The Problem

Real estate agencies in UAE list the same property on multiple platforms — Bayut, Property Finder, Dubizzle — each with different data formats, field names, and slight price variations. This creates:

- **Data inconsistency** — same property with conflicting prices across platforms
- **Manual overhead** — agents copy-paste listings and keep them in sync manually
- **No single source of truth** — analytics and reporting are unreliable

This service solves that by ingesting all sources, normalizing to one schema, and flagging duplicates automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SCHEDULER (cron)                  │
│              Runs every 30 minutes                  │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   INGESTION PIPELINE  │
         │  (per source)         │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │      NORMALIZER       │  ← Maps source-specific fields
         │  Bayut / PF / Dubizzle│    to standard schema
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  DEDUPLICATION ENGINE │  ← Weighted scoring across
         │  (fuzzy match)        │    price, area, location, beds
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │     PostgreSQL DB     │
         │  listings             │
         │  duplicate_pairs      │
         │  sync_logs            │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │      REST API         │
         │  /api/listings        │
         │  /api/sync/stats      │
         │  /api/sync/duplicates │
         └───────────────────────┘
```

---

## Key Design Decisions

### 1. Schema Normalization
Each source uses different field names for the same concept:

| Concept   | Bayut          | Property Finder | Dubizzle   |
|-----------|----------------|-----------------|------------|
| Price     | `asking_price` | `sale_price`    | `price_aed`|
| Area      | `size_sqft`    | `area`          | `sqft`     |
| Bedrooms  | `beds`         | `num_bedrooms`  | `rooms`    |
| Format    | JSON           | XML             | CSV        |

A dedicated normalizer per source maps all of these to one standard schema. Adding a new source = writing one normalizer function.

### 2. Fuzzy Deduplication (Weighted Scoring)
Exact matching fails because the same property listed on two platforms will have slightly different prices (agent's discretion), slightly different sqft measurements, and different descriptions.

Instead, we score two listings across 5 dimensions:

| Field           | Weight |
|-----------------|--------|
| Location area   | 30 pts |
| Price (±5%)     | 25 pts |
| Area sqft (±5%) | 20 pts |
| Bedrooms        | 15 pts |
| Property type   | 10 pts |

If score ≥ 70 → flagged as duplicate. The original (first ingested) is kept; the duplicate is stored with a reference to the original and the match score.

Same-source comparisons are skipped — a Bayut listing is never compared to another Bayut listing.

### 3. Idempotent Ingestion
Running the sync twice produces the same result. Each listing uses `UPSERT` on `(external_id, source)`. No duplicate rows, no data corruption on re-runs.

### 4. Audit Trail
Every sync run is logged in `sync_logs` with counts for fetched, inserted, updated, and duplicates. Every duplicate relationship is stored in `duplicate_pairs` with the matched fields and confidence score — useful for debugging false positives.

---

## API Reference

### Listings

```
GET /api/listings
```

**Query parameters:**

| Param               | Type    | Description                              |
|---------------------|---------|------------------------------------------|
| city                | string  | Filter by city (partial match)           |
| area                | string  | Filter by neighborhood (partial match)   |
| type                | string  | `sale` or `rent`                         |
| property_type       | string  | `apartment`, `villa`, `office`, etc.     |
| min_price           | number  | Minimum price in AED                     |
| max_price           | number  | Maximum price in AED                     |
| bedrooms            | number  | Exact bedroom count                      |
| source              | string  | `bayut`, `property_finder`, `dubizzle`   |
| include_duplicates  | boolean | Include duplicate listings (default: false)|
| page                | number  | Page number (default: 1)                 |
| limit               | number  | Results per page (default: 20, max: 100) |
| sort_by             | string  | `price`, `area_sqft`, `synced_at`        |
| sort_order          | string  | `asc` or `desc`                          |

```
GET /api/listings/:id       — Single listing by ID
GET /api/sync/stats         — Dashboard summary stats
GET /api/sync/logs          — Sync run history
GET /api/sync/duplicates    — All detected duplicates with originals
```

---

## Local Setup

```bash
# 1. Clone and install
git clone <repo>
cd property-sync-service
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Create database
createdb property_sync

# 4. Run migrations
npm run migrate

# 5. Start the service
npm run dev
```

The service will start, run an immediate sync, then sync every 30 minutes.

---

## Stack

- **Node.js + Express** — API and ingestion pipeline
- **PostgreSQL** — Primary data store
- **node-cron** — Sync scheduling
- **fast-xml-parser** — XML source parsing (Property Finder)
- **csv-parse** — CSV source parsing (Dubizzle)

---

## What I'd Do Differently at Scale

**Current approach works for small-to-medium volume. At scale:**

1. **Replace cron with a message queue (BullMQ / RabbitMQ)**
   — Each source becomes an independent worker. Failed jobs retry automatically. No risk of one slow source blocking others.

2. **Add CDC (Change Data Capture) instead of polling**
   — Instead of fetching all listings every 30 min, detect and sync only changed listings. Reduces load significantly.

3. **Cache deduplication candidates in Redis**
   — Currently we load all non-duplicate listings into memory on every sync run. At 100k+ listings, this needs to be a Redis sorted set lookup by geo-hash + price bucket.

4. **Smarter deduplication with ML**
   — The current scoring is deterministic. A simple trained classifier on (price_diff, area_diff, location_distance, description_similarity) would reduce false positives significantly.

5. **Separate read/write databases**
   — Write DB for ingestion pipeline, read replica for API. Prevents sync jobs from affecting API response times.
