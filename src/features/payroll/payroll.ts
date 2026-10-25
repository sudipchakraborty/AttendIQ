import type {
  Punch,
  SalaryEntry,
  Employee,
  Holiday,
  PayrollSettings,
  PayRate,
  AdjustmentBase,
  AttendanceRow,
  EmployeeReport,
  PayrollSources,
  ReportPeriod,
} from './types';

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toUpperCase();

export function parseAttendance(text: string): Punch[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  if (!/EnNo/i.test(lines[0]) || !/DateTime/i.test(lines[0]))
    throw new Error(
      'Attendance must be a tab-separated device export with EnNo and DateTime columns.',
    );
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line, index) => {
      const fields = line.split('\t');
      const match = fields
        .at(-1)
        ?.trim()
        .match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (fields.length !== 6 || !match || !/^\d+$/.test(fields[2]))
        throw new Error(`Invalid attendance row ${index + 2}.`);
      const [, year, month, day, hour, minute, second] = match;
      const date = `${year}-${month}-${day}`;
      const parsed = new Date(`${date}T00:00:00Z`);
      if (
        !Number.isFinite(+parsed) ||
        parsed.toISOString().slice(0, 10) !== date ||
        +hour > 23 ||
        +minute > 59 ||
        +second > 59
      )
        throw new Error(`Invalid attendance date/time at row ${index + 2}.`);
      return {
        id: fields[2],
        name: fields[3]
          .trim()
          .replace(/\s*\d+$/, '')
          .trim(),
        date,
        time: `${hour}:${minute}:${second}`,
        mode: fields[4],
      };
    });
}

export function parseSalaries(text: string): SalaryEntry[] {
  const names = new Set();
  const rows = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const match = line.trim().match(/^(.+?)\s+([\d,]+(?:\.\d{1,2})?)$/);
      if (!match)
        throw new Error(
          `Invalid salary row ${index + 1}. Expected employee name followed by monthly salary.`,
        );
      const name = match[1].trim(),
        monthlySalary = Number(match[2].replaceAll(',', ''));
      if (!Number.isFinite(monthlySalary) || monthlySalary < 0 || names.has(normalizeName(name)))
        throw new Error(`Invalid or duplicate salary at row ${index + 1}.`);
      names.add(normalizeName(name));
      return { name, monthlySalary };
    });
  if (!rows.length) throw new Error('The salary file is empty.');
  return rows;
}

export function parseHolidays(text: string): Holiday[] {
  return text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() && !/^date(?:[,\t]|$)/i.test(line.trim()))
    .map((line, index) => {
      const match = line.trim().match(/^(\d{4}-\d{2}-\d{2})(?:[,\t]\s*(.*))?$/);
      if (!match)
        throw new Error(
          `Invalid holiday row ${index + 1}. Use YYYY-MM-DD, optional purpose, one date per line.`,
        );
      const parsed = new Date(`${match[1]}T00:00:00Z`);
      if (!match || !Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== match[1])
        throw new Error(
          `Invalid holiday row ${index + 1}. Use YYYY-MM-DD, optional purpose, one date per line.`,
        );
      return { date: match[1], purpose: match[2] || '' };
    });
}

export function matchEmployees(punches: Punch[], salaries: SalaryEntry[]): Employee[] {
  const people = new Map<string, Employee>();
  const matched = new Set();
  for (const punch of punches) {
    if (people.has(punch.id)) continue;
    const salary = salaries.find(
      (row) => punch.name && normalizeName(row.name) === normalizeName(punch.name),
    );
    if (salary) matched.add(normalizeName(salary.name));
    people.set(punch.id, {
      id: punch.id,
      name: punch.name || `Unnamed employee (ID ${punch.id})`,
      monthlySalary: salary?.monthlySalary ?? null,
    });
  }
  for (const salary of salaries)
    if (!matched.has(normalizeName(salary.name)))
      people.set(`salary-${normalizeName(salary.name)}`, {
        id: `salary-${normalizeName(salary.name)}`,
        ...salary,
      });
  return [...people.values()];
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();
const seconds = (time: string) => time.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
const duration = (value: number) =>
  `${Math.floor(value / 3600)}:${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export function reportRange(period: ReportPeriod, anchor: string, from = anchor, to = anchor) {
  if (period === 'Custom') return { start: from, end: to };
  const [year, month] = anchor.split('-').map(Number);
  if (period === 'Monthly')
    return {
      start: `${anchor.slice(0, 7)}-01`,
      end: `${anchor.slice(0, 7)}-${daysInMonth(year, month)}`,
    };
  if (period === 'Yearly') return { start: `${year}-01-01`, end: `${year}-12-31` };
  const day = new Date(`${anchor}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const start = isoDate(day);
  day.setUTCDate(day.getUTCDate() + 6);
  return { start, end: isoDate(day) };
}

