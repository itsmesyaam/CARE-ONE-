import { describe, it, expect } from 'vitest';
import en from '../src/locales/en.json';
import ml from '../src/locales/ml.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

describe('i18n locale symmetry and naturalness', () => {
  const enFlat = flattenKeys(en);
  const mlFlat = flattenKeys(ml);

  it('en.json and ml.json have identical key sets', () => {
    const enKeys = Object.keys(enFlat).sort();
    const mlKeys = Object.keys(mlFlat).sort();
    expect(enKeys).toEqual(mlKeys);
  });

  it('no translation string is empty', () => {
    for (const [key, val] of Object.entries(enFlat)) {
      expect(val.trim().length, `Empty English value for key: ${key}`).toBeGreaterThan(0);
    }
    for (const [key, val] of Object.entries(mlFlat)) {
      expect(val.trim().length, `Empty Malayalam value for key: ${key}`).toBeGreaterThan(0);
    }
  });

  it('interpolation variables match between English and Malayalam', () => {
    const getVars = (str: string) => {
      const matches = str.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      return matches.sort();
    };

    for (const key of Object.keys(enFlat)) {
      const enVal = enFlat[key] ?? '';
      const mlVal = mlFlat[key] ?? '';
      const enVars = getVars(enVal);
      const mlVars = getVars(mlVal);
      expect(mlVars, `Mismatched interpolation variables for key ${key}`).toEqual(enVars);
    }
  });

  it('uses refined, natural Malayalam translations for medical and UI terms', () => {
    expect(mlFlat['common.actions']).toBe('ഓപ്ഷനുകൾ');
    expect(mlFlat['common.save']).toBe('സേവ് ചെയ്യുക');
    expect(mlFlat['common.saving']).toBe('സേവ് ചെയ്യുന്നു...');
    expect(mlFlat['admin.auditLog.headers.table']).toBe('വിഭാഗം');
    expect(mlFlat['admin.departments.edit']).toBe('ഡിപ്പാർട്ട്‌മെന്റ് തിരുത്തുക');
    expect(mlFlat['admin.overview.activityChartTitle']).toBe('പ്രവർത്തന വിതരണം');
    expect(mlFlat['doctor.whatChanged.kinds.reading']).toBe('പരിശോധനാ അളവ്');
    expect(mlFlat['doctor.whatChanged.kinds.missed']).toBe('തീയതി കഴിഞ്ഞത്');
  });
});
