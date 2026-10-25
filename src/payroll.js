const normalizeName = name => name.trim().replace(/\s+/g, ' ').toUpperCase();

export function parseAttendance(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!/EnNo/i.test(lines[0]) || !/DateTime/i.test(lines[0])) throw new Error('Attendance must be a tab-separated device export with EnNo and DateTime columns.');
  return lines.slice(1).filter(line => line.trim()).map((line, index) => {
    const fields = line.split('\t');
    const match = fields.at(-1)?.trim().match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (fields.length !== 6 || !match || !/^\d+$/.test(fields[2])) throw new Error(`Invalid attendance row ${index + 2}.`);
    const [, year, month, day, hour, minute, second] = match;
    const date = `${year}-${month}-${day}`;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== date || +hour > 23 || +minute > 59 || +second > 59) throw new Error(`Invalid attendance date/time at row ${index + 2}.`);
    return { id: fields[2], name: fields[3].trim().replace(/\s*\d+$/, '').trim(), date, time: `${hour}:${minute}:${second}`, mode: fields[4] };
  });
}

export function parseSalaries(text) {
  const names = new Set();
  const rows = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
    const match = line.trim().match(/^(.+?)\s+([\d,]+(?:\.\d{1,2})?)$/);
    if (!match) throw new Error(`Invalid salary row ${index + 1}. Expected employee name followed by monthly salary.`);
    const name = match[1].trim(), monthlySalary = Number(match[2].replaceAll(',', ''));
    if (!Number.isFinite(monthlySalary) || monthlySalary < 0 || names.has(normalizeName(name))) throw new Error(`Invalid or duplicate salary at row ${index + 1}.`);
    names.add(normalizeName(name));
    return { name, monthlySalary };
  });
  if (!rows.length) throw new Error('The salary file is empty.');
  return rows;
}

export function matchEmployees(punches, salaries) {
  const people = new Map();
  const matched = new Set();
  for (const punch of punches) {
    if (people.has(punch.id)) continue;
    const salary = salaries.find(row => punch.name && normalizeName(row.name) === normalizeName(punch.name));
    if (salary) matched.add(normalizeName(salary.name));
    people.set(punch.id, { id: punch.id, name: punch.name || `Unnamed employee (ID ${punch.id})`, monthlySalary: salary?.monthlySalary ?? null });
  }
  for (const salary of salaries) if (!matched.has(normalizeName(salary.name))) people.set(`salary-${normalizeName(salary.name)}`, { id: `salary-${normalizeName(salary.name)}`, ...salary });
  return [...people.values()];
}

const isoDate = date => date.toISOString().slice(0, 10);
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const seconds = time => time.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
const duration = value => `${Math.floor(value / 3600)}:${String(Math.floor(value % 3600 / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export function reportRange(period, anchor, from = anchor, to = anchor) {
  if (period === 'Custom') return { start: from, end: to };
  const [year, month] = anchor.split('-').map(Number);
  if (period === 'Monthly') return { start: `${anchor.slice(0, 7)}-01`, end: `${anchor.slice(0, 7)}-${daysInMonth(year, month)}` };
  if (period === 'Yearly') return { start: `${year}-01-01`, end: `${year}-12-31` };
  const day = new Date(`${anchor}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  const start = isoDate(day);
  day.setUTCDate(day.getUTCDate() + 6);
  return { start, end: isoDate(day) };
}

export function employeeAttendanceRange(id, punches, start, end) {
  const dates = punches.filter(punch => punch.id === id).map(punch => punch.date).sort();
  if (!dates.length || dates.some(date => date >= start && date <= end)) return { start, end };
  return reportRange('Monthly', dates[0]);
}

