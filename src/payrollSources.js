import defaultAttendance from './assets/Attendance.TXT?raw';
import defaultSalary from './assets/Salary.txt?raw';
import { parseAttendance, parseSalaries, matchEmployees, parseHolidays } from './payroll.js';

export async function loadPayrollSources(attendance, salary, holidayFile) {
  for (const file of [attendance, salary].filter(Boolean)) {
    if (!/\.txt$/i.test(file.name)) throw new Error('Please use text (.txt) files in the supplied attendance and salary formats.');
  }
  const [attendanceText, salaryText] = await Promise.all([attendance ? attendance.text() : defaultAttendance, salary ? salary.text() : defaultSalary]);
  const punches = parseAttendance(attendanceText);
  if (!punches.length) throw new Error('The attendance file has no punches.');
  if (holidayFile && !/\.(txt|csv)$/i.test(holidayFile.name)) throw new Error('Use a TXT or CSV holiday file with YYYY-MM-DD dates, one per line.');
  const holidays = holidayFile ? parseHolidays(await holidayFile.text()) : undefined;
  return {
    punches, holidays, employees: matchEmployees(punches, parseSalaries(salaryText)),
    attendanceSource: attendance?.name || 'assets/Attendance.TXT', salarySource: salary?.name || 'assets/Salary.txt',
  };
}
