import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAttendance, parseSalaries, matchEmployees, calculateEmployeeReport, reportRange, salaryCsv, employeeAttendanceRange } from './payroll.js';

const attendanceText = readFileSync(new URL('./assets/Attendance.TXT', import.meta.url), 'utf8');
const salaryText = readFileSync(new URL('./assets/Salary.txt', import.meta.url), 'utf8');
test('reads every device punch and preserves unnamed employee IDs', () => {
  const punches = parseAttendance(attendanceText);
  assert.equal(punches.length, 279);
  assert.equal(punches[0].date, '2019-12-05');
  assert.equal(punches[0].time, '21:02:30');
  assert.ok(punches.some(p => p.id === '6' && !p.name));
});
test('matches salaries by normalized name without assigning an unnamed ID a guessed salary', () => {
  const salaries = parseSalaries(salaryText);
  assert.equal(salaries.length, 6);
  const employees = matchEmployees(parseAttendance(attendanceText), salaries);
  assert.equal(employees.find(e => e.id === '1').monthlySalary, 15000);
  assert.equal(employees.find(e => e.id === '6').monthlySalary, null);
  assert.ok(employees.some(e => e.name.toLowerCase() === 'piyali koley'));
});
test('rejects malformed files and impossible dates instead of silently dropping rows', () => {
  assert.throws(() => parseAttendance('not attendance'), /attendance/i);
  assert.throws(() => parseSalaries('Person nope'), /salary/i);
  assert.throws(() => parseAttendance('No\tTMNo\tEnNo\tName GMNo\tMode\tDateTime\n1\t1\t1\tA 1\t0\t2026/02/31 09:00:00'), /date/i);
});

const settings = { weeklyLeave: ['Sun'], holidays: [], breakMinutes: 30 };
const person = { id: '1', name: 'SANU MALlK', monthlySalary: 15000 };
test('full monthly salary remains exact even with no punches or holidays', () => {
  const report = calculateEmployeeReport(person, [], '2026-10-01', '2026-10-31', { ...settings, holidays: [{ date: '2026-10-10' }] });
  assert.equal(report.totalSalary, 15000);
  assert.equal(report.rows.length, 31);
  assert.equal(report.rows.find(row => row.date === '2026-10-10').status, 'Holiday');
  assert.equal(report.rows.find(row => row.date === '2026-10-11').status, 'Weekly leave');
  assert.equal(report.rows[0].status, 'No punches');
});
test('uses paired punches for hours, flags odd punches, and never deducts full salary', () => {
  const punches = ['09:00:00', '14:00:00', '15:00:00', '19:00:00'].map(time => ({ id: '1', date: '2026-10-01', time }));
  punches.push({ id: '1', date: '2026-10-02', time: '09:00:00' });
  const report = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-31', settings);
  assert.equal(report.rows[0].hours, '9:00:00');
  assert.equal(report.rows[0].tiffinEntry, '14:00:00');
  assert.equal(report.rows[1].status, 'Incomplete punches');
  assert.equal(report.rows[1].hours, null);
  assert.equal(report.totalSalary, 15000);
});
test('two punches subtract configured tiffin; exact duplicates do not create false pairs', () => {
  const punches = ['09:00:00', '09:00:00', '18:00:00'].map(time => ({ id: '1', date: '2026-10-01', time }));
  const report = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-01', settings);
  assert.equal(report.rows[0].hours, '8:30:00');
  assert.equal(report.rows[0].status, 'Configured break deducted');
});
test('salary-only people get full pay; unknown salary is unavailable, never zero', () => {
  assert.equal(calculateEmployeeReport({ ...person, id: 'salary-person' }, [], '2024-02-01', '2024-02-29', settings).totalSalary, 15000);
  assert.equal(calculateEmployeeReport({ ...person, monthlySalary: null }, [], '2026-10-01', '2026-10-31', settings).totalSalary, null);
});
test('cross-month daily allocations add to exactly two salaries and invalid ranges fail', () => {
  assert.equal(calculateEmployeeReport(person, [], '2026-10-01', '2026-11-30', settings).totalSalary, 30000);
  const first = calculateEmployeeReport(person, [], '2026-10-01', '2026-10-15', settings).totalSalary;
  const second = calculateEmployeeReport(person, [], '2026-10-16', '2026-10-31', settings).totalSalary;
  assert.equal(Math.round((first + second) * 100), 1500000);
  assert.throws(() => calculateEmployeeReport(person, [], '2026-10-31', '2026-10-01', settings), /range/i);
});
test('period controls keep the chosen anchor date and custom range', () => {
  assert.deepEqual(reportRange('Weekly', '2026-10-01'), { start: '2026-09-28', end: '2026-10-04' });
  assert.deepEqual(reportRange('Monthly', '2024-02-10'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(reportRange('Yearly', '2026-10-01'), { start: '2026-01-01', end: '2026-12-31' });
  assert.deepEqual(reportRange('Custom', '2026-10-01', '2019-12-05', '2019-12-08'), { start: '2019-12-05', end: '2019-12-08' });
});

test('CSV carries actual calculated amounts, review status and source names', () => {
  const punches = [{ id: '1', date: '2026-10-01', time: '09:00:00' }];
  const report = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-31', settings);
  const csv = salaryCsv(person, report, { attendanceSource: 'Attendance.TXT', salarySource: 'Salary.txt' });
  assert.ok(csv.includes('"15000.00"'));
  assert.ok(csv.includes('"Incomplete punches"'));
  assert.ok(csv.includes('"Attendance.TXT"'));
  assert.ok(csv.includes('"09:00:00"'));
  assert.ok(!csv.includes('Sample'));
  const safe = salaryCsv({ ...person, name: '=FORMULA' }, { ...report, rows: [] }, { attendanceSource: '@source', salarySource: 'Salary.txt' });
  assert.ok(safe.includes("\"'=FORMULA\""));
  assert.ok(safe.includes("\"'@source\""));
});

test('uses each employee recorded dates when the selected range contains none', () => {
  const punches = parseAttendance(attendanceText);
  assert.deepEqual(employeeAttendanceRange('1', punches, '2026-10-01', '2026-10-31'), { start: '2019-12-01', end: '2019-12-31' });
  assert.deepEqual(employeeAttendanceRange('1', punches, '2025-09-01', '2025-09-30'), { start: '2025-09-01', end: '2025-09-30' });
  assert.deepEqual(employeeAttendanceRange('salary-person', punches, '2026-10-01', '2026-10-31'), { start: '2026-10-01', end: '2026-10-31' });
});

test('shows recorded tiffin return on three-punch days without inventing exit or work hours', () => {
  const punches = ['09:00:00', '13:00:00', '14:00:00'].map(time => ({ id: '1', date: '2026-10-01', time }));
  const row = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-01', settings).rows[0];
  assert.equal(row.tiffinEntry, '13:00:00');
  assert.equal(row.tiffinExit, '14:00:00');
  assert.equal(row.tiffinDuration, '1:00:00');
  assert.equal(row.exit, null);
  assert.equal(row.hours, null);
});
