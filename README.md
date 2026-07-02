# Property Listing Sync Service

Aggregates listings from multiple UAE real estate platforms (Bayut, Property Finder, Dubizzle), normalizes data, detects duplicates with fuzzy matching, and exposes a production REST API.

**The problem:** Real estate agencies manually copy-paste listings across platforms and struggle to keep prices/data in sync. This service detects cross-platform duplicates automatically and maintains a single source of truth.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/palwashasheikh/property-sync-service
cd property-sync-service
npm install

# Setup database
createdb property_sync
cp .env.example .env
# Edit .env with your DB credentials

# Run migrations and start
npm run migrate
npm run dev
```

Backend runs on `http://localhost:3000`.

---

## Architecture

```
┌──────────────────────────────────────┐
│   INGESTION (every 30 minutes)      │
│  - Fetch from 3 sources             │
│  - Normalize to standard schema     │
│  - Detect duplicates (scoring)      │
│  - Upsert to PostgreSQL             │
└──────────────────────────────────────┘
           │
        ┌──▼──┐
        │     │
   ┌────▼─┐  ┌─▼────┐
   │Bayut │  │ Property
   │JSON  │  │ Finder
   └──────┘  │ XML
             └───────┘
   
   ┌─────────────────────┐
   │   NORMALIZER        │
   │  Maps all schemas   │
   │  to standard fields │
   └─────────────────────┘
           │
   ┌─────────────────────┐
   │  DEDUPLICATOR       │
   │  Weighted scoring:  │
   │  - Location (30pts) │
   │  - Price (25pts)    │
   │  - Area (20pts)     │
   │  - Beds (15pts)     │
   │  - Type (10pts)     │
   │  Threshold: 70+     │
   └─────────────────────┘
           │
   ┌─────────────────────┐
   │   PostgreSQL        │
   │  - listings         │
   │  - sync_logs        │
   │  - duplicate_pairs  │
   └─────────────────────┘
           │
   ┌─────────────────────┐
   │    REST API         │
   │  - /listings        │
   │  - /sync/stats      │
   │  - /sync/duplicates │
   └─────────────────────┘
```

---

## API Endpoints

### 1. Get Listings

```bash
curl "http://localhost:3000/api/listings?city=Dubai&type=sale&limit=10"
```

**Query Parameters:**
- `city` — Filter by city (case-insensitive partial match)
- `area` — Filter by neighborhood
- `type` — `sale` or `rent`
- `property_type` — `apartment`, `villa`, `office`, `penthouse`
- `min_price`, `max_price` — Price range in AED
- `bedrooms` — Exact bedroom count
- `source` — `bayut`, `property_finder`, `dubizzle`
- `page` — Page number (default 1)
- `limit` — Results per page (default 20, max 100)
- `sort_by` — `price`, `area_sqft`, `synced_at`
- `sort_order` — `asc` or `desc`
- `include_duplicates` — `true` to include flagged duplicates (default false)

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "external_id": "BAY-1001",
      "source": "bayut",
      "title": "Spacious 2BR Apartment Downtown Dubai",
      "property_type": "apartment",
      "listing_type": "sale",
      "price": 1800000,
      "currency": "AED",
      "area_sqft": 1200,
      "bedrooms": 2,
      "bathrooms": 2,
      "location_city": "Dubai",
      "location_area": "Downtown Dubai",
      "location_lat": 25.1972,
      "location_lng": 55.2744,
      "description": "Beautiful apartment with Burj Khalifa view",
      "amenities": ["gym", "pool", "parking", "security"],
      "images": ["https://example.com/img1.jpg"],
      "contact_name": "Ahmed Al Mansoori",
      "contact_phone": "+971501234567",
      "contact_email": "ahmed@bayut.com",
      "is_duplicate": false,
      "duplicate_of": null,
      "synced_at": "2026-06-28T07:30:00.000Z",
      "created_at": "2026-06-27T07:19:05.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

---

