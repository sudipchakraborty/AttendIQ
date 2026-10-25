import defaultAttendance from './assets/Attendance.TXT?raw';
import defaultSalary from './assets/Salary.txt?raw';
import { parseAttendance, parseSalaries, matchEmployees } from './payroll.js';

export async function loadPayrollSources(attendance, salary) {
  for (const file of [attendance, salary].filter(Boolean)) {
    if (!/\.txt$/i.test(file.name)) throw new Error('Please use text (.txt) files in the supplied attendance and salary formats.');
  }
  const [attendanceText, salaryText] = await Promise.all([attendance ? attendance.text() : defaultAttendance, salary ? salary.text() : defaultSalary]);
  const punches = parseAttendance(attendanceText);
  if (!punches.length) throw new Error('The attendance file has no punches.');
  return {
    punches, employees: matchEmployees(punches, parseSalaries(salaryText)),
    attendanceSource: attendance?.name || 'assets/Attendance.TXT', salarySource: salary?.name || 'assets/Salary.txt',
  };
}
