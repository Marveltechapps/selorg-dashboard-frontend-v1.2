// @react-google-maps/api uses a global loader under the hood.
// If multiple components call `useJsApiLoader` with different `id`s/options,
// the library throws: "Loader must not be called again with different options".
export const GOOGLE_MAPS_LOADER_ID = 'selorg-google-maps-loader';

