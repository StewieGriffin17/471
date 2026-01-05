const axios = require('axios');
const { calculateDistance } = require('./distanceService.js');
const { formatPlaceData } = require('../utils/helpers.js');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;

// Add delay between requests to respect rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode an address to get lat/lon
 * TRIES: Nominatim first → LocationIQ fallback
 */
const geocodeAddress = async (query, retries = 2) => {
  // ============================================
  // TRY 1: NOMINATIM (FREE, NO API KEY)
  // ============================================
  console.log('🔍 Attempting geocoding with Nominatim...');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await delay(1500); // 1.5 second delay

      const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': process.env.NOMINATIM_USER_AGENT || 'HospitalLocatorApp/1.0 (hospital-locator@example.com)',
          'Accept': 'application/json',
          'Referer': 'http://localhost:4000',
        },
        timeout: 8000, // 8 second timeout
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        console.log('✅ Nominatim geocoding successful!');
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
          source: 'nominatim',
        };
      }
    } catch (error) {
      console.error(`⚠️ Nominatim failed (Attempt ${attempt}/${retries}):`, error.message);
      
      if (error.response?.status === 403) {
        console.log('🚫 Nominatim rate limit hit, switching to LocationIQ...');
        break; // Don't retry, go to LocationIQ immediately
      }
      
      if (attempt < retries) {
        await delay(2000);
        continue;
      }
    }
  }

  // ============================================
  // TRY 2: LOCATIONIQ (FALLBACK)
  // ============================================
  if (!LOCATIONIQ_API_KEY) {
    console.error('❌ LocationIQ API key not found in .env file');
    throw new Error('Failed to geocode address. Both Nominatim and LocationIQ unavailable.');
  }

  console.log('🔄 Falling back to LocationIQ...');
  
  try {
    const response = await axios.get(`${LOCATIONIQ_BASE_URL}/search`, {
      params: {
        key: LOCATIONIQ_API_KEY,
        q: query,
        format: 'json',
        limit: 1,
      },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      console.log('✅ LocationIQ geocoding successful!');
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
        source: 'locationiq',
      };
    }

    return null;
  } catch (error) {
    console.error('❌ LocationIQ geocoding failed:', error.message);
    throw new Error('Failed to geocode address. Please try again.');
  }
};

/**
 * Search for hospitals near coordinates
 * TRIES: Nominatim first → Overpass API fallback
 */
