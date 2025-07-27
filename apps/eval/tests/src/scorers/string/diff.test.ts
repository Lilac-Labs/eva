import { describe, expect, test } from 'bun:test';
import { 
	scoreStringDiff, 
	scoreStringExact, 
	type StringDiffScore, 
	type StringExactScore 
} from '../../../../src/scorers/string/diff.js';

describe('scoreStringDiff', (): void => {
	describe('exact string matches', (): void => {
		test('matches identical strings', (): void => {
			const result = scoreStringDiff('hello world', 'hello world');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
			expect(result.details?.expectedLength).toBe(11);
			expect(result.details?.actualLength).toBe(11);
		});

		test('matches empty strings', (): void => {
			const result = scoreStringDiff('', '');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
			expect(result.details?.expectedLength).toBe(0);
			expect(result.details?.actualLength).toBe(0);
		});

		test('matches single character strings', (): void => {
			const result = scoreStringDiff('a', 'a');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
			expect(result.details?.expectedLength).toBe(1);
			expect(result.details?.actualLength).toBe(1);
		});

		test('matches strings with special characters', (): void => {
			const specialString = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			const result = scoreStringDiff(specialString, specialString);
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
		});

		test('matches strings with whitespace', (): void => {
			const whitespaceString = '  hello   world  \n\t';
			const result = scoreStringDiff(whitespaceString, whitespaceString);
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
		});
	});

	describe('completely different strings', (): void => {
		test('handles completely different strings of same length', (): void => {
			const result = scoreStringDiff('abc', 'xyz');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0); // 3 changes out of 3 characters = 0 similarity
			expect(result.details?.levenshteinDistance).toBe(3);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(3);
			expect(result.details?.actualLength).toBe(3);
		});

		test('handles completely different strings of different lengths', (): void => {
			const result = scoreStringDiff('hello', 'xyz');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0); // 5 changes out of 5 characters = 0 similarity
			expect(result.details?.levenshteinDistance).toBe(5);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(3);
		});

		test('handles empty vs non-empty strings', (): void => {
			const result = scoreStringDiff('', 'hello');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0);
			expect(result.details?.levenshteinDistance).toBe(5);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(0);
			expect(result.details?.actualLength).toBe(5);
		});

		test('handles non-empty vs empty strings', (): void => {
			const result = scoreStringDiff('hello', '');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0);
			expect(result.details?.levenshteinDistance).toBe(5);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(0);
		});
	});

	describe('similar strings with small differences', (): void => {
		test('handles single character substitution', (): void => {
			const result = scoreStringDiff('hello', 'hallo');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0.8); // 1 change out of 5 characters = 0.8 similarity
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0.8);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(5);
		});

		test('handles single character insertion', (): void => {
			const result = scoreStringDiff('hello', 'helloo');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(5/6); // 1 insertion, max length is 6
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(5/6);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(6);
		});

		test('handles single character deletion', (): void => {
			const result = scoreStringDiff('hello', 'hllo');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0.8); // 1 deletion, max length is 5
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0.8);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(4);
		});

		test('handles multiple small changes', (): void => {
			const result = scoreStringDiff('hello world', 'hallo werld');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBeCloseTo(0.8181818181818181, 5); // 2 changes out of 11 characters
			expect(result.details?.levenshteinDistance).toBe(2);
			expect(result.details?.similarity).toBeCloseTo(0.8181818181818181, 5);
			expect(result.details?.expectedLength).toBe(11);
			expect(result.details?.actualLength).toBe(11);
		});

		test('handles case differences', (): void => {
			const result = scoreStringDiff('Hello World', 'hello world');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBeCloseTo(0.8181818181818181, 5); // 2 case changes
			expect(result.details?.levenshteinDistance).toBe(2);
			expect(result.details?.similarity).toBeCloseTo(0.8181818181818181, 5);
			expect(result.details?.expectedLength).toBe(11);
			expect(result.details?.actualLength).toBe(11);
		});

		test('handles punctuation differences', (): void => {
			const result = scoreStringDiff('Hello, world!', 'Hello world');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(11/13); // 2 deletions (, and !)
			expect(result.details?.levenshteinDistance).toBe(2);
			expect(result.details?.similarity).toBe(11/13);
			expect(result.details?.expectedLength).toBe(13);
			expect(result.details?.actualLength).toBe(11);
		});
	});

	describe('very long strings', (): void => {
		test('handles long identical strings efficiently', (): void => {
			const longString = 'a'.repeat(1000);
			const result = scoreStringDiff(longString, longString);
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
			expect(result.details?.expectedLength).toBe(1000);
			expect(result.details?.actualLength).toBe(1000);
		});

		test('handles long strings with small differences', (): void => {
			const expected = 'a'.repeat(500) + 'b' + 'a'.repeat(499);
			const actual = 'a'.repeat(500) + 'c' + 'a'.repeat(499);
			const result = scoreStringDiff(expected, actual);
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(999/1000); // 1 change out of 1000 characters
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(999/1000);
			expect(result.details?.expectedLength).toBe(1000);
			expect(result.details?.actualLength).toBe(1000);
		});

		test('handles very different long strings', (): void => {
			const expected = 'a'.repeat(100);
			const actual = 'b'.repeat(100);
			const result = scoreStringDiff(expected, actual);
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0); // Completely different
			expect(result.details?.levenshteinDistance).toBe(100);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(100);
			expect(result.details?.actualLength).toBe(100);
		});

		test('handles strings with significant length differences', (): void => {
			const expected = 'hello';
			const actual = 'hello' + 'x'.repeat(995); // 1000 char string
			const result = scoreStringDiff(expected, actual);
			expect(result.name).toBe('string_diff');
			expect(result.value).toBeCloseTo(0.005, 3); // 995 insertions, max length 1000
			expect(result.details?.levenshteinDistance).toBe(995);
			expect(result.details?.similarity).toBeCloseTo(0.005, 3);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(1000);
		});
	});

	describe('unicode characters', (): void => {
		test('handles basic unicode characters', (): void => {
			const result = scoreStringDiff('café', 'café');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
			expect(result.details?.expectedLength).toBe(4);
			expect(result.details?.actualLength).toBe(4);
		});

		test('handles emoji characters', (): void => {
			const result = scoreStringDiff('Hello 👋', 'Hello 👋');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
		});

		test('handles mixed unicode and ascii', (): void => {
			const result = scoreStringDiff('Héllo wörld 🌍', 'Hello world 🌍');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBeCloseTo(12/14, 5); // 2 character changes
			expect(result.details?.levenshteinDistance).toBe(2);
			expect(result.details?.similarity).toBeCloseTo(12/14, 5);
		});

		test('handles different emoji', (): void => {
			const result = scoreStringDiff('Hello 👋', 'Hello 😊');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0.875); // 1 emoji change, length is 8
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0.875);
		});

		test('handles chinese characters', (): void => {
			const result = scoreStringDiff('你好世界', '你好世界');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
			expect(result.details?.expectedLength).toBe(4);
			expect(result.details?.actualLength).toBe(4);
		});

		test('handles unicode vs ascii differences', (): void => {
			const result = scoreStringDiff('café', 'cafe');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0.75); // 1 character difference
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0.75);
			expect(result.details?.expectedLength).toBe(4);
			expect(result.details?.actualLength).toBe(4);
		});
	});

	describe('edge cases and boundary conditions', (): void => {
		test('handles newlines and tabs', (): void => {
			const result = scoreStringDiff('line1\nline2\tindented', 'line1\nline2\tindented');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(1);
			expect(result.details?.levenshteinDistance).toBe(0);
			expect(result.details?.similarity).toBe(1);
		});

		test('handles strings with only whitespace', (): void => {
			const result = scoreStringDiff('   ', '\t\t\t');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0);
			expect(result.details?.levenshteinDistance).toBe(3);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(3);
			expect(result.details?.actualLength).toBe(3);
		});

		test('handles numeric strings', (): void => {
			const result = scoreStringDiff('12345', '12346');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0.8);
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0.8);
			expect(result.details?.expectedLength).toBe(5);
			expect(result.details?.actualLength).toBe(5);
		});

		test('handles single character vs empty string', (): void => {
			const result = scoreStringDiff('a', '');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0);
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0);
			expect(result.details?.expectedLength).toBe(1);
			expect(result.details?.actualLength).toBe(0);
		});

		test('handles strings with repeated patterns', (): void => {
			const result = scoreStringDiff('abababab', 'abababaa');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBe(0.875); // 1 change out of 8 (only the last 'b' -> 'a')
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBe(0.875);
			expect(result.details?.expectedLength).toBe(8);
			expect(result.details?.actualLength).toBe(8);
		});

		test('handles calculation accuracy for fractional results', (): void => {
			const result = scoreStringDiff('abc', 'ab');
			expect(result.name).toBe('string_diff');
			expect(result.value).toBeCloseTo(2/3, 10); // 1 deletion out of max 3
			expect(result.details?.levenshteinDistance).toBe(1);
			expect(result.details?.similarity).toBeCloseTo(2/3, 10);
			expect(result.details?.expectedLength).toBe(3);
			expect(result.details?.actualLength).toBe(2);
		});
	});

	describe('levenshtein distance edge cases', (): void => {
		test('calculates correct distance for transpositions', (): void => {
			// Note: Standard Levenshtein doesn't count transpositions as single operations
			const result = scoreStringDiff('abc', 'acb');
			expect(result.name).toBe('string_diff');
			expect(result.details?.levenshteinDistance).toBe(2); // Two substitutions in standard algorithm
			expect(result.value).toBeCloseTo(1/3, 5);
		});

		test('calculates correct distance for complex changes', (): void => {
			const result = scoreStringDiff('kitten', 'sitting');
			expect(result.name).toBe('string_diff');
			expect(result.details?.levenshteinDistance).toBe(3); // k->s, e->i, insert g
			expect(result.value).toBeCloseTo(4/7, 5); // 3 changes out of max length 7
		});

		test('calculates distance for strings with many insertions', (): void => {
			const result = scoreStringDiff('a', 'abcdefg');
			expect(result.name).toBe('string_diff');
			expect(result.details?.levenshteinDistance).toBe(6); // 6 insertions
			expect(result.value).toBeCloseTo(1/7, 5); // max length is 7
		});

		test('calculates distance for strings with many deletions', (): void => {
			const result = scoreStringDiff('abcdefg', 'a');
			expect(result.name).toBe('string_diff');
			expect(result.details?.levenshteinDistance).toBe(6); // 6 deletions
			expect(result.value).toBeCloseTo(1/7, 5); // max length is 7
		});
	});
});

