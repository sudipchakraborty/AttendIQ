export const money = (value: number | null) =>
  value === null
    ? 'Unavailable'
    : value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const displayDate = (value: string) => value.split('-').reverse().join('.');
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
