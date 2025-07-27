export const calculateAverage = (numbers: number[]): number => {
  return (
    numbers.reduce((sum, number): number => {
      return sum + number;
    }, 0) / numbers.length
  );
};
