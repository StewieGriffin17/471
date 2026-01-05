const express = require('express');
const router = express.Router();

const { searchHospitals, searchPharmacies, getSearchHistory } = require('../controllers/searchController');
const {
  savePlace,
  getSavedPlaces,
  deleteSavedPlace,
  getPlaceDirections,
  ratePlace,
  getPlaceRatings,
} = require('../controllers/placeController');

const { optionalAuth } = require('../middleware/auth_niazami');


router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hospital Locator API is running',
    timestamp: new Date().toISOString(),
  });
});

router.post('/search', optionalAuth, searchHospitals);
router.post('/search/pharmacies', optionalAuth, searchPharmacies);
router.get('/search/history/:userIdOrSession', optionalAuth, getSearchHistory);

router.post('/places/save', optionalAuth, savePlace);
router.get('/places/saved/:userIdOrSession', optionalAuth, getSavedPlaces);
router.delete('/places/saved/:id', optionalAuth, deleteSavedPlace);
router.post('/places/directions', optionalAuth, getPlaceDirections);
router.post('/places/rate', optionalAuth, ratePlace);
router.get('/places/ratings/:placeId', getPlaceRatings);


module.exports = router;
