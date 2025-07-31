import type { BaseScore } from '../../eval/eval.types.js';

export interface JsonDiffScore extends BaseScore {
  name: 'json_diff';
  value: number;
  details?: {
    differences: string[];
    totalFields: number;
    matchingFields: number;
  };
}

export function scoreJsonDiff(
  expected: unknown,
  actual: unknown,
): JsonDiffScore {
  const differences: string[] = [];
  let totalFields = 0;
  let matchingFields = 0;

  const findDifferences = (exp: unknown, act: unknown, path = ''): void => {
    if (exp === null && act === null) {
      matchingFields++;
      totalFields++;
      return;
    }

    if (exp === null || act === null) {
      differences.push(`${path}: expected ${String(exp)}, got ${String(act)}`);
      totalFields++;
      return;
    }

    if (typeof exp !== typeof act) {
      differences.push(
        `${path}: type mismatch - expected ${typeof exp}, got ${typeof act}`,
      );
      totalFields++;
      return;
    }

    if (typeof exp === 'object' && typeof act === 'object') {
      if (Array.isArray(exp) !== Array.isArray(act)) {
        differences.push(`${path}: array/object mismatch`);
        totalFields++;
        return;
      }

      if (Array.isArray(exp) && Array.isArray(act)) {
        const maxLength = Math.max(exp.length, act.length);
        for (let i = 0; i < maxLength; i++) {
          const currentPath = path ? `${path}[${i}]` : `[${i}]`;
          if (i >= exp.length) {
            differences.push(`${currentPath}: missing in expected`);
            totalFields++;
          } else if (i >= act.length) {
            differences.push(`${currentPath}: missing in actual`);
            totalFields++;
          } else {
            findDifferences(exp[i], act[i], currentPath);
          }
        }
      } else {
        const expObj = exp as Record<string, unknown>;
        const actObj = act as Record<string, unknown>;
        const allKeys = new Set([
          ...Object.keys(expObj),
          ...Object.keys(actObj),
        ]);

        for (const key of allKeys) {
          const currentPath = path ? `${path}.${key}` : key;
          if (!(key in expObj)) {
            differences.push(`${currentPath}: unexpected property in actual`);
            totalFields++;
          } else if (!(key in actObj)) {
            differences.push(`${currentPath}: missing property in actual`);
            totalFields++;
          } else {
            findDifferences(expObj[key], actObj[key], currentPath);
          }
        }
      }
    } else {
      totalFields++;
      if (exp === act) {
        matchingFields++;
      } else {
        const formatValue = (value: unknown): string => {
          if (value === null) return 'null';
          if (typeof value === 'object') {
            try {
              return JSON.stringify(value);
            } catch {
              return '[object Object]';
            }
          }
          if (typeof value === 'string') return value;
          if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          return '[object Object]';
        };
        differences.push(
          `${path}: expected ${formatValue(exp)}, got ${formatValue(act)}`,
        );
      }
    }
  };

  findDifferences(expected, actual);

  const accuracy = totalFields > 0 ? matchingFields / totalFields : 0;

  return {
    name: 'json_diff',
    value: accuracy,
    details: {
      differences,
      totalFields,
      matchingFields,
    },
  };
}
