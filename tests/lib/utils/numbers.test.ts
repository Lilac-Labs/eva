import { describe, expect, test } from 'bun:test';
import { calculateAverage } from '@lib/utils/numbers';

describe('calculateAverage', (): void => {
	test('calculates average of positive numbers', (): void => {
		const result = calculateAverage([1, 2, 3, 4, 5]);
		expect(result).toBe(3);
	});

	test('calculates average of negative numbers', (): void => {
		const result = calculateAverage([-1, -2, -3, -4, -5]);
		expect(result).toBe(-3);
	});

	test('calculates average of mixed numbers', (): void => {
		const result = calculateAverage([-2, 0, 2]);
		expect(result).toBe(0);
	});

	test('calculates average of single number', (): void => {
		const result = calculateAverage([42]);
		expect(result).toBe(42);
	});

	test('calculates average of decimal numbers', (): void => {
		const result = calculateAverage([1.5, 2.5, 3.5]);
		expect(result).toBeCloseTo(2.5);
	});

	test('calculates average of large numbers', (): void => {
		const result = calculateAverage([1000000, 2000000, 3000000]);
		expect(result).toBe(2000000);
	});

	test('handles zero values', (): void => {
		const result = calculateAverage([0, 0, 0]);
		expect(result).toBe(0);
	});
});