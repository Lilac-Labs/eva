export const calculateAverage = (numbers: number[]): number => {
	return numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
};
