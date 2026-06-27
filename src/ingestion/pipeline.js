const pool = require('../db/pool');
const { normalize } = require('../normalization/normalizer');
const { findDuplicate } = require('../deduplication/deduplicator');

/**
 * INGESTION PIPELINE
 *
 * For each source:
 * 1. Fetch raw listings
 * 2. Normalize each listing to standard schema
 * 3. Check for duplicates against existing DB records
 * 4. Upsert into listings table (insert or update on conflict)
 * 5. Log the sync run
 */
async function ingestSource(sourceModule) {
  const { fetchListings, sourceName } = sourceModule;
  const log = {
    source: sourceName,
    status: 'success',
    total_fetched: 0,
    total_inserted: 0,
    total_updated: 0,
    total_duplicates: 0,
    error_message: null,
    started_at: new Date()
  };

  const client = await pool.connect();

  try {
    console.log(`\n🔄 Starting ingestion for source: ${sourceName}`);

    // Step 1: Fetch raw listings from source
    const rawListings = await fetchListings();
    log.total_fetched = rawListings.length;
    console.log(`   Fetched ${rawListings.length} listings`);

    // Step 2: Load existing listings for deduplication comparison
    // We only load non-duplicates to compare against
    const { rows: existingListings } = await client.query(
      `SELECT id, source, price, area_sqft, bedrooms, property_type, location_area
       FROM listings WHERE is_duplicate = FALSE`
    );

    for (const raw of rawListings) {
      // Step 3: Normalize
      const normalized = normalize(sourceName, raw);

      // Step 4: Deduplication check
      const { isDuplicate, duplicateOf, score, matchedFields } = findDuplicate(
        normalized,
        existingListings
      );

      if (isDuplicate) {
        log.total_duplicates++;
        console.log(
          `   ⚠️  Duplicate detected: ${normalized.external_id} → ${duplicateOf} (score: ${score}, fields: ${matchedFields.join(', ')})`
        );

        // Save the duplicate pair for audit trail
        await client.query(
          `INSERT INTO duplicate_pairs (listing_a, listing_b, score, matched_fields)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [duplicateOf, null, score, matchedFields]
        );
      }

      // Step 5: Upsert listing (insert or update if already synced before)
      const result = await client.query(
        `INSERT INTO listings (
          external_id, source, title, property_type, listing_type,
          price, currency, area_sqft, bedrooms, bathrooms,
          location_city, location_area, location_lat, location_lng,
          description, amenities, images,
          contact_name, contact_phone, contact_email,
          raw_data, is_duplicate, duplicate_of, duplicate_score, synced_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24, NOW()
        )
        ON CONFLICT (external_id, source) DO UPDATE SET
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          area_sqft = EXCLUDED.area_sqft,
          description = EXCLUDED.description,
          amenities = EXCLUDED.amenities,
          images = EXCLUDED.images,
          is_duplicate = EXCLUDED.is_duplicate,
          duplicate_of = EXCLUDED.duplicate_of,
          duplicate_score = EXCLUDED.duplicate_score,
          synced_at = NOW(),
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS is_new`,
        [
          normalized.external_id,
          normalized.source,
          normalized.title,
          normalized.property_type,
          normalized.listing_type,
          normalized.price,
          normalized.currency,
          normalized.area_sqft,
          normalized.bedrooms,
          normalized.bathrooms,
          normalized.location_city,
          normalized.location_area,
          normalized.location_lat,
          normalized.location_lng,
          normalized.description,
          normalized.amenities,
          normalized.images,
          normalized.contact_name,
          normalized.contact_phone,
          normalized.contact_email,
          JSON.stringify(normalized.raw_data),
          isDuplicate,
          duplicateOf,
          score
        ]
      );

      const isNew = result.rows[0]?.is_new;
      if (isNew) {
        log.total_inserted++;
        // Add to existingListings so next listings in this batch can match against it
        if (!isDuplicate) {
          existingListings.push({
            id: result.rows[0].id,
            ...normalized
          });
        }
      } else {
        log.total_updated++;
      }
    }

    console.log(`   ✅ Done: ${log.total_inserted} inserted, ${log.total_updated} updated, ${log.total_duplicates} duplicates`);

  } catch (err) {
    log.status = 'failed';
    log.error_message = err.message;
    console.error(`   ❌ Ingestion failed for ${sourceName}:`, err.message);
  } finally {
    // Save sync log
    await client.query(
      `INSERT INTO sync_logs (source, status, total_fetched, total_inserted, total_updated, total_duplicates, error_message, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [log.source, log.status, log.total_fetched, log.total_inserted, log.total_updated, log.total_duplicates, log.error_message]
    );
    client.release();
  }

  return log;
}

async function ingestAll(sources) {
  const results = [];
  for (const source of sources) {
    const result = await ingestSource(source);
    results.push(result);
  }
  return results;
}

module.exports = { ingestSource, ingestAll };
