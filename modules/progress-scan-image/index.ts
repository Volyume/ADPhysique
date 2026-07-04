import { requireNativeModule } from 'expo-modules-core';

type ExtractRgbResult = {
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  rgbBase64: string;
  lightingScore: number;
};

type NativeShape = {
  extractRgb(uri: string, width: number, height: number): Promise<ExtractRgbResult>;
};

let nativeModule: NativeShape | null = null;
try {
  nativeModule = requireNativeModule<NativeShape>('ProgressScanImage');
} catch (_e) {
  nativeModule = null;
}

export function isAvailable(): boolean {
  return nativeModule !== null;
}

export async function extractRgb(uri: string, width: number, height: number): Promise<ExtractRgbResult | null> {
  if (!nativeModule || !uri) return null;
  return nativeModule.extractRgb(uri, width, height);
}

export default { isAvailable, extractRgb };
