import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// COMP-019 Stage 2: register the Android home-screen widget task handler. Guard
// the native require so Expo Go / iOS / any build without the widget plugin
// degrade to a no-op rather than crashing at startup.
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line global-require
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line global-require
    const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (_) {
    // Widget plugin not present in this build — nothing to register.
  }
}

registerRootComponent(App);
