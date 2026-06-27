const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Normalized listings table - single source of truth
    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_id VARCHAR(255) NOT NULL,
        source VARCHAR(100) NOT NULL,
        title VARCHAR(500),
        property_type VARCHAR(100),
        listing_type VARCHAR(50),        -- sale or rent
        price NUMERIC(15, 2),
        currency VARCHAR(10) DEFAULT 'AED',
        area_sqft NUMERIC(10, 2),
        bedrooms INTEGER,
        bathrooms INTEGER,
        location_city VARCHAR(255),
        location_area VARCHAR(255),
        location_lat NUMERIC(10, 7),
        location_lng NUMERIC(10, 7),
        description TEXT,
        amenities TEXT[],
        images TEXT[],
        contact_name VARCHAR(255),
        contact_phone VARCHAR(100),
        contact_email VARCHAR(255),
        raw_data JSONB,                  -- original payload kept for debugging
        is_duplicate BOOLEAN DEFAULT FALSE,
        duplicate_of UUID REFERENCES listings(id),
        duplicate_score NUMERIC(5, 2),   -- how confident we are it's a duplicate
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(external_id, source)
      );
    `);

    // Sync logs table - tracks every ingestion run
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source VARCHAR(100) NOT NULL,
        status VARCHAR(50),              -- success, partial, failed
        total_fetched INTEGER DEFAULT 0,
        total_inserted INTEGER DEFAULT 0,
        total_updated INTEGER DEFAULT 0,
        total_duplicates INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);

    // Duplicate pairs table - stores detected duplicate relationships
    await client.query(`
      CREATE TABLE IF NOT EXISTS duplicate_pairs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_a UUID REFERENCES listings(id),
        listing_b UUID REFERENCES listings(id),
        score NUMERIC(5, 2),             -- 0-100 confidence score
        matched_fields TEXT[],           -- which fields triggered the match
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes for common query patterns
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_location_city ON listings(location_city);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_is_duplicate ON listings(is_duplicate);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_synced_at ON listings(synced_at);`);

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch(() => process.exit(1));
