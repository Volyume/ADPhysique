const WHOOP5_SKIN_TEMP_SCALE = 100;
const WHOOP5_SKIN_TEMP_MIN_C = 5;
const WHOOP5_SKIN_TEMP_MAX_C = 45;

/** WHOOP 5/MG v18 @73 stores skin temperature as unsigned centi-degrees C. */
export function decodeWhoop5SkinTemp(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isInteger(raw)) return null;
  const celsius = raw / WHOOP5_SKIN_TEMP_SCALE;
  if (celsius < WHOOP5_SKIN_TEMP_MIN_C || celsius > WHOOP5_SKIN_TEMP_MAX_C) return null;
  return Math.round(celsius * 100) / 100;
}
