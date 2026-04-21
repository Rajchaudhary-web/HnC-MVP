/**
 * Utility to convert GPS coordinates into human-readable city zones using OpenStreetMap Nominatim API.
 */
export const getHumanReadableAddress = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en'
        }
      }
    );
    const data = await response.json();
    
    // Extract meaningful area names (suburb, neighborhood, or city district)
    const addr = data.address || {};
    const area = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.town || 'General Zone';
    const location_name = data.display_name;

    return { area, location_name };
  } catch (err) {
    console.error('Reverse Geocoding Failed:', err);
    return { area: 'Active Sector', location_name: 'Manual Entry Location' };
  }
};

/**
 * Capture current user coordinates using the standard Geolocation API.
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};
