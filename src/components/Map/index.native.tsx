/**
 * Native entry for Expo: re-export react-native-maps so native builds use the real map.
 * Only used when building the Expo app with Metro (not by this Vite app).
 */
export {
  default,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Callout,
  Polygon,
  Polyline,
  Circle,
  Overlay,
} from 'react-native-maps';
