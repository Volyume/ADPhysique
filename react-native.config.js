// React Native autolinking overrides.
//
// Google Sign-In is Android-only in this app. The iOS UI never shows the Google
// button (src/components/auth/OAuthButtons.js renders it only when
// Platform.OS !== 'ios'), and signInWithGoogle() is never reached on iOS, so the
// native module is dead weight there.
//
// Left to autolinking, @react-native-google-signin/google-signin still adds its
// pod (RNGoogleSignin) to the iOS Podfile, which pulls GoogleSignIn ~> 9.0 and
// its AppCheckCore -> GoogleUtilities / RecaptchaInterop chain. Those Swift pods
// can't integrate as static libraries (no module maps), so `pod install` fails
// and the EAS iOS build dies before Xcode ever runs.
//
// Excluding the module from iOS autolinking removes that pod chain entirely.
// Android is untouched and keeps Google Sign-In.
module.exports = {
  dependencies: {
    '@react-native-google-signin/google-signin': {
      platforms: { ios: null },
    },
    // iOS TestFlight crash-loop (Sentry VOLYUME-1X, 2026-07-12, build 40):
    // react-native-ios-utilities' RNIBaseView layer throws a fatal
    // NSUnknownKeyException (KVC "reactPropHandler" on a plain RCTView)
    // during Fabric component-descriptor registration at app START on
    // RN 0.81 — before any JS renders the menu. The packages stay in
    // package.json because zeego's shared TS sources import from them
    // (Metro must still resolve them for the Android bundle); excluding
    // them here removes their pods from the iOS build entirely. The one
    // JS consumer is platform-forked so the iOS bundle never imports
    // zeego/context-menu (src/components/workout/SetRowMenu.ios.js).
    // Android is untouched and keeps the long-press set menu.
    'react-native-ios-utilities': {
      platforms: { ios: null },
    },
    'react-native-ios-context-menu': {
      platforms: { ios: null },
    },
  },
};
