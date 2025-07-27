import type { BaseScore } from "../../eval/eval.types.js";

export interface StringDiffScore extends BaseScore {
  name: "string_diff";
  value: number;
  details?: {
    levenshteinDistance: number;
    similarity: number;
    expectedLength: number;
    actualLength: number;
  };
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export function scoreStringDiff(
  expected: string,
  actual: string,
): StringDiffScore {
  const distance = levenshteinDistance(expected, actual);
  const maxLength = Math.max(expected.length, actual.length);
  const similarity = maxLength === 0 ? 1 : 1 - distance / maxLength;

  return {
    name: "string_diff",
    value: similarity,
    details: {
      levenshteinDistance: distance,
      similarity,
      expectedLength: expected.length,
      actualLength: actual.length,
    },
  };
}

export interface StringExactScore extends BaseScore {
  name: "string_exact";
  value: number;
}

export function scoreStringExact(
  expected: string,
  actual: string,
): StringExactScore {
  return {
    name: "string_exact",
    value: expected === actual ? 1 : 0,
  };
}
