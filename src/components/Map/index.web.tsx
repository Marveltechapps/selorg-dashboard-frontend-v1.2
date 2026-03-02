/**
 * Web entry for Expo: same stub so Expo web bundle never loads react-native-maps.
 * Metro resolves this for web; index.native.tsx is used for native.
 */
export {
  default,
  MapViewStub,
  Marker,
  Callout,
  Polygon,
  Polyline,
  Circle,
  Overlay,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from './index';
