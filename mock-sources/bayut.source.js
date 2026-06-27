// Simulates Bayut-style API response
// Fields: asking_price, size_sqft, beds, baths, community

const listings = [
  {
    id: "BAY-1001",
    title: "Spacious 2BR Apartment in Downtown Dubai",
    asking_price: 1800000,
    currency: "AED",
    size_sqft: 1200,
    beds: 2,
    baths: 2,
    purpose: "for-sale",
    category: "apartment",
    community: "Downtown Dubai",
    city: "Dubai",
    latitude: 25.1972,
    longitude: 55.2744,
    description: "Beautiful apartment with Burj Khalifa view",
    features: ["gym", "pool", "parking", "security"],
    photos: ["https://example.com/bay1001-1.jpg"],
    agent_name: "Ahmed Al Mansoori",
    agent_phone: "+971501234567",
    agent_email: "ahmed@bayutagent.com"
  },
  {
    id: "BAY-1002",
    title: "3BR Villa in Arabian Ranches",
    asking_price: 3500000,
    currency: "AED",
    size_sqft: 2800,
    beds: 3,
    baths: 4,
    purpose: "for-sale",
    category: "villa",
    community: "Arabian Ranches",
    city: "Dubai",
    latitude: 25.0657,
    longitude: 55.2694,
    description: "Corner villa with garden and private pool",
    features: ["private pool", "garden", "maid's room", "parking"],
    photos: ["https://example.com/bay1002-1.jpg"],
    agent_name: "Sara Al Hashimi",
    agent_phone: "+971509876543",
    agent_email: "sara@bayutagent.com"
  },
  {
    id: "BAY-1003",
    title: "Studio Apartment for Rent in JLT",
    asking_price: 45000,
    currency: "AED",
    size_sqft: 450,
    beds: 0,
    baths: 1,
    purpose: "for-rent",
    category: "apartment",
    community: "Jumeirah Lake Towers",
    city: "Dubai",
    latitude: 25.0694,
    longitude: 55.1390,
    description: "Fully furnished studio near metro",
    features: ["furnished", "metro access", "gym"],
    photos: ["https://example.com/bay1003-1.jpg"],
    agent_name: "Khalid Hussain",
    agent_phone: "+971507654321",
    agent_email: "khalid@bayutagent.com"
  },
  {
    id: "BAY-1004",
    title: "2BR Apartment in Downtown Dubai",   // intentional duplicate of BAY-1001 with slight variation
    asking_price: 1820000,
    currency: "AED",
    size_sqft: 1200,
    beds: 2,
    baths: 2,
    purpose: "for-sale",
    category: "apartment",
    community: "Downtown Dubai",
    city: "Dubai",
    latitude: 25.1970,
    longitude: 55.2746,
    description: "Spacious 2-bedroom with views of Burj Khalifa",
    features: ["gym", "pool", "parking"],
    photos: [],
    agent_name: "Mohammed Ali",
    agent_phone: "+971501111111",
    agent_email: "m.ali@bayutagent.com"
  }
];

function fetchListings() {
  return Promise.resolve(listings);
}

module.exports = { fetchListings, sourceName: 'bayut' };