### 2. Get Single Listing

```bash
curl "http://localhost:3000/api/listings/{id}"
```

Returns the listing object directly.

---

### 3. Dashboard Stats

```bash
curl "http://localhost:3000/api/sync/stats"
```

**Response:**
```json
{
  "listings": {
    "total_listings": "12",
    "unique_listings": "7",
    "duplicate_listings": "5",
    "for_sale": "8",
    "for_rent": "4"
  },
  "duplicates": {
    "total_pairs": "5"
  },
  "sync": {
    "total_runs": "3",
    "total_fetched": "12",
    "total_inserted": "12",
    "last_sync": "2026-06-28T07:30:00.000Z"
  },
  "by_source": [
    { "source": "bayut", "count": "4" },
    { "source": "property_finder", "count": "3" },
    { "source": "dubizzle", "count": "2" }
  ]
}
```

---

### 4. View Detected Duplicates

```bash
curl "http://localhost:3000/api/sync/duplicates?limit=10"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "external_id": "DUB-9002",
      "source": "dubizzle",
      "title": "3 Bed Villa Arabian Ranches",
      "price": "3480000.00",
      "area_sqft": "2820.00",
      "bedrooms": 3,
      "location_area": "Arabian Ranches",
      "location_city": "Dubai",
      "duplicate_score": "100.00",
      "duplicate_of": "original-listing-id",
      "original_external_id": "BAY-1002",
      "original_source": "bayut",
      "original_title": "3BR Villa in Arabian Ranches"
    }
  ],
  "pagination": { "total": 5, "page": 1, "limit": 10 }
}
```

---

### 5. Sync History

```bash
curl "http://localhost:3000/api/sync/logs?limit=5&source=bayut"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "source": "bayut",
    "status": "success",
    "total_fetched": 4,
    "total_inserted": 4,
    "total_updated": 0,
    "total_duplicates": 1,
    "error_message": null,
    "started_at": "2026-06-28T07:30:00.000Z",
    "completed_at": "2026-06-28T07:30:05.000Z"
  }
]
```

---

## How Deduplication Works

**Example: Two listings arrive**

Listing A (Bayut):
- Title: "Spacious 2BR Downtown Dubai"
- Price: 1,800,000 AED
- Area: 1,200 sqft
- Bedrooms: 2
- Location: Downtown Dubai

Listing B (Dubizzle):
- Title: "2BR Flat Downtown Dubai"
- Price: 1,790,000 AED
- Area: 1,205 sqft
- Bedrooms: 2
- Location: Downtown Dubai

**Scoring Process:**
```
✓ Location area match (Downtown Dubai == Downtown Dubai):  +30 pts
✓ Price within 5% (1.8M vs 1.79M = 0.55% difference):    +25 pts
✓ Area within 5% (1200 vs 1205 = 0.4% difference):       +20 pts
✓ Bedrooms match (2 == 2):                                +15 pts
✓ Property type match (apartment == apartment):           +10 pts
────────────────────────────────────────────────────────────
  TOTAL: 100 pts  >=  70 pt threshold  →  DUPLICATE DETECTED
```

**Result:**
- Listing A (Bayut) kept as the original
- Listing B marked as duplicate with 100% confidence score
- Both queryable via API — frontend shows which is original

This approach catches same properties listed with price variations (±5%) while avoiding false positives on nearby units.

---

## Database Schema

