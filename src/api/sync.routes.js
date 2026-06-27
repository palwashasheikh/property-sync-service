const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

/**
 * GET /api/sync/logs
 * Returns recent sync history
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit = 20, source } = req.query;
    const params = [];
    const conditions = [];

    if (source) {
      params.push(source);
      conditions.push(`source = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT * FROM sync_logs ${where} ORDER BY started_at DESC LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

/**
 * GET /api/sync/stats
 * Summary stats for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [listingStats, duplicateStats, syncStats, sourceBreakdown] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_listings,
          COUNT(*) FILTER (WHERE is_duplicate = FALSE) AS unique_listings,
          COUNT(*) FILTER (WHERE is_duplicate = TRUE) AS duplicate_listings,
          COUNT(*) FILTER (WHERE listing_type = 'sale') AS for_sale,
          COUNT(*) FILTER (WHERE listing_type = 'rent') AS for_rent
        FROM listings
      `),
      pool.query(`SELECT COUNT(*) AS total_pairs FROM duplicate_pairs`),
      pool.query(`
        SELECT
          COUNT(*) AS total_runs,
          SUM(total_fetched) AS total_fetched,
          SUM(total_inserted) AS total_inserted,
          MAX(started_at) AS last_sync
        FROM sync_logs WHERE status = 'success'
      `),
      pool.query(`
        SELECT source, COUNT(*) AS count
        FROM listings
        WHERE is_duplicate = FALSE
        GROUP BY source
        ORDER BY count DESC
      `)
    ]);

    res.json({
      listings: listingStats.rows[0],
      duplicates: duplicateStats.rows[0],
      sync: syncStats.rows[0],
      by_source: sourceBreakdown.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/sync/duplicates
 * Returns all detected duplicate listings with their originals
 */
router.get('/duplicates', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT
        d.id, d.external_id, d.source, d.title, d.price, d.area_sqft,
        d.bedrooms, d.location_area, d.location_city,
        d.duplicate_score, d.duplicate_of,
        o.external_id AS original_external_id,
        o.source AS original_source,
        o.title AS original_title
       FROM listings d
       LEFT JOIN listings o ON d.duplicate_of = o.id
       WHERE d.is_duplicate = TRUE
       ORDER BY d.duplicate_score DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM listings WHERE is_duplicate = TRUE`
    );

    res.json({
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch duplicates' });
  }
});

module.exports = router;