export function calculateEmployeeReport(employee, punches, from, to, settings = {}) {
  const first = new Date(`${from}T00:00:00Z`), last = new Date(`${to}T00:00:00Z`);
  if (!Number.isFinite(+first) || !Number.isFinite(+last) || isoDate(first) !== from || isoDate(last) !== to || from > to || (+last - +first) / 86400000 > 3660) throw new Error('Choose a valid report range of up to ten years.');
  const byDay = new Map();
  for (const punch of punches) {
    if (punch.id !== employee.id || punch.date < from || punch.date > to) continue;
    if (!byDay.has(punch.date)) byDay.set(punch.date, new Set());
    byDay.get(punch.date).add(punch.time);
  }
  const holidays = new Set(Array.isArray(settings.holidays) ? settings.holidays.map(row => row.date) : []);
  const rows = [];
  let totalCents = 0, totalSeconds = 0, incompleteDays = 0, missingDays = 0;
  for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = isoDate(cursor), times = [...(byDay.get(date) || [])].sort();
    const offDay = holidays.has(date) ? 'Holiday' : (settings.weeklyLeave || []).includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cursor.getUTCDay()]) ? 'Weekly leave' : null;
    let workedSeconds = null, status = offDay || 'No punches';
    if (!times.length && !offDay) missingDays++;
    if (times.length % 2) { status = 'Incomplete punches'; incompleteDays++; }
    else if (times.length >= 2) {
      workedSeconds = 0;
      for (let i = 0; i < times.length; i += 2) workedSeconds += seconds(times[i + 1]) - seconds(times[i]);
      if (times.length === 2) workedSeconds = Math.max(0, workedSeconds - Number(settings.breakMinutes || 0) * 60);
      status = times.length === 2 ? 'Configured break deducted' : times.length > 4 ? 'Multiple breaks' : 'Complete';
      totalSeconds += workedSeconds;
    }
    // Allocate integer cents by calendar day so a full month always totals exactly its salary.
    let salary = null;
    if (employee.monthlySalary !== null) {
      const cents = Math.round(employee.monthlySalary * 100), count = daysInMonth(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1);
      const allocation = Math.floor(cents / count) + (cursor.getUTCDate() <= cents % count ? 1 : 0);
      totalCents += allocation;
      salary = allocation / 100;
    }
    rows.push({ date, name: employee.name, start: times[0] || null, tiffinEntry: times.length >= 3 ? times[1] : null, tiffinExit: times.length >= 3 ? times[2] : null, tiffinDuration: times.length >= 3 ? duration(seconds(times[2]) - seconds(times[1])) : null, exit: times.length >= 2 && times.length % 2 === 0 ? times.at(-1) : null, hours: workedSeconds === null ? null : duration(workedSeconds), salary, status, punches: times });
  }
  return { rows, totalSalary: employee.monthlySalary === null ? null : totalCents / 100, totalHours: duration(totalSeconds), incompleteDays, missingDays };
}

export function salaryCsv(employee, report, sources) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const safeText = value => /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  const lines = [
    ['Employee', safeText(employee.name)], ['Monthly salary', employee.monthlySalary ?? 'Unavailable'],
    ['Salary policy', 'Full monthly salary; partial periods allocated by calendar days. No attendance deductions.'],
    ['Attendance source', safeText(sources.attendanceSource)], ['Salary source', safeText(sources.salarySource)],
    ['Date', 'Name', 'Start Time', 'Tiffin Time Entry', 'Tiffin Time Exit', 'Tiffin Duration', 'Exit Time', 'Total Working Hours', 'Salary', 'Status', 'All punches'],
    ...report.rows.map(row => [row.date, safeText(row.name), row.start, row.tiffinEntry, row.tiffinExit, row.tiffinDuration, row.exit, row.hours, row.salary?.toFixed(2) ?? 'Unavailable', row.status, row.punches.join(' / ')]),
    ['Total Salary', '', '', '', '', '', '', report.totalHours, report.totalSalary?.toFixed(2) ?? 'Unavailable'],
  ];
  return '\uFEFF' + lines.map(line => line.map(quote).join(',')).join('\r\n');
}
