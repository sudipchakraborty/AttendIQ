import type { PayrollSources } from './types';
import { api } from '../../shared/api';
import type { ManagedEmployee } from '../employees/types';
import { parseAttendance, parseSalaries, matchEmployees, parseHolidays } from './payroll';

export async function loadPayrollSources(
  attendance: File | null = null,
  salary: File | null = null,
  holidayFile: File | null = null,
): Promise<PayrollSources> {
  for (const file of [attendance, salary].filter((file): file is File => file !== null)) {
    if (!/\.txt$/i.test(file.name))
      throw new Error(
        'Please use text (.txt) files in the supplied attendance and salary formats.',
      );
  }
  const [attendanceText, salaryText] = await Promise.all([
    attendance ? attendance.text() : null,
    salary ? salary.text() : null,
  ]);
  const defaults = await api<{
    attendance: string;
    employees: ManagedEmployee[];
    archivedIds: string[];
  }>('/defaults');
  const punches = parseAttendance(attendanceText ?? defaults.attendance)
    .filter((punch) => !defaults.archivedIds.includes(punch.id))
    .map((punch) => {
      const managed = defaults.employees.find((employee) => employee.id === punch.id);
      return managed ? { ...punch, name: managed.name } : punch;
    });
  if (!punches.length && attendance)
    throw new Error('The attendance file has no active employee punches.');
  if (holidayFile && !/\.(txt|csv)$/i.test(holidayFile.name))
    throw new Error('Use a TXT or CSV holiday file with YYYY-MM-DD dates, one per line.');
  const holidays = holidayFile ? parseHolidays(await holidayFile.text()) : undefined;
  const normalized = (name: string) => name.trim().replace(/\s+/g, ' ').toUpperCase();
  const rates = salaryText === null ? null : parseSalaries(salaryText);
  const employees = defaults.employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    monthlySalary: rates
      ? (rates.find((rate) => normalized(rate.name) === normalized(employee.name))?.monthlySalary ??
        null)
      : employee.monthlySalary,
  }));
  const unknown = punches.filter(
    (punch) => !defaults.employees.some((employee) => employee.id === punch.id),
  );
  if (unknown.length) {
    for (const employee of matchEmployees(unknown, rates || [])) {
      if (
        !employees.some(
          (item) => normalized(item.name) === normalized(employee.name) || item.id === employee.id,
        )
      )
        employees.push(employee);
    }
  }
  if (rates)
    for (const rate of rates)
      if (!employees.some((employee) => normalized(employee.name) === normalized(rate.name)))
        employees.push({ id: `salary-${normalized(rate.name)}`, ...rate });
  return {
    punches,
    holidays,
    employees,
    attendanceSource: attendance?.name || 'Server attendance file',
    salarySource: salary?.name || 'Server Salary.txt',
  };
}