describe('scoreStringExact', (): void => {
	describe('exact matches', (): void => {
		test('matches identical strings', (): void => {
			const result = scoreStringExact('hello world', 'hello world');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('matches empty strings', (): void => {
			const result = scoreStringExact('', '');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('matches single character strings', (): void => {
			const result = scoreStringExact('a', 'a');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('matches strings with special characters', (): void => {
			const specialString = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			const result = scoreStringExact(specialString, specialString);
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('matches strings with unicode characters', (): void => {
			const result = scoreStringExact('café 🌍', 'café 🌍');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('matches strings with whitespace', (): void => {
			const whitespaceString = '  hello   world  \n\t';
			const result = scoreStringExact(whitespaceString, whitespaceString);
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('matches very long strings', (): void => {
			const longString = 'a'.repeat(10000);
			const result = scoreStringExact(longString, longString);
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});
	});

	describe('non-matches', (): void => {
		test('rejects different strings', (): void => {
			const result = scoreStringExact('hello', 'world');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects case differences', (): void => {
			const result = scoreStringExact('Hello', 'hello');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects whitespace differences', (): void => {
			const result = scoreStringExact('hello world', 'hello  world');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects empty vs non-empty', (): void => {
			const result = scoreStringExact('', 'hello');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects non-empty vs empty', (): void => {
			const result = scoreStringExact('hello', '');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects single character differences', (): void => {
			const result = scoreStringExact('hello', 'hallo');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects unicode vs ascii', (): void => {
			const result = scoreStringExact('café', 'cafe');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects different emoji', (): void => {
			const result = scoreStringExact('Hello 👋', 'Hello 😊');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects length differences', (): void => {
			const result = scoreStringExact('hello', 'hello world');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('rejects subtle differences', (): void => {
			const result = scoreStringExact('hello\n', 'hello\r\n');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});
	});

	describe('edge cases', (): void => {
		test('handles strings with null characters', (): void => {
			const result = scoreStringExact('hello\0world', 'hello\0world');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('handles strings with control characters', (): void => {
			const controlString = 'hello\x01\x02\x03world';
			const result = scoreStringExact(controlString, controlString);
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('handles strings with backslash escapes', (): void => {
			const result = scoreStringExact('hello\\nworld', 'hello\\nworld');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('rejects literal vs escaped newlines', (): void => {
			const result = scoreStringExact('hello\nworld', 'hello\\nworld');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});

		test('handles numeric strings', (): void => {
			const result = scoreStringExact('12345.67', '12345.67');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(1);
		});

		test('rejects numeric precision differences', (): void => {
			const result = scoreStringExact('12345.67', '12345.670');
			expect(result.name).toBe('string_exact');
			expect(result.value).toBe(0);
		});
	});
});