const searchNearbyHospitals = async (latitude, longitude, radius = 5000, maxResults = 20) => {
  // ============================================
  // TRY 1: NOMINATIM
  // ============================================
  console.log('🔍 Searching hospitals with Nominatim...');
  
  try {
    await delay(1500);

    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: 'hospital',
        format: 'json',
        limit: maxResults,
        addressdetails: 1,
        extratags: 1,
        lat: latitude,
        lon: longitude,
        bounded: 1,
        viewbox: calculateViewbox(latitude, longitude, radius),
      },
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'HospitalLocatorApp/1.0 (hospital-locator@example.com)',
        'Accept': 'application/json',
        'Referer': 'http://localhost:4000',
      },
      timeout: 8000,
    });

    if (response.data && response.data.length > 0) {
      console.log(`✅ Nominatim found ${response.data.length} hospitals`);
      
      const hospitalsWithDistance = response.data.map((place) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          parseFloat(place.lat),
          parseFloat(place.lon)
        );
        return formatPlaceData(place, latitude, longitude, distance);
      });

      const filteredHospitals = hospitalsWithDistance.filter(
        (hospital) => hospital.distance <= radius / 1000
      );

      return filteredHospitals.sort((a, b) => a.distance - b.distance);
    }
  } catch (error) {
    console.error('⚠️ Nominatim hospital search failed:', error.message);
    
    if (error.response?.status === 403) {
      console.log('🚫 Nominatim rate limit hit, switching to Overpass API...');
    }
  }

  // ============================================
  // TRY 2: OVERPASS API (FALLBACK)
  // ============================================
  console.log('🔄 Falling back to Overpass API...');
  
  try {
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${latitude},${longitude});
        way["amenity"="hospital"](around:${radius},${latitude},${longitude});
        relation["amenity"="hospital"](around:${radius},${latitude},${longitude});
      );
      out center ${maxResults};
    `;

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      overpassQuery,
      {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000,
      }
    );

    if (!response.data || !response.data.elements || response.data.elements.length === 0) {
      console.log('⚠️ No hospitals found in Overpass API');
      return [];
    }

    console.log(`✅ Overpass API found ${response.data.elements.length} hospitals`);

    const hospitalsWithDistance = response.data.elements.map((place) => {
      const placeLat = place.lat || place.center?.lat;
      const placeLon = place.lon || place.center?.lon;
      
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(placeLat),
        parseFloat(placeLon)
      );

      return {
        placeId: place.id?.toString(),
        name: place.tags?.name || place.tags?.['name:en'] || 'Hospital',
        address: formatAddress(place.tags),
        latitude: parseFloat(placeLat),
        longitude: parseFloat(placeLon),
        phone: place.tags?.phone || place.tags?.['contact:phone'] || null,
        rating: null,
        distance: parseFloat(distance.toFixed(2)),
        placeType: 'hospital',
      };
    });

    const filteredHospitals = hospitalsWithDistance.filter(
      (hospital) => hospital.distance <= radius / 1000
    );

    return filteredHospitals.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('❌ Overpass API failed:', error.message);
    throw new Error('Failed to search hospitals. Please try again.');
  }
};

/**
 * Search for pharmacies near coordinates
 * TRIES: Nominatim first → Overpass API fallback
 */
const searchNearbyPharmacies = async (latitude, longitude, radius = 5000, maxResults = 20) => {
  // ============================================
  // TRY 1: NOMINATIM
  // ============================================
  console.log('🔍 Searching pharmacies with Nominatim...');
  
  try {
    await delay(1500);

    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: 'pharmacy',
        format: 'json',
        limit: maxResults,
        addressdetails: 1,
        extratags: 1,
        lat: latitude,
        lon: longitude,
        bounded: 1,
        viewbox: calculateViewbox(latitude, longitude, radius),
      },
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'HospitalLocatorApp/1.0 (hospital-locator@example.com)',
        'Accept': 'application/json',
        'Referer': 'http://localhost:4000',
      },
      timeout: 8000,
    });

    if (response.data && response.data.length > 0) {
      console.log(`✅ Nominatim found ${response.data.length} pharmacies`);
      
      const pharmaciesWithDistance = response.data.map((place) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          parseFloat(place.lat),
          parseFloat(place.lon)
        );
        return formatPlaceData(place, latitude, longitude, distance);
      });

      const filteredPharmacies = pharmaciesWithDistance.filter(
        (pharmacy) => pharmacy.distance <= radius / 1000
      );

      return filteredPharmacies.sort((a, b) => a.distance - b.distance);
    }
  } catch (error) {
    console.error('⚠️ Nominatim pharmacy search failed:', error.message);
  }

  // ============================================
  // TRY 2: OVERPASS API (FALLBACK)
  // ============================================
  console.log('🔄 Falling back to Overpass API for pharmacies...');
  
  try {
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="pharmacy"](around:${radius},${latitude},${longitude});
        way["amenity"="pharmacy"](around:${radius},${latitude},${longitude});
      );
      out center ${maxResults};
    `;

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      overpassQuery,
      {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000,
      }
    );

    if (!response.data || !response.data.elements || response.data.elements.length === 0) {
      return [];
    }

    const pharmaciesWithDistance = response.data.elements.map((place) => {
      const placeLat = place.lat || place.center?.lat;
      const placeLon = place.lon || place.center?.lon;
      
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(placeLat),
        parseFloat(placeLon)
      );

      return {
        placeId: place.id?.toString(),
        name: place.tags?.name || 'Pharmacy',
        address: formatAddress(place.tags),
        latitude: parseFloat(placeLat),
        longitude: parseFloat(placeLon),
        phone: place.tags?.phone || null,
        rating: null,
        distance: parseFloat(distance.toFixed(2)),
        placeType: 'pharmacy',
      };
    });

    const filteredPharmacies = pharmaciesWithDistance.filter(
      (pharmacy) => pharmacy.distance <= radius / 1000
    );

    return filteredPharmacies.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('❌ Overpass pharmacy search failed:', error.message);
    throw new Error('Failed to search pharmacies. Please try again.');
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateViewbox = (lat, lon, radiusMeters) => {
  const latDelta = (radiusMeters / 111320);
  const lonDelta = (radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)));

  const minLon = lon - lonDelta;
  const minLat = lat - latDelta;
  const maxLon = lon + lonDelta;
  const maxLat = lat + latDelta;

  return `${minLon},${minLat},${maxLon},${maxLat}`;
};

const formatAddress = (tags) => {
  const parts = [
    tags?.['addr:housenumber'],
    tags?.['addr:street'],
    tags?.['addr:city'],
    tags?.['addr:state'],
    tags?.['addr:postcode'],
    tags?.['addr:country'],
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'Address not available';
};

module.exports = {
    geocodeAddress,
    searchNearbyHospitals,
    searchNearbyPharmacies
}