export function employeeAttendanceRange(id: string, punches: Punch[], start: string, end: string) {
  const dates = punches
    .filter((punch) => punch.id === id)
    .map((punch) => punch.date)
    .sort();
  if (!dates.length || dates.some((date) => date >= start && date <= end)) return { start, end };
  return reportRange('Monthly', dates[0]);
}

export function calculateEmployeeReport(
  employee: Employee,
  punches: Punch[],
  from: string,
  to: string,
  settings: PayrollSettings = {},
): EmployeeReport {
  const first = new Date(`${from}T00:00:00Z`),
    last = new Date(`${to}T00:00:00Z`);
  if (
    !Number.isFinite(+first) ||
    !Number.isFinite(+last) ||
    isoDate(first) !== from ||
    isoDate(last) !== to ||
    from > to ||
    (+last - +first) / 86400000 > 3660
  )
    throw new Error('Choose a valid report range of up to ten years.');
  const byDay = new Map<string, Set<string>>();
  for (const punch of punches) {
    if (punch.id !== employee.id || punch.date < from || punch.date > to) continue;
    if (!byDay.has(punch.date)) byDay.set(punch.date, new Set());
    byDay.get(punch.date)!.add(punch.time);
  }
  const holidays = new Set(
    Array.isArray(settings.holidays) ? settings.holidays.map((row) => row.date) : [],
  );
  const officeSeconds = (time: string) => seconds(`${time}:00`);
  const cutoffSeconds = officeSeconds(settings.officeEnd || '18:30');
  const dailySeconds =
    cutoffSeconds -
    officeSeconds(settings.officeStart || '09:30') -
    Number(settings.breakMinutes ?? 30) * 60;
  if (!Number.isFinite(dailySeconds) || dailySeconds <= 0)
    throw new Error('Office hours minus tiffin break must leave positive working hours.');
  const rates = new Map<string, PayRate>();
  const monthRate = (date: string) => {
    const month = date.slice(0, 7);
    if (!rates.has(month)) {
      const [year, number] = month.split('-').map(Number);
      let days = 0;
      for (let day = 1; day <= daysInMonth(year, number); day++) {
        const cursor = new Date(Date.UTC(year, number - 1, day));
        const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cursor.getUTCDay()];
        if (!holidays.has(isoDate(cursor)) && !(settings.weeklyLeave || []).includes(weekday))
          days++;
      }
      if (!days)
        throw new Error(`No scheduled working days in ${month}. Adjust weekly leave or holidays.`);
      const scheduledSeconds = days * dailySeconds;
      rates.set(month, {
        month,
        workingDays: days,
        scheduledSeconds,
        scheduledHours: duration(scheduledSeconds),
        hourlyRate:
          employee.monthlySalary === null
            ? null
            : (employee.monthlySalary * 3600) / scheduledSeconds,
      });
    }
    return rates.get(month)!;
  };
  const rows: AttendanceRow[] = [];
  const adjustments = new Map<string, AdjustmentBase>();
  let totalCents = 0,
    totalSeconds = 0,
    incompleteDays = 0,
    missingDays = 0;
  for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = isoDate(cursor),
      times = [...(byDay.get(date) || [])].sort();
    const offDay = holidays.has(date)
      ? 'Holiday'
      : (settings.weeklyLeave || []).includes(
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cursor.getUTCDay()],
          )
        ? 'Weekly leave'
        : null;
    let workedSeconds = null,
      status = offDay || 'No punches';
    if (!times.length && !offDay) missingDays++;
    if (times.length % 2) {
      status = 'Incomplete punches';
      incompleteDays++;
    } else if (times.length >= 2) {
      workedSeconds = 0;
      for (let i = 0; i < times.length; i += 2)
        workedSeconds += Math.max(
          0,
          Math.min(seconds(times[i + 1]), cutoffSeconds) -
            Math.min(seconds(times[i]), cutoffSeconds),
        );
      if (times.length === 2)
        workedSeconds = Math.max(0, workedSeconds - Number(settings.breakMinutes || 0) * 60);
      status =
        times.length === 2
          ? 'Configured break deducted'
          : times.length > 4
            ? 'Multiple breaks'
            : 'Complete';
      totalSeconds += workedSeconds;
    }
    const rate = monthRate(date);
    const month = date.slice(0, 7);
    if (!adjustments.has(month))
      adjustments.set(month, {
        month,
        dailyRate:
          employee.monthlySalary === null
            ? null
            : Math.round(
                (employee.monthlySalary * 100) /
                  daysInMonth(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1),
              ) / 100,
        sundayCount: 0,
        leaveCount: 0,
      });
    const adjustment = adjustments.get(month)!;
    if (cursor.getUTCDay() === 0) adjustment.sundayCount++;
    else if (holidays.has(date)) adjustment.leaveCount++;

    const salary =
      employee.monthlySalary === null
        ? null
        : Math.round(
            (employee.monthlySalary * 100 * (workedSeconds || 0)) / rate.scheduledSeconds,
          ) / 100;
    if (salary !== null) totalCents += Math.round(salary * 100);
    rows.push({
      date,
      name: employee.name,
      start: times[0] || null,
      tiffinEntry: times.length >= 3 ? times[1] : null,
      tiffinExit: times.length >= 3 ? times[2] : null,
      tiffinDuration: times.length >= 3 ? duration(seconds(times[2]) - seconds(times[1])) : null,
      exit: times.length >= 2 && times.length % 2 === 0 ? times.at(-1)! : null,
      hours: workedSeconds === null ? null : duration(workedSeconds),
      salary,
      status,
      punches: times,
    });
  }
  const details = [...adjustments.values()].map((item) => ({
    ...item,
    sundayPay:
      item.dailyRate === null ? null : (Math.round(item.dailyRate * 100) * item.sundayCount) / 100,
    leavePay:
      item.dailyRate === null ? null : (Math.round(item.dailyRate * 100) * item.leaveCount) / 100,
  }));
  const sundayCents = details.reduce(
    (sum, item) => sum + Math.round((item.sundayPay || 0) * 100),
    0,
  );
  const leaveCents = details.reduce((sum, item) => sum + Math.round((item.leavePay || 0) * 100), 0);
  const known = employee.monthlySalary !== null;
  return {
    rows,
    totalSalary: known ? totalCents / 100 : null,
    sundayPay: known ? sundayCents / 100 : null,
    leavePay: known ? leaveCents / 100 : null,
    grandTotalSalary: known ? (totalCents + sundayCents + leaveCents) / 100 : null,
    adjustments: details,
    totalHours: duration(totalSeconds),
    incompleteDays,
    missingDays,
    rates: [...rates.values()],
  };
}

