import type { PayrollSources } from './types';
import { matchEmployees, parseAttendance, parseHolidays, parseSalaries } from './payroll';

/**
 * @brief Read user-selected report inputs entirely in browser memory.
 * @param attendance Required attendance text file; no employee defaults are published.
 * @param salary Optional salary text file; absent rates remain unavailable.
 * @param holiday Optional holiday TXT/CSV file.
 * @returns Parsed inputs for the reusable attendance and leave calculation engine.
 */
export async function loadLocalSources(
  attendance: File | null,
  salary: File | null,
  holiday: File | null,
): Promise<PayrollSources> {
  if (!attendance) throw new Error('Upload an attendance text file to calculate your report.');
  for (const file of [attendance, salary]) {
    if (file && !/\.txt$/i.test(file.name)) throw new Error('Use TXT attendance and salary files.');
  }
  if (holiday && !/\.(txt|csv)$/i.test(holiday.name))
    throw new Error('Use a TXT or CSV holiday file with YYYY-MM-DD dates, one per line.');
  const punches = parseAttendance(await attendance.text());
  if (!punches.length) throw new Error('The attendance file has no employee punches.');
  const salaries = salary ? parseSalaries(await salary.text()) : [];
  return {
    punches,
    employees: matchEmployees(punches, salaries),
    holidays: holiday ? parseHolidays(await holiday.text()) : undefined,
    attendanceSource: attendance.name,
    salarySource: salary?.name || 'Not supplied',
  };
}
