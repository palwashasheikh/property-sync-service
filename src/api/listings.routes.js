const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

/**
 * GET /api/listings
 * Query params:
 *   - city         (string)
 *   - area         (string)
 *   - type         (sale | rent)
 *   - property_type (apartment | villa | office | ...)
 *   - min_price    (number)
 *   - max_price    (number)
 *   - bedrooms     (number)
 *   - source       (bayut | property_finder | dubizzle)
 *   - include_duplicates (boolean, default false)
 *   - page         (number, default 1)
 *   - limit        (number, default 20, max 100)
 *   - sort_by      (price | area_sqft | synced_at, default synced_at)
 *   - sort_order   (asc | desc, default desc)
 */
router.get('/', async (req, res) => {
  try {
    const {
      city,
      area,
      type,
      property_type,
      min_price,
      max_price,
      bedrooms,
      source,
      include_duplicates = 'false',
      page = 1,
      limit = 20,
      sort_by = 'synced_at',
      sort_order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = ['price', 'area_sqft', 'synced_at', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'synced_at';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    if (include_duplicates !== 'true') {
      conditions.push(`is_duplicate = FALSE`);
    }

    if (city) {
      params.push(`%${city}%`);
      conditions.push(`location_city ILIKE $${params.length}`);
    }

    if (area) {
      params.push(`%${area}%`);
      conditions.push(`location_area ILIKE $${params.length}`);
    }

    if (type) {
      params.push(type);
      conditions.push(`listing_type = $${params.length}`);
    }

    if (property_type) {
      params.push(property_type);
      conditions.push(`property_type = $${params.length}`);
    }

    if (min_price) {
      params.push(parseFloat(min_price));
      conditions.push(`price >= $${params.length}`);
    }

    if (max_price) {
      params.push(parseFloat(max_price));
      conditions.push(`price <= $${params.length}`);
    }

    if (bedrooms !== undefined) {
      params.push(parseInt(bedrooms));
      conditions.push(`bedrooms = $${params.length}`);
    }

    if (source) {
      params.push(source);
      conditions.push(`source = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM listings ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Actual data fetch
    const dataResult = await pool.query(
      `SELECT
        id, external_id, source, title, property_type, listing_type,
        price, currency, area_sqft, bedrooms, bathrooms,
        location_city, location_area, location_lat, location_lng,
        description, amenities, images,
        contact_name, contact_phone, contact_email,
        is_duplicate, duplicate_of, duplicate_score,
        synced_at, created_at
       FROM listings
       ${whereClause}
       ORDER BY ${sortField} ${sortDir} NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('GET /listings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

/**
 * GET /api/listings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM listings WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

module.exports = router;
