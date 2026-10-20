// FeatureSeen (growth telemetry, 2026-10-19): renders nothing; the first time
// it mounts for a person it records `feature_seen` for `feature` (a schema
// enum value, once per person per feature, via trackFeatureSeen). Place it
// inside the conditional that shows the feature so it only counts a sighting.
import { useEffect } from 'react';

export default function FeatureSeen({ feature }) {
  useEffect(() => {
    try {
      // eslint-disable-next-line global-require
      require('../lib/telemetry/growth').trackFeatureSeen(feature);
    } catch (_) { /* telemetry never blocks the UI */ }
  }, [feature]);
  return null;
}
