// Simulates Property Finder-style API response
// Different field names: sale_price, area, num_bedrooms, num_bathrooms, district

const { XMLParser } = require('fast-xml-parser');

const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<properties>
  <property>
    <ref>PF-5001</ref>
    <title>Luxury 2 Bedroom in Downtown Dubai</title>
    <sale_price>1850000</sale_price>
    <currency>AED</currency>
    <area>1200</area>
    <num_bedrooms>2</num_bedrooms>
    <num_bathrooms>2</num_bathrooms>
    <listing_purpose>sale</listing_purpose>
    <property_type>apartment</property_type>
    <district>Downtown Dubai</district>
    <emirate>Dubai</emirate>
    <lat>25.1975</lat>
    <lng>55.2742</lng>
    <description>Premium apartment overlooking Burj Khalifa</description>
    <amenities>gym,pool,covered parking,24hr security</amenities>
    <image_urls>https://example.com/pf5001-1.jpg,https://example.com/pf5001-2.jpg</image_urls>
    <broker_name>Fatima Al Zaabi</broker_name>
    <broker_mobile>+971502222222</broker_mobile>
    <broker_email>fatima@pfbroker.com</broker_email>
  </property>
  <property>
    <ref>PF-5002</ref>
    <title>4BR Penthouse in Palm Jumeirah</title>
    <sale_price>12000000</sale_price>
    <currency>AED</currency>
    <area>4500</area>
    <num_bedrooms>4</num_bedrooms>
    <num_bathrooms>5</num_bathrooms>
    <listing_purpose>sale</listing_purpose>
    <property_type>penthouse</property_type>
    <district>Palm Jumeirah</district>
    <emirate>Dubai</emirate>
    <lat>25.1124</lat>
    <lng>55.1390</lng>
    <description>Ultra-luxury penthouse with private beach access</description>
    <amenities>private pool,beach access,cinema room,smart home</amenities>
    <image_urls>https://example.com/pf5002-1.jpg</image_urls>
    <broker_name>James Whitfield</broker_name>
    <broker_mobile>+971503333333</broker_mobile>
    <broker_email>james@pfbroker.com</broker_email>
  </property>
  <property>
    <ref>PF-5003</ref>
    <title>Studio for Rent JLT</title>
    <sale_price>46000</sale_price>
    <currency>AED</currency>
    <area>455</area>
    <num_bedrooms>0</num_bedrooms>
    <num_bathrooms>1</num_bathrooms>
    <listing_purpose>rent</listing_purpose>
    <property_type>apartment</property_type>
    <district>Jumeirah Lake Towers</district>
    <emirate>Dubai</emirate>
    <lat>25.0697</lat>
    <lng>55.1392</lng>
    <description>Furnished studio close to metro station</description>
    <amenities>furnished,gym,metro nearby</amenities>
    <image_urls></image_urls>
    <broker_name>Ravi Sharma</broker_name>
    <broker_mobile>+971504444444</broker_mobile>
    <broker_email>ravi@pfbroker.com</broker_email>
  </property>
</properties>`;

function fetchListings() {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xmlData);
  const raw = parsed.properties.property;
  return Promise.resolve(Array.isArray(raw) ? raw : [raw]);
}

module.exports = { fetchListings, sourceName: 'property_finder' };
