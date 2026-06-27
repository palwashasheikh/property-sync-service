/**
 * NORMALIZER
 * Each source sends data in a different shape.
 * This module maps every source format → one standard schema.
 *
 * Standard schema fields:
 * external_id, source, title, property_type, listing_type,
 * price, currency, area_sqft, bedrooms, bathrooms,
 * location_city, location_area, location_lat, location_lng,
 * description, amenities[], images[], contact_name, contact_phone, contact_email, raw_data
 */

// ─── Bayut (JSON) ──────────────────────────────────────────────────────────
function normalizeBayut(raw) {
  return {
    external_id: raw.id,
    source: 'bayut',
    title: raw.title || null,
    property_type: raw.category || null,
    listing_type: raw.purpose === 'for-sale' ? 'sale' : 'rent',
    price: parseFloat(raw.asking_price) || null,
    currency: raw.currency || 'AED',
    area_sqft: parseFloat(raw.size_sqft) || null,
    bedrooms: parseInt(raw.beds) || 0,
    bathrooms: parseInt(raw.baths) || 0,
    location_city: raw.city || null,
    location_area: raw.community || null,
    location_lat: parseFloat(raw.latitude) || null,
    location_lng: parseFloat(raw.longitude) || null,
    description: raw.description || null,
    amenities: Array.isArray(raw.features) ? raw.features : [],
    images: Array.isArray(raw.photos) ? raw.photos : [],
    contact_name: raw.agent_name || null,
    contact_phone: raw.agent_phone || null,
    contact_email: raw.agent_email || null,
    raw_data: raw
  };
}

// ─── Property Finder (XML → parsed object) ─────────────────────────────────
function normalizePropertyFinder(raw) {
  return {
    external_id: String(raw.ref),
    source: 'property_finder',
    title: raw.title || null,
    property_type: raw.property_type || null,
    listing_type: raw.listing_purpose === 'sale' ? 'sale' : 'rent',
    price: parseFloat(raw.sale_price) || null,
    currency: raw.currency || 'AED',
    area_sqft: parseFloat(raw.area) || null,
    bedrooms: parseInt(raw.num_bedrooms) || 0,
    bathrooms: parseInt(raw.num_bathrooms) || 0,
    location_city: raw.emirate || null,
    location_area: raw.district || null,
    location_lat: parseFloat(raw.lat) || null,
    location_lng: parseFloat(raw.lng) || null,
    description: raw.description || null,
    amenities: raw.amenities
      ? raw.amenities.split(',').map(a => a.trim()).filter(Boolean)
      : [],
    images: raw.image_urls
      ? raw.image_urls.split(',').map(u => u.trim()).filter(Boolean)
      : [],
    contact_name: raw.broker_name || null,
    contact_phone: raw.broker_mobile || null,
    contact_email: raw.broker_email || null,
    raw_data: raw
  };
}

// ─── Dubizzle (CSV) ────────────────────────────────────────────────────────
function normalizeDubizzle(raw) {
  return {
    external_id: raw.id,
    source: 'dubizzle',
    title: raw.headline || null,
    property_type: raw.type || null,
    listing_type: raw.ad_type === 'sell' ? 'sale' : 'rent',
    price: parseFloat(raw.price_aed) || null,
    currency: 'AED',
    area_sqft: parseFloat(raw.sqft) || null,
    bedrooms: parseInt(raw.rooms) || 0,
    bathrooms: parseInt(raw.bathrooms) || 0,
    location_city: raw.city || null,
    location_area: raw.neighborhood || null,
    location_lat: parseFloat(raw.lat) || null,
    location_lng: parseFloat(raw.lng) || null,
    description: raw.details || null,
    amenities: raw.facilities
      ? raw.facilities.split('|').map(a => a.trim()).filter(Boolean)
      : [],
    images: raw.pictures
      ? raw.pictures.split(',').map(u => u.trim()).filter(Boolean)
      : [],
    contact_name: raw.contact_person || null,
    contact_phone: raw.phone || null,
    contact_email: raw.email || null,
    raw_data: raw
  };
}

// ─── Router ────────────────────────────────────────────────────────────────
const normalizers = {
  bayut: normalizeBayut,
  property_finder: normalizePropertyFinder,
  dubizzle: normalizeDubizzle
};

function normalize(sourceName, rawListing) {
  const fn = normalizers[sourceName];
  if (!fn) throw new Error(`No normalizer registered for source: ${sourceName}`);
  return fn(rawListing);
}

module.exports = { normalize };