export function salaryCsv(
  employee: Employee,
  report: EmployeeReport,
  sources: Pick<PayrollSources, 'attendanceSource' | 'salarySource'>,
) {
  const quote = (value: string | number | null | undefined) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`;
  const safeText = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
  const lines = [
    ['Employee', safeText(employee.name)],
    ['Monthly salary', employee.monthlySalary ?? 'Unavailable'],
    [
      'Salary policy',
      'Recorded hours x monthly salary / scheduled monthly hours. Missing or incomplete punches unpaid; work after office end excluded. Add paid Sundays and configured holidays at monthly salary / calendar days; overlap counted once.',
    ],
    ...report.rates.map((rate) => [
      'Monthly rate',
      rate.month,
      'Scheduled hours',
      rate.scheduledHours,
      'Hourly rate',
      rate.hourlyRate?.toFixed(6) ?? 'Unavailable',
    ]),
    ['Attendance source', safeText(sources.attendanceSource)],
    ['Salary source', safeText(sources.salarySource)],
    [
      'Date',
      'Name',
      'Start Time',
      'Tiffin Time Entry',
      'Tiffin Time Exit',
      'Tiffin Duration',
      'Exit Time',
      'Total Working Hours',
      'Salary',
      'Status',
      'All punches',
    ],
    ...report.rows.map((row) => [
      row.date,
      safeText(row.name),
      row.start,
      row.tiffinEntry,
      row.tiffinExit,
      row.tiffinDuration,
      row.exit,
      row.hours,
      row.salary?.toFixed(2) ?? 'Unavailable',
      row.status,
      row.punches.join(' / '),
    ]),
    [
      'Total Salary',
      '',
      '',
      '',
      '',
      '',
      '',
      report.totalHours,
      report.totalSalary?.toFixed(2) ?? 'Unavailable',
    ],
    ...report.adjustments.flatMap((item) => [
      [
        'Sunday',
        item.month,
        'Daily rate',
        item.dailyRate?.toFixed(2) ?? 'Unavailable',
        'Count',
        item.sundayCount,
        'Amount',
        item.sundayPay?.toFixed(2) ?? 'Unavailable',
      ],
      [
        'Leave (configured holidays)',
        item.month,
        'Daily rate',
        item.dailyRate?.toFixed(2) ?? 'Unavailable',
        'Count',
        item.leaveCount,
        'Amount',
        item.leavePay?.toFixed(2) ?? 'Unavailable',
      ],
    ]),
    ['Sunday Pay', report.sundayPay?.toFixed(2) ?? 'Unavailable'],
    ['Leave Pay', report.leavePay?.toFixed(2) ?? 'Unavailable'],
    ['Grand Total Salary', report.grandTotalSalary?.toFixed(2) ?? 'Unavailable'],
  ];
  return '\uFEFF' + lines.map((line) => line.map(quote).join(',')).join('\r\n');
}
