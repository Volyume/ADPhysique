/**
 * SetRowMenu (iOS) — deliberately NO long-press menu. See SetRowMenu.js's
 * header for the full story: react-native-ios-context-menu's native layer
 * crash-looped the app at startup on TestFlight (Sentry VOLYUME-1X, fatal
 * NSUnknownKeyException "reactPropHandler" during Fabric descriptor
 * registration, RN 0.81 / build 40), so zeego is never imported on iOS and
 * both native packages are excluded from iOS autolinking in
 * react-native.config.js. The row's tap affordance (the edit sheet, which
 * carries delete) keeps both menu actions reachable.
 */
export default function SetRowMenu({ children }) {
  return children;
}
