export type XYPoint = {
  x: number;
  y: number;
};

const EARTH_RADIUS_METERS = 6371000;

export function latLonToLocalXY(
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number
): XYPoint {
  const latRad = (latitude * Math.PI) / 180;
  const originLatRad = (originLatitude * Math.PI) / 180;

  const dLat = ((latitude - originLatitude) * Math.PI) / 180;
  const dLon = ((longitude - originLongitude) * Math.PI) / 180;

  return {
    x: EARTH_RADIUS_METERS * dLon * Math.cos((latRad + originLatRad) / 2),
    y: EARTH_RADIUS_METERS * dLat,
  };
}
