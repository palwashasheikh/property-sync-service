// Simulates Dubizzle-style CSV feed
// Different fields: price_aed, sqft, rooms, bathrooms, type, ad_type, neighborhood

const { parse } = require('csv-parse/sync');

const csvData = `id,headline,price_aed,sqft,rooms,bathrooms,ad_type,type,neighborhood,city,lat,lng,details,facilities,pictures,contact_person,phone,email
DUB-9001,Cozy 1BR Apartment Marina,950000,750,1,1,sell,apartment,Dubai Marina,Dubai,25.0795,55.1406,Well maintained apartment with marina view,gym|pool|concierge,https://example.com/dub9001.jpg,Amina Karim,+971505555555,amina@dub.com
DUB-9002,3 Bed Villa Arabian Ranches,3480000,2820,3,3,sell,villa,Arabian Ranches,Dubai,25.0660,55.2691,Corner unit villa large garden,private garden|maids room|2 parking,https://example.com/dub9002.jpg,Tom Baker,+971506666666,tom@dub.com
DUB-9003,2BR Flat Downtown Dubai,1790000,1205,2,2,sell,apartment,Downtown Dubai,Dubai,25.1968,55.2748,Amazing 2bed with burj view gym pool,gym|pool|parking|security,,Zara Ahmed,+971507777777,zara@dub.com
DUB-9004,Office Space DIFC,180000,600,0,2,rent,office,DIFC,Dubai,25.2131,55.2822,Fitted office space in premium tower,reception|server room|meeting rooms,https://example.com/dub9004.jpg,Peter Chen,+971508888888,peter@dub.com
DUB-9005,Studio JLT Near Metro,44000,448,0,1,rent,apartment,JLT,Dubai,25.0693,55.1388,Studio apartment furnished metro access,furnished|gym|24hr security,,Nour Al Said,+971509999999,nour@dub.com`;

function fetchListings() {
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return Promise.resolve(records);
}

module.exports = { fetchListings, sourceName: 'dubizzle' };
