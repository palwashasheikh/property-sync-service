/**
 * DEDUPLICATION ENGINE
 *
 * Strategy: Weighted scoring across multiple fields.
 * We never do exact match because the same property listed on
 * Bayut and Dubizzle will have slightly different prices, areas, descriptions.
 *
 * Score breakdown (total = 100):
 * - Location area match (same neighborhood):   30 pts
 * - Price within 5% tolerance:                 25 pts
 * - Area (sqft) within 5% tolerance:           20 pts
 * - Bedrooms match:                            15 pts
 * - Property type match:                       10 pts
 *
 * If score >= DUPLICATE_THRESHOLD → flag as duplicate
 */

const DUPLICATE_THRESHOLD = 70; // out of 100

function withinTolerance(a, b, tolerancePct = 5) {
  if (!a || !b) return false;
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2;
  return (diff / avg) * 100 <= tolerancePct;
}

function normalizeAreaName(area) {
  if (!area) return '';
  return area
    .toLowerCase()
    .replace(/jumeirah lake towers/i, 'jlt')
    .replace(/jlt/i, 'jlt')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scores two listings against each other.
 * Returns { score, matchedFields }
 */
function scoreListings(a, b) {
  // Don't compare listings from the same source
  if (a.source === b.source) return { score: 0, matchedFields: [] };

  let score = 0;
  const matchedFields = [];

  // 1. Location area match (30 pts)
  const aArea = normalizeAreaName(a.location_area);
  const bArea = normalizeAreaName(b.location_area);
  if (aArea && bArea && aArea === bArea) {
    score += 30;
    matchedFields.push('location_area');
  }

  // 2. Price within 5% (25 pts)
  if (withinTolerance(a.price, b.price, 5)) {
    score += 25;
    matchedFields.push('price');
  }

  // 3. Area sqft within 5% (20 pts)
  if (withinTolerance(a.area_sqft, b.area_sqft, 5)) {
    score += 20;
    matchedFields.push('area_sqft');
  }

  // 4. Bedrooms match (15 pts)
  if (a.bedrooms !== null && b.bedrooms !== null && a.bedrooms === b.bedrooms) {
    score += 15;
    matchedFields.push('bedrooms');
  }

  // 5. Property type match (10 pts)
  if (
    a.property_type &&
    b.property_type &&
    a.property_type.toLowerCase() === b.property_type.toLowerCase()
  ) {
    score += 10;
    matchedFields.push('property_type');
  }

  return { score, matchedFields };
}

/**
 * Given a new normalized listing and a list of existing listings,
 * find the best duplicate candidate.
 *
 * Returns { isDuplicate, duplicateOf, score, matchedFields } or null
 */
function findDuplicate(newListing, existingListings) {
  let bestMatch = null;
  let bestScore = 0;
  let bestMatchedFields = [];

  for (const existing of existingListings) {
    const { score, matchedFields } = scoreListings(newListing, existing);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = existing;
      bestMatchedFields = matchedFields;
    }
  }

  if (bestScore >= DUPLICATE_THRESHOLD) {
    return {
      isDuplicate: true,
      duplicateOf: bestMatch.id,
      score: bestScore,
      matchedFields: bestMatchedFields
    };
  }

  return { isDuplicate: false, duplicateOf: null, score: bestScore, matchedFields: [] };
}

module.exports = { findDuplicate, scoreListings, DUPLICATE_THRESHOLD };
