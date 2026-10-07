import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const enPath = path.join(root, 'src', 'locales', 'en.json');
const mlPath = path.join(root, 'src', 'locales', 'ml.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ml = JSON.parse(fs.readFileSync(mlPath, 'utf8'));

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      Object.assign(result, flatten(val, full));
    } else {
      result[full] = String(val);
    }
  }
  return result;
}

const enFlat = flatten(en);
const mlFlat = flatten(ml);

const enKeys = Object.keys(enFlat).sort();
const mlKeys = Object.keys(mlFlat).sort();

const missingInMl = enKeys.filter(k => !(k in mlFlat));
const missingInEn = mlKeys.filter(k => !(k in enFlat));

let hasErrors = false;

if (missingInMl.length > 0) {
  console.error('ERROR: Keys present in en.json but missing in ml.json:');
  missingInMl.forEach(k => console.error(`  - ${k}`));
  hasErrors = true;
}

if (missingInEn.length > 0) {
  console.error('ERROR: Keys present in ml.json but missing in en.json:');
  missingInEn.forEach(k => console.error(`  - ${k}`));
  hasErrors = true;
}

const getVars = str => (str.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []).sort();

for (const key of enKeys) {
  if (key in mlFlat) {
    const enVars = getVars(enFlat[key]);
    const mlVars = getVars(mlFlat[key]);
    if (JSON.stringify(enVars) !== JSON.stringify(mlVars)) {
      console.error(`ERROR: Interpolation variable mismatch for "${key}":`);
      console.error(`  en: ${JSON.stringify(enVars)}`);
      console.error(`  ml: ${JSON.stringify(mlVars)}`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('i18n check failed.');
  process.exit(1);
} else {
  console.log(`i18n check passed: ${enKeys.length} keys verified with 100% symmetry.`);
}
