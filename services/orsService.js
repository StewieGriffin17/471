const axios = require('axios');

const ORS_BASE_URL = 'https://api.openrouteservice.org';

const getDirections = async (startLat, startLon, endLat, endLon, profile = 'driving-car') => {
  try {
    const response = await axios.post(
      `${ORS_BASE_URL}/v2/directions/${profile}`,
      {
        coordinates: [
          [startLon, startLat],
          [endLon, endLat],
        ],
      },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: (route.summary.distance / 1000).toFixed(2),
        duration: Math.round(route.summary.duration / 60),
        geometry: route.geometry,
      };
    }
    return null;
  } catch (error) {
    console.error('ORS Directions Error:', error.message);
    throw new Error('Failed to get directions');
  }
};

module.exports = {
    getDirections
}