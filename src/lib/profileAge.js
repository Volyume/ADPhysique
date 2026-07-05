function pad2(value) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function parseLocalDateKey(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function localDateParts(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function ageYearsFromDateOfBirth(dateOfBirth, now = new Date()) {
  const dob = parseLocalDateKey(dateOfBirth);
  const today = localDateParts(now);
  if (!dob || !today) return null;
  let age = today.year - dob.year;
  const birthdayPassed = today.month > dob.month || (today.month === dob.month && today.day >= dob.day);
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? age : null;
}

export function dateOfBirthFromAgeYears(ageYears, now = new Date()) {
  const age = Number(ageYears);
  const today = localDateParts(now);
  if (!Number.isFinite(age) || age <= 0 || !today) return null;
  const birthYear = today.year - Math.floor(age);
  const day = Math.min(today.day, daysInMonth(birthYear, today.month));
  return `${birthYear}-${pad2(today.month)}-${pad2(day)}`;
}
