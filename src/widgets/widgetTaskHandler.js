/**
 * COMP-019 Stage 2 — the Android widget task handler.
 *
 * react-native-android-widget runs this in a headless JS context whenever the OS
 * needs to (re)render a widget. It reads the latest snapshot from the app
 * sandbox (AsyncStorage, written by src/lib/widgets/storage.js) and renders the
 * matching dumb widget. Tapping a widget opens the app: the widget root
 * declares the library's OPEN_APP click action (src/widgets/widgets.js,
 * Shell), which the native provider handles directly - it never arrives here
 * as a WIDGET_CLICK action, so this handler stays render-only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGET_SNAPSHOT_ASYNC_KEY } from '../lib/widgets/storage';
import { emptyWidgetSnapshot } from '../lib/widgets/snapshot';
import { NextSessionWidget, WeeklyConsistencyWidget } from './widgets';

async function loadSnapshot() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_ASYNC_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* fall through */ }
  return emptyWidgetSnapshot();
}

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const snapshot = await loadSnapshot();

  switch (widgetInfo.widgetName) {
    case 'WeeklyConsistency':
      props.renderWidget(<WeeklyConsistencyWidget snapshot={snapshot} />);
      break;
    case 'NextSession':
    default:
      props.renderWidget(<NextSessionWidget snapshot={snapshot} />);
      break;
  }
}
