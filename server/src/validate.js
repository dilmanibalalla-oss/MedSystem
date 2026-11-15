export function cleanText(value, max = 200) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export function parseAge(value) {
  const age = Number(value);
  if (!Number.isInteger(age) || age < 0 || age > 120) return null;
  return age;
}

export function parseAllergies(value) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set();
  const allergies = [];
  for (const item of source) {
    const allergy = String(item).trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!allergy) continue;
    const key = allergy.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    allergies.push(allergy);
    if (allergies.length === 30) break;
  }
  return allergies;
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const MEDICINE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Inhaler',
  'Drops',
  'Cream',
  'Sachet',
];
