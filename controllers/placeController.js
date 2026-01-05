const { getPrimaryDB } = require('../config/database');
const { ObjectId } = require('mongodb');

const savePlace = async (req, res, next) => {
  try {
    const {
      placeId,
      name,
      address,
      latitude,
      longitude,
      phone,
      rating,
      distance,
      placeType,
    } = req.body;

    const userId = req.userId || null;
    const sessionId = req.sessionId || req.headers['x-session-id'] || null;

    if (!placeId || !name || !address || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
      });
    }
    const db = getPrimaryDB();
    const existingSave = await db.collection('savedPlaces').findOne({
        placeId: placeId,
        ...(userId ? { userId } : { sessionId }),
    });

    if (existingSave) {
      return res.status(409).json({
        success: false,
        message: 'Place already saved',
        data: existingSave,
      });
    }

    const savedPlace = await db.collection('savedPlaces').insertOne({
        userId,
        sessionId,
        placeId,
        name,
        address,
        latitude,
        longitude,
        phone,
        rating,
        distance,
        placeType: placeType || 'hospital',
        savedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Place saved successfully',
      data: savedPlace,
    });
  } catch (error) {
    next(error);
  }
};

const getSavedPlaces = async (req, res, next) => {
  try {
    const { userIdOrSession } = req.params;
    const { placeType } = req.query;

    const userId = req.userId;
    const isUserId = userId && userIdOrSession === userId;

    const whereClause = {
      ...(isUserId ? { userId: userIdOrSession } : { sessionId: userIdOrSession }),
    };

    if (placeType) {
      whereClause.placeType = placeType;
    }
    const db = getPrimaryDB();
    const savedPlaces = await db.collection('savedPlaces').find(whereClause).sort({ savedAt: -1 }).toArray();

    return res.status(200).json({
      success: true,
      data: savedPlaces,
      count: savedPlaces.length,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSavedPlace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getPrimaryDB();
    const result = await db.collection('savedPlaces').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
        return res.status(404).json({
            success: false,
            message: 'Place not found',
        });
    }

    return res.status(200).json({
      success: true,
      message: 'Place removed',
    });
  } catch (error) {
    next(error);
  }
};

const getPlaceDirections = async (req, res, next) => {
  try {
    const { startLat, startLon, endLat, endLon, profile = 'driving-car' } = req.body;

    if (!startLat || !startLon || !endLat || !endLon) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    const { getDirections } = require('../services/orsService.js');

    const directions = await getDirections(startLat, startLon, endLat, endLon, profile);

    if (!directions) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: directions,
    });
  } catch (error) {
    next(error);
  }
};

const ratePlace = async (req, res, next) => {
  try {
    const { placeId, placeName, rating, comment, category } = req.body;
    const userId = req.userId || null;
    const sessionId = req.sessionId || req.headers['x-session-id'] || null;

    if (!placeId || !placeName || !rating || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    if (!['hospital', 'doctor', 'ward_staff'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
      });
    }

    const db = getPrimaryDB();

    const existingRating = await db.collection('placeRatings').findOne({
        placeId,
        ...(userId ? { userId } : { sessionId }),
    });

    if (existingRating) {
      const updatedRating = await db.collection('placeRatings').updateOne(
        { _id: existingRating._id },
        { $set: { rating, comment, category, updatedAt: new Date() } }
        );

      return res.status(200).json({
        success: true,
        message: 'Rating updated',
        data: updatedRating,
      });
    }

    const newRating = await db.collection('placeRatings').insertOne({
        userId,
        sessionId,
        placeId,
        placeName,
        rating,
        comment,
        category,
        createdAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Rating submitted',
      data: newRating,
    });
  } catch (error) {
    next(error);
  }
};

const getPlaceRatings = async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const { category } = req.query;

    const whereClause = { placeId };
    if (category) {
      whereClause.category = category;
    }
    const db = getPrimaryDB();
    const ratings = await db.collection('placeRatings').find(whereClause).sort({ createdAt: -1 }).toArray();

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        ratings,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalRatings: ratings.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    savePlace,
    getSavedPlaces,
    deleteSavedPlace,
    getPlaceDirections,
    ratePlace,
    getPlaceRatings
}
