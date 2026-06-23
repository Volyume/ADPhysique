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
  },
};
