/**
 * timeEntry
 *
 * Typing a time on a number pad, the way a microwave takes one (12-BUILD-SPEC
 * sections 1.5 and 2, register D220). Digits enter from the right and the well
 * reads m:ss. The buffer is a string of 0 to 4 digits with no leading zeros
 * kept. Pure functions: no I/O, no React, no clock.
 *
 *   pushDigit(buffer, digit)    append one digit; a 5th digit is ignored, and a
 *                               '0' on an empty buffer is ignored
 *   popDigit(buffer)            drop the last digit
 *   bufferToSeconds(buffer)     '' stays '' (the cleared field); otherwise the
 *                               whole seconds, the last two digits being
 *                               seconds and the rest minutes, so seconds over
 *                               59 roll into minutes ('1075' is 10 minutes 75
 *                               seconds, 675 s); clamped to MAX_SECONDS
 *   secondsToBuffer(seconds)    the inverse, for seeding an edit
 *   bufferToDisplay(buffer)     what the well shows while typing: the raw
 *                               digits as typed, so '90' reads 0:90
 *
 * MAX_SECONDS is the app's existing ceiling for a time field (SetEntry.js,
 * adjustSecondsFrom): 99:59.
 */

export const MAX_SECONDS = 5999;
export const MAX_DIGITS = 4;

function digitsOnly(buffer) {
  return typeof buffer === 'string' ? buffer.replace(/\D/g, '') : '';
}

export function pushDigit(buffer, digit) {
  const current = digitsOnly(buffer);
  const d = String(digit);
  if (!/^[0-9]$/.test(d)) return current;
  if (current.length >= MAX_DIGITS) return current;
  if (current === '' && d === '0') return current;
  return current + d;
}

export function popDigit(buffer) {
  return digitsOnly(buffer).slice(0, -1);
}

export function bufferToSeconds(buffer) {
  const digits = digitsOnly(buffer);
  if (digits === '') return '';
  const minutes = digits.length > 2 ? Number(digits.slice(0, -2)) : 0;
  const seconds = Number(digits.slice(-2));
  return Math.min(MAX_SECONDS, minutes * 60 + seconds);
}

export function secondsToBuffer(seconds) {
  const n = typeof seconds === 'number' ? seconds : Number(seconds);
  if (seconds === '' || seconds == null || !Number.isFinite(n) || n <= 0) return '';
  const whole = Math.min(MAX_SECONDS, Math.round(n));
  if (whole <= 0) return '';
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes === 0) return String(rest);
  return `${minutes}${String(rest).padStart(2, '0')}`;
}

export function bufferToDisplay(buffer) {
  const digits = digitsOnly(buffer);
  if (digits === '') return '';
  const minutes = digits.length > 2 ? digits.slice(0, -2) : '0';
  const seconds = digits.slice(-2).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
