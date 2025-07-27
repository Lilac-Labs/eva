import { describe, expect, test } from 'bun:test';
import { scoreJsonDiff, type JsonDiffScore } from '../../../../src/scorers/json/diff.js';

describe('scoreJsonDiff', (): void => {
	describe('exact matches', (): void => {
		test('matches identical primitive numbers', (): void => {
			const result = scoreJsonDiff(42, 42);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(1);
		});

		test('matches identical primitive strings', (): void => {
			const result = scoreJsonDiff('hello', 'hello');
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(1);
		});

		test('matches identical primitive booleans', (): void => {
			const result = scoreJsonDiff(true, true);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(1);
		});

		test('matches identical null values', (): void => {
			const result = scoreJsonDiff(null, null);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(1);
		});

		test('matches identical simple objects', (): void => {
			const obj = { name: 'John', age: 30 };
			const result = scoreJsonDiff(obj, obj);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(2);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('matches identical arrays', (): void => {
			const arr = [1, 2, 3, 'hello'];
			const result = scoreJsonDiff(arr, arr);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(4);
			expect(result.details?.matchingFields).toBe(4);
		});

		test('matches identical nested objects', (): void => {
			const obj = {
				user: { name: 'Alice', details: { age: 25, city: 'NYC' } },
				items: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }],
			};
			const result = scoreJsonDiff(obj, obj);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(7); // user.name, user.details.age, user.details.city, items[0].id, items[0].name, items[1].id, items[1].name
			expect(result.details?.matchingFields).toBe(7);
		});

		test('matches empty objects', (): void => {
			const result = scoreJsonDiff({}, {});
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0); // Special case: no fields to compare, so 0/0 = 0
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(0);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('matches empty arrays', (): void => {
			const result = scoreJsonDiff([], []);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0); // Special case: no elements to compare
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(0);
			expect(result.details?.matchingFields).toBe(0);
		});
	});

	describe('type mismatches', (): void => {
		test('detects number vs string mismatch', (): void => {
			const result = scoreJsonDiff(42, '42');
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': type mismatch - expected number, got string');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('detects boolean vs number mismatch', (): void => {
			const result = scoreJsonDiff(true, 1);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': type mismatch - expected boolean, got number');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('detects object vs array mismatch', (): void => {
			const result = scoreJsonDiff({ name: 'test' }, ['test']);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': array/object mismatch');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('detects null vs object mismatch', (): void => {
			const result = scoreJsonDiff(null, { name: 'test' });
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': expected null, got [object Object]');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('detects object vs null mismatch', (): void => {
			const result = scoreJsonDiff({ name: 'test' }, null);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': expected [object Object], got null');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});
	});

	describe('missing and extra properties', (): void => {
		test('detects missing properties in actual object', (): void => {
			const expected = { name: 'John', age: 30, city: 'NYC' };
			const actual = { name: 'John', age: 30 };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 3); // 2 matching out of 3 total
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('city: missing property in actual');
			expect(result.details?.totalFields).toBe(3);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects extra properties in actual object', (): void => {
			const expected = { name: 'John', age: 30 };
			const actual = { name: 'John', age: 30, city: 'NYC' };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 3); // 2 matching out of 3 total
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('city: unexpected property in actual');
			expect(result.details?.totalFields).toBe(3);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects both missing and extra properties', (): void => {
			const expected = { name: 'John', age: 30, city: 'NYC' };
			const actual = { name: 'John', country: 'USA' };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1 / 4); // 1 matching out of 4 total
			expect(result.details?.differences).toHaveLength(3);
			expect(result.details?.differences).toContain('age: missing property in actual');
			expect(result.details?.differences).toContain('city: missing property in actual');
			expect(result.details?.differences).toContain('country: unexpected property in actual');
			expect(result.details?.totalFields).toBe(4);
			expect(result.details?.matchingFields).toBe(1);
		});
	});

	describe('nested object differences', (): void => {
		test('detects differences in nested objects', (): void => {
			const expected = { user: { name: 'John', age: 30 }, active: true };
			const actual = { user: { name: 'Jane', age: 30 }, active: true };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 3); // user.age and active match, user.name doesn't
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('user.name: expected John, got Jane');
			expect(result.details?.totalFields).toBe(3);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects deeply nested differences', (): void => {
			const expected = {
				level1: {
					level2: {
						level3: { value: 'original', number: 42 }
					}
				}
			};
			const actual = {
				level1: {
					level2: {
						level3: { value: 'modified', number: 42 }
					}
				}
			};
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1 / 2); // number matches, value doesn't
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('level1.level2.level3.value: expected original, got modified');
			expect(result.details?.totalFields).toBe(2);
			expect(result.details?.matchingFields).toBe(1);
		});

		test('detects missing nested properties', (): void => {
			const expected = { user: { name: 'John', details: { age: 30, city: 'NYC' } } };
			const actual = { user: { name: 'John', details: { age: 30 } } };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 3); // name and age match, city missing
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('user.details.city: missing property in actual');
			expect(result.details?.totalFields).toBe(3);
			expect(result.details?.matchingFields).toBe(2);
		});
	});

	describe('array differences', (): void => {
		test('detects array length differences - shorter actual', (): void => {
			const expected = [1, 2, 3, 4];
			const actual = [1, 2];
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 4); // first 2 elements match
			expect(result.details?.differences).toHaveLength(2);
			expect(result.details?.differences).toContain('[2]: missing in actual');
			expect(result.details?.differences).toContain('[3]: missing in actual');
			expect(result.details?.totalFields).toBe(4);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects array length differences - longer actual', (): void => {
			const expected = [1, 2];
			const actual = [1, 2, 3, 4];
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 4); // first 2 elements match
			expect(result.details?.differences).toHaveLength(2);
			expect(result.details?.differences).toContain('[2]: missing in expected');
			expect(result.details?.differences).toContain('[3]: missing in expected');
			expect(result.details?.totalFields).toBe(4);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects element value differences in arrays', (): void => {
			const expected = [1, 'hello', true];
			const actual = [1, 'world', true];
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 3); // elements 0 and 2 match
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('[1]: expected hello, got world');
			expect(result.details?.totalFields).toBe(3);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects type differences in array elements', (): void => {
			const expected = [1, 2, 3];
			const actual = [1, '2', 3];
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(2 / 3); // elements 0 and 2 match
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('[1]: type mismatch - expected number, got string');
			expect(result.details?.totalFields).toBe(3);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('handles arrays with nested objects', (): void => {
			const expected = [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }];
			const actual = [{ id: 1, name: 'item1' }, { id: 2, name: 'modified' }];
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(3 / 4); // 3 out of 4 fields match
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('[1].name: expected item2, got modified');
			expect(result.details?.totalFields).toBe(4);
			expect(result.details?.matchingFields).toBe(3);
		});
	});

	describe('null and undefined handling', (): void => {
		test('handles null vs undefined correctly', (): void => {
			const result = scoreJsonDiff(null, undefined);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': expected null, got undefined');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('handles undefined vs null correctly', (): void => {
			const result = scoreJsonDiff(undefined, null);
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe(': expected undefined, got null');
			expect(result.details?.totalFields).toBe(1);
			expect(result.details?.matchingFields).toBe(0);
		});

		test('handles null properties in objects', (): void => {
			const expected = { name: 'John', age: null };
			const actual = { name: 'John', age: null };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(2);
			expect(result.details?.matchingFields).toBe(2);
		});

		test('detects null vs value differences', (): void => {
			const expected = { name: 'John', age: null };
			const actual = { name: 'John', age: 25 };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1 / 2);
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('age: expected null, got 25');
			expect(result.details?.totalFields).toBe(2);
			expect(result.details?.matchingFields).toBe(1);
		});
	});

	describe('edge cases', (): void => {
		test('handles circular reference objects - may cause stack overflow', (): void => {
			const obj1: any = { name: 'test' };
			obj1.self = obj1;
			
			const obj2: any = { name: 'test' };
			obj2.self = obj2;
			
			// Note: This test documents that the current implementation doesn't handle 
			// circular references and will likely cause a stack overflow.
			// In a production system, you'd want to add cycle detection.
			expect((): void => {
				scoreJsonDiff(obj1, obj2);
			}).toThrow(); // Expecting it to throw due to stack overflow
		});

		test('handles very large numbers', (): void => {
			const large1 = Number.MAX_SAFE_INTEGER;
			const large2 = Number.MAX_SAFE_INTEGER;
			const result = scoreJsonDiff(large1, large2);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
		});

		test('handles special number values', (): void => {
			const result1 = scoreJsonDiff(NaN, NaN);
			expect(result1.value).toBe(0); // NaN !== NaN in JavaScript
			
			const result2 = scoreJsonDiff(Infinity, Infinity);
			expect(result2.value).toBe(1);
			
			const result3 = scoreJsonDiff(-Infinity, -Infinity);
			expect(result3.value).toBe(1);
		});

		test('handles empty strings', (): void => {
			const result = scoreJsonDiff('', '');
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
		});

		test('handles objects with numeric keys', (): void => {
			const expected = { '0': 'first', '1': 'second' };
			const actual = { '0': 'first', '1': 'second' };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
		});

		test('handles mixed arrays with different types', (): void => {
			const expected = [1, 'hello', true, null, { id: 1 }];
			const actual = [1, 'hello', true, null, { id: 1 }];
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(1);
			expect(result.details?.differences).toHaveLength(0);
			expect(result.details?.totalFields).toBe(5);
			expect(result.details?.matchingFields).toBe(5);
		});

		test('calculates correct accuracy for partial matches', (): void => {
			const expected = { a: 1, b: 2, c: 3, d: 4 };
			const actual = { a: 1, b: 2, c: 999, d: 4 };
			const result = scoreJsonDiff(expected, actual);
			
			expect(result.name).toBe('json_diff');
			expect(result.value).toBe(0.75); // 3 out of 4 match
			expect(result.details?.differences).toHaveLength(1);
			expect(result.details?.differences[0]).toBe('c: expected 3, got 999');
			expect(result.details?.totalFields).toBe(4);
			expect(result.details?.matchingFields).toBe(3);
		});
	});
});