/**
 * Tactile feedback. No-op fallbacks — the native haptics module was removed
 * after it was implicated in a startup crash on device. These keep every call
 * site working (they simply do nothing) until haptics can be re-added with a
 * device-verified build. Never throws.
 */

export function tapHaptic(): void {}
export function impactHaptic(): void {}
export function successHaptic(): void {}
export function warnHaptic(): void {}
