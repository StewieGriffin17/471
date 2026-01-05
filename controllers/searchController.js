const { getPrimaryDB } = require('../config/database');
const { geocodeAddress, searchNearbyHospitals, searchNearbyPharmacies } = require('../services/nominatimService.js');
const { isValidQuery } = require('../utils/helpers.js');

const searchHospitals = async (req, res, next) => {
  try {
    const { query, maxResults = 20, radius = 5000 } = req.body;
    const userId = req.userId || null;

    if (!isValidQuery(query)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid search query',
      });
    }

    const geocoded = await geocodeAddress(query);
    
    if (!geocoded) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    const hospitals = await searchNearbyHospitals(
      geocoded.latitude,
      geocoded.longitude,
      radius,
      maxResults
    );

    try {
        const db = getPrimaryDB();
      await db.collection('searchHistory').insertOne({
          userId: userId,
          query: query,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          resultsCount: hospitals.length,
          searchType: 'hospital',
          searchedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to save search history:', error);
    }

    return res.status(200).json({
      success: true,
      data: {
        location: {
          query: query,
          displayName: geocoded.displayName,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        },
        hospitals: hospitals,
        count: hospitals.length,
        sessionId: req.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

const searchPharmacies = async (req, res, next) => {
  try {
    const { query, maxResults = 20, radius = 5000 } = req.body;
    const userId = req.userId || null;

    if (!isValidQuery(query)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid search query',
      });
    }

    const geocoded = await geocodeAddress(query);
    
    if (!geocoded) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    const pharmacies = await searchNearbyPharmacies(
      geocoded.latitude,
      geocoded.longitude,
      radius,
      maxResults
    );

    try {
        const db = getPrimaryDB();
        await db.collection('searchHistory').insertOne({
            userId: userId,
            query: query,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            resultsCount: pharmacies.length,
            searchType: 'pharmacy',
            searchedAt: new Date()
        });
    } catch (error) {
      console.error('Failed to save search history:', error);
    }

    return res.status(200).json({
      success: true,
      data: {
        location: {
          query: query,
          displayName: geocoded.displayName,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        },
        pharmacies: pharmacies,
        count: pharmacies.length,
        sessionId: req.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSearchHistory = async (req, res, next) => {
  try {
    const { userIdOrSession } = req.params;
    const { limit = 10 } = req.query;
    const db = getPrimaryDB();

    const history = await db.collection('searchHistory').find(
      req.isAuthenticated ? { userId: userIdOrSession } : {}
    ).sort({ searchedAt: -1 }).limit(parseInt(limit)).toArray();


    return res.status(200).json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    searchHospitals,
    searchPharmacies,
    getSearchHistory
}