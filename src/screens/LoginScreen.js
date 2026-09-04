import WelcomeScreen from './WelcomeScreen';

// The Login route (D145, third pass, 2026-09-04). Authentication is a sheet
// over the Welcome screen, so this route IS Welcome with the sheet open:
// anything that still navigates here (PlanPreview's account wall, a deep
// link, an expired session) lands on the same surface Welcome's own buttons
// open. E-1 (D96): the intent param still picks the mode. All auth logic
// lives in components/auth/AuthSheet.js; nothing about sessions, providers
// or the consent gate changed.
export default function LoginScreen({ navigation, route }) {
  const sheet = route?.params?.intent === 'pro_signup' ? 'signup' : 'signin';
  return <WelcomeScreen navigation={navigation} route={{ params: { sheet } }} />;
}