```sql
-- Single source of truth for all listings
listings (
  id UUID PRIMARY KEY,
  external_id VARCHAR(255),           -- source's ID
  source VARCHAR(100),                -- bayut, property_finder, dubizzle
  title VARCHAR(500),
  property_type VARCHAR(100),
  listing_type VARCHAR(50),           -- sale or rent
  price NUMERIC(15, 2),
  currency VARCHAR(10),
  area_sqft NUMERIC(10, 2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  location_city VARCHAR(255),
  location_area VARCHAR(255),
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  description TEXT,
  amenities TEXT[],                   -- array of strings
  images TEXT[],                      -- array of URLs
  contact_name VARCHAR(255),
  contact_phone VARCHAR(100),
  contact_email VARCHAR(255),
  raw_data JSONB,                     -- original payload for debugging
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of UUID REFERENCES listings(id),
  duplicate_score NUMERIC(5, 2),      -- 0-100 confidence
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id, source),
  INDEX on (is_duplicate, source, location_city)
);

-- Audit trail of all sync runs
sync_logs (
  id UUID PRIMARY KEY,
  source VARCHAR(100),
  status VARCHAR(50),                 -- success, partial, failed
  total_fetched INTEGER,
  total_inserted INTEGER,
  total_updated INTEGER,
  total_duplicates INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Duplicate relationship tracking
duplicate_pairs (
  id UUID PRIMARY KEY,
  listing_a UUID REFERENCES listings(id),
  listing_b UUID REFERENCES listings(id),
  score NUMERIC(5, 2),                -- 0-100
  matched_fields TEXT[],              -- which fields matched
  created_at TIMESTAMPTZ
);
```

---

## Local Setup

### Prerequisites
- Node.js 18+ (check: `node --version`)
- PostgreSQL 14+ (check: `psql --version`)

### Step 1: Clone

```bash
git clone https://github.com/palwashasheikh/property-sync-service
cd property-sync-service
npm install
```

### Step 2: Create Database

```bash
# Create the database
createdb property_sync

# (Optional) Create dedicated user
createuser property_dev
psql -U postgres -d property_sync -c "ALTER USER property_dev WITH PASSWORD 'your_password';"
psql -U postgres -d property_sync -c "GRANT ALL PRIVILEGES ON DATABASE property_sync TO property_dev;"
```

### Step 3: Environment Variables

```bash
cp .env.example .env

# Edit .env
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=property_sync
# DB_USER=postgres (or property_dev)
# DB_PASSWORD=your_password
# PORT=3000
```

### Step 4: Run Migration

```bash
npm run migrate
```

Expected output:
```
✅ Migration complete
```

### Step 5: Start

```bash
npm run dev
```

You should see:
```
🚀 Property Sync Service running on http://localhost:3000
📡 Sync started at [time]
🕐 Scheduler started — syncing every 30 minutes
```

### Step 6: Test

```bash
curl http://localhost:3000/api/sync/stats
```

---

## Troubleshooting

**"Connection refused" on database**
- Verify PostgreSQL is running: `psql -U postgres`
- Check .env credentials
- Verify database exists: `psql -U postgres -l | grep property_sync`

**"Permission denied for schema public"**
```bash
psql -U postgres -d property_sync -c "GRANT USAGE ON SCHEMA public TO property_dev;"
psql -U postgres -d property_sync -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO property_dev;"
```

**"relation 'listings' does not exist"**
- Migration didn't run
- Solution: `npm run migrate`

**"Port 3000 already in use"**
```bash
# Linux/Mac
lsof -i :3000 | grep -v PID | awk '{print $2}' | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

---


**Current bottlenecks:**

1. **Cron-based sync** single point of failure
   → Replace with BullMQ job queue

2. **Full re-fetch every 30 min** — wasteful
   → Add Change Data Capture (CDC) to detect only new/updated listings

3. **In-memory deduplication** — doesn't scale past 100k listings
   → Use Redis sorted sets with geo-hashing + price bucketing

4. **Deterministic scoring** false positives
   → Train ML model on price_diff + area_diff + location_distance + description_similarity

5. **Single write DB**  sync blocks API queries
   → Read replicas for API, separate write DB for ingestion

---

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4.18
- **Database:** PostgreSQL 14+
- **Job Scheduling:** node-cron
- **Parsing:** fast-xml-parser (XML), csv-parse (CSV)
- **HTTP Client:** Axios
- **UUID:** uuid

---

## GitHub

https://github.com/palwashasheikh/property-sync-service