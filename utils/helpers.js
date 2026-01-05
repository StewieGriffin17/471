const formatPlaceData = (place, userLat, userLon, distance) => {
  return {
    placeId: place.place_id?.toString() || place.osm_id?.toString(),
    name: place.display_name?.split(',')[0] || place.name || 'Unknown',
    address: place.display_name || 'No address',
    latitude: parseFloat(place.lat),
    longitude: parseFloat(place.lon),
    phone: place.extratags?.phone || place.extratags?.['contact:phone'] || null,
    rating: null,
    distance: distance ? parseFloat(distance.toFixed(2)) : null,
    placeType: place.type || 'hospital',
    osmType: place.osm_type,
  };
};

const isValidCoordinate = (lat, lon) => {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

const isValidQuery = (query) => {
  return query && typeof query === 'string' && query.trim().length > 0;
};

module.exports = {
    formatPlaceData,
    isValidCoordinate,
    isValidQuery
}