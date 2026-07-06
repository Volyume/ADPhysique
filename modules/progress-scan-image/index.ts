import { requireNativeModule } from 'expo-modules-core';

type ExtractRgbResult = {
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  contentRect?: { x: number; y: number; width: number; height: number };
  rgbBase64: string;
  lightingScore: number;
};

type SegmentPersonMaskResult = {
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  contentRect?: { x: number; y: number; width: number; height: number };
  maskBase64: string;
  engine?: string;
};

type NativeShape = {
  extractRgb(uri: string, width: number, height: number): Promise<ExtractRgbResult>;
  segmentPersonMask?(uri: string, width: number, height: number): Promise<SegmentPersonMaskResult | null>;
  resolveBundledModel?(fileName: string): Promise<string | null>;
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

export async function segmentPersonMask(uri: string, width: number, height: number): Promise<SegmentPersonMaskResult | null> {
  if (!nativeModule?.segmentPersonMask || !uri) return null;
  return nativeModule.segmentPersonMask(uri, width, height);
}

export async function resolveBundledModel(fileName: string): Promise<string | null> {
  if (!nativeModule?.resolveBundledModel || !fileName) return null;
  return nativeModule.resolveBundledModel(fileName);
}

export default {
  isAvailable, extractRgb, segmentPersonMask, resolveBundledModel,
};
