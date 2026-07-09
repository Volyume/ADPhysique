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
  maskBase64?: string;
  engine?: string;
  errorCode?: string;
};

type BundledModelDiagnostic = {
  safeName?: string;
  targetExists?: boolean;
  targetBytes?: number;
  candidateCount?: number;
  discoveredCount?: number;
  firstOpenableCandidate?: string | null;
  firstOpenableBytes?: number | null;
  errorCode?: string;
};

type NativeShape = {
  extractRgb(uri: string, width: number, height: number): Promise<ExtractRgbResult>;
  segmentPersonMask?(uri: string, width: number, height: number): Promise<SegmentPersonMaskResult | null>;
  resolveBundledModel?(fileName: string): Promise<string | null>;
  diagnoseBundledModel?(fileName: string): Promise<BundledModelDiagnostic | null>;
  setExcludedFromBackup?(path: string): Promise<boolean>;
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

export async function diagnoseBundledModel(fileName: string): Promise<BundledModelDiagnostic | null> {
  if (!nativeModule?.diagnoseBundledModel || !fileName) return null;
  return nativeModule.diagnoseBundledModel(fileName);
}

// iOS backup exclusion (safety-privacy-blueprint.md §6.3, wave 5): marks a
// directory/file excluded from iCloud/iTunes device backups
// (NSURLIsExcludedFromBackupKey). Android has no equivalent attribute and
// the native side no-ops there (allowBackup=false already covers Android
// app-wide). Best-effort: never throws, resolves false on any failure.
export async function setExcludedFromBackup(path: string): Promise<boolean> {
  if (!nativeModule?.setExcludedFromBackup || !path) return false;
  try {
    return (await nativeModule.setExcludedFromBackup(path)) ?? false;
  } catch (_e) {
    return false;
  }
}

export default {
  isAvailable, extractRgb, segmentPersonMask, resolveBundledModel, diagnoseBundledModel,
  setExcludedFromBackup,
};
