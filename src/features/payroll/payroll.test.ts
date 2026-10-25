import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseAttendance,
  parseSalaries,
  parseHolidays,
  matchEmployees,
  calculateEmployeeReport,
  reportRange,
  salaryCsv,
  employeeAttendanceRange,
} from './payroll.ts';

const attendanceText = readFileSync(
  new URL('../../assets/Attendance.TXT', import.meta.url),
  'utf8',
);
const salaryText = readFileSync(new URL('../../assets/Salary.txt', import.meta.url), 'utf8');
test('reads every device punch and preserves unnamed employee IDs', () => {
  const punches = parseAttendance(attendanceText);
  assert.equal(punches.length, 279);
  assert.equal(punches[0].date, '2019-12-05');
  assert.equal(punches[0].time, '21:02:30');
  assert.ok(punches.some((p) => p.id === '6' && !p.name));
});
test('matches salaries by normalized name without assigning an unnamed ID a guessed salary', () => {
  const salaries = parseSalaries(salaryText);
  assert.equal(salaries.length, 6);
  const employees = matchEmployees(parseAttendance(attendanceText), salaries);
  assert.equal(employees.find((e) => e.id === '1').monthlySalary, 15000);
  assert.equal(employees.find((e) => e.id === '6').monthlySalary, null);
  assert.ok(employees.some((e) => e.name.toLowerCase() === 'piyali koley'));
});
test('rejects malformed files and impossible dates instead of silently dropping rows', () => {
  assert.throws(() => parseAttendance('not attendance'), /attendance/i);
  assert.throws(() => parseSalaries('Person nope'), /salary/i);
  assert.throws(
    () =>
      parseAttendance(
        'No\tTMNo\tEnNo\tName GMNo\tMode\tDateTime\n1\t1\t1\tA 1\t0\t2026/02/31 09:00:00',
      ),
    /date/i,
  );
});

const settings = { weeklyLeave: ['Sun'], holidays: [], breakMinutes: 30 };
const person = { id: '1', name: 'SANU MALlK', monthlySalary: 15000 };
test('no recorded attendance earns zero while holidays and leave keep their labels', () => {
  const report = calculateEmployeeReport(person, [], '2026-10-01', '2026-10-31', {
    ...settings,
    holidays: [{ date: '2026-10-10' }],
  });
  assert.equal(report.totalSalary, 0);
  assert.equal(report.rows.length, 31);
  assert.equal(report.rows.find((row) => row.date === '2026-10-10').status, 'Holiday');
  assert.equal(report.rows.find((row) => row.date === '2026-10-11').status, 'Weekly leave');
  assert.equal(report.rows[0].status, 'No punches');
});
test('pays only complete worked hours and flags unpaid incomplete punches', () => {
  const punches = ['09:00:00', '14:00:00', '15:00:00', '19:00:00'].map((time) => ({
    id: '1',
    date: '2026-10-01',
    time,
  }));
  punches.push({ id: '1', date: '2026-10-02', time: '09:00:00' });
  const report = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-31', settings);
  assert.equal(report.rows[0].hours, '8:30:00');
  assert.equal(report.rows[0].tiffinEntry, '14:00:00');
  assert.equal(report.rows[1].status, 'Incomplete punches');
  assert.equal(report.rows[1].hours, null);
  assert.equal(report.rows[0].salary, 555.56);
  assert.equal(report.rows[1].salary, 0);
  assert.equal(report.totalSalary, 555.56);
});
test('two punches subtract configured tiffin; exact duplicates do not create false pairs', () => {
  const punches = ['09:00:00', '09:00:00', '18:00:00'].map((time) => ({
    id: '1',
    date: '2026-10-01',
    time,
  }));
  const report = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-01', settings);
  assert.equal(report.rows[0].hours, '8:30:00');
  assert.equal(report.rows[0].status, 'Configured break deducted');
});
test('salary-only people earn zero without attendance; unmatched salary remains unavailable', () => {
  assert.equal(
    calculateEmployeeReport(
      { ...person, id: 'salary-person' },
      [],
      '2024-02-01',
      '2024-02-29',
      settings,
    ).totalSalary,
    0,
  );
  assert.equal(
    calculateEmployeeReport(
      { ...person, monthlySalary: null },
      [],
      '2026-10-01',
      '2026-10-31',
      settings,
    ).totalSalary,
    null,
  );
});
test('uses the correct monthly rate across month boundaries and sums daily cents', () => {
  const punches = ['2026-10-31', '2026-11-01'].flatMap((date) =>
    ['09:00:00', '18:00:00'].map((time) => ({ id: '1', date, time })),
  );
  const report = calculateEmployeeReport(person, punches, '2026-10-31', '2026-11-01', settings);
  assert.equal(report.rows[0].salary, 555.56);
  assert.equal(report.rows[1].salary, 600);
  assert.equal(report.totalSalary, 1155.56);
  assert.equal(
    report.totalSalary,
    report.rows.reduce((sum, row) => sum + Math.round(row.salary * 100), 0) / 100,
  );
  assert.throws(
    () => calculateEmployeeReport(person, [], '2026-10-31', '2026-10-01', settings),
    /range/i,
  );
});

test('period controls keep the chosen anchor date and custom range', () => {
  assert.deepEqual(reportRange('Weekly', '2026-10-01'), { start: '2026-09-28', end: '2026-10-04' });
  assert.deepEqual(reportRange('Monthly', '2024-02-10'), {
    start: '2024-02-01',
    end: '2024-02-29',
  });
  assert.deepEqual(reportRange('Yearly', '2026-10-01'), { start: '2026-01-01', end: '2026-12-31' });
  assert.deepEqual(reportRange('Custom', '2026-10-01', '2019-12-05', '2019-12-08'), {
    start: '2019-12-05',
    end: '2019-12-08',
  });
});

test('CSV carries actual calculated amounts, review status and source names', () => {
  const punches = [{ id: '1', date: '2026-10-01', time: '09:00:00' }];
  const report = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-31', settings);
  const csv = salaryCsv(person, report, {
    attendanceSource: 'Attendance.TXT',
    salarySource: 'Salary.txt',
  });
  assert.ok(csv.includes('"0.00"'));
  assert.ok(csv.includes('Recorded hours'));
  assert.ok(csv.includes('"Incomplete punches"'));
  assert.ok(csv.includes('"Attendance.TXT"'));
  assert.ok(csv.includes('"09:00:00"'));
  assert.ok(!csv.includes('Sample'));
  const safe = salaryCsv(
    { ...person, name: '=FORMULA' },
    { ...report, rows: [] },
    { attendanceSource: '@source', salarySource: 'Salary.txt' },
  );
  assert.ok(safe.includes('"\'=FORMULA"'));
  assert.ok(safe.includes('"\'@source"'));
});

test('uses each employee recorded dates when the selected range contains none', () => {
  const punches = parseAttendance(attendanceText);
  assert.deepEqual(employeeAttendanceRange('1', punches, '2026-10-01', '2026-10-31'), {
    start: '2019-12-01',
    end: '2019-12-31',
  });
  assert.deepEqual(employeeAttendanceRange('1', punches, '2025-09-01', '2025-09-30'), {
    start: '2025-09-01',
    end: '2025-09-30',
  });
  assert.deepEqual(employeeAttendanceRange('salary-person', punches, '2026-10-01', '2026-10-31'), {
    start: '2026-10-01',
    end: '2026-10-31',
  });
});

test('shows recorded tiffin return on three-punch days without inventing exit or work hours', () => {
  const punches = ['09:00:00', '13:00:00', '14:00:00'].map((time) => ({
    id: '1',
    date: '2026-10-01',
    time,
  }));
  const row = calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-01', settings)
    .rows[0];
  assert.equal(row.tiffinEntry, '13:00:00');
  assert.equal(row.tiffinExit, '14:00:00');
  assert.equal(row.tiffinDuration, '1:00:00');
  assert.equal(row.exit, null);
  assert.equal(row.hours, null);
});

test('scheduled monthly hours exclude leave and holidays; half day earns half daily pay', () => {
  const schedule = {
    officeStart: '09:00',
    officeEnd: '18:00',
    breakMinutes: 60,
    weeklyLeave: ['Sun'],
    holidays: [{ date: '2026-10-02' }],
  };
  const employee = { ...person, monthlySalary: 20800 };
  const punches = ['09:00:00', '14:00:00'].map((time) => ({ id: '1', date: '2026-10-01', time }));
  const report = calculateEmployeeReport(employee, punches, '2026-10-01', '2026-10-31', schedule);
  assert.equal(report.totalSalary, 400);
  assert.equal(report.rates[0].scheduledHours, '208:00:00');
  assert.equal(report.rates[0].hourlyRate, 100);
  assert.equal(report.rows[0].hours, '4:00:00');
});

test('work after office end is excluded; invalid schedules are rejected', () => {
  const schedule = {
    officeStart: '09:00',
    officeEnd: '18:00',
    breakMinutes: 60,
    weeklyLeave: ['Sun'],
  };
  const punches = ['08:00:00', '19:00:00'].map((time) => ({ id: '1', date: '2026-10-01', time }));
  assert.equal(
    calculateEmployeeReport(
      { ...person, monthlySalary: 21600 },
      punches,
      '2026-10-01',
      '2026-10-31',
      schedule,
    ).totalSalary,
    900,
  );
  assert.throws(
    () =>
      calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-31', {
        ...schedule,
        breakMinutes: 540,
      }),
    /break/i,
  );
  assert.throws(
    () =>
      calculateEmployeeReport(person, punches, '2026-10-01', '2026-10-31', {
        ...schedule,
        weeklyLeave: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      }),
    /scheduled/i,
  );
});

test('holiday text excludes actual dates from the monthly denominator and rejects bad dates', () => {
  const holidays = parseHolidays('Date,Purpose\n2026-10-02,Holiday\n2026-10-04,Sunday');
  const punches = ['09:00:00', '18:00:00'].map((time) => ({ id: '1', date: '2026-10-01', time }));
  const report = calculateEmployeeReport(
    { ...person, monthlySalary: 20800 },
    punches,
    '2026-10-01',
    '2026-10-31',
    { officeStart: '09:00', officeEnd: '18:00', breakMinutes: 60, weeklyLeave: ['Sun'], holidays },
  );
  assert.equal(report.totalSalary, 800);
  assert.equal(report.rates[0].workingDays, 26);
  assert.throws(() => parseHolidays('2026-02-31,Bad date'), /holiday/i);
});

test('caps every paired interval at office end while preserving actual recorded exit', () => {
  const schedule = {
    officeStart: '09:00',
    officeEnd: '18:00',
    breakMinutes: 60,
    weeklyLeave: ['Sun'],
  };
  const times = ['09:00:00', '13:00:00', '14:00:00', '20:00:00'];
  const punches = times.map((time) => ({ id: '1', date: '2026-10-01', time }));
  const report = calculateEmployeeReport(
    { ...person, monthlySalary: 21600 },
    punches,
    '2026-10-01',
    '2026-10-01',
    schedule,
  );
  assert.equal(report.rows[0].exit, '20:00:00');
  assert.equal(report.rows[0].hours, '8:00:00');
  assert.equal(report.totalSalary, 800);
  const late = ['19:00:00', '21:00:00'].map((time) => ({ id: '1', date: '2026-10-01', time }));
  assert.equal(
    calculateEmployeeReport(person, late, '2026-10-01', '2026-10-01', schedule).totalSalary,
    0,
  );
});

test('adds Sunday and configured holiday pay once per date at rounded calendar daily rate', () => {
  const report = calculateEmployeeReport(
    { ...person, monthlySalary: 31000 },
    [],
    '2026-10-01',
    '2026-10-31',
    {
      ...settings,
      holidays: [{ date: '2026-10-02' }, { date: '2026-10-04' }, { date: '2026-10-02' }],
    },
  );
  assert.equal(report.totalSalary, 0);
  assert.equal(report.sundayPay, 4000);
  assert.equal(report.leavePay, 1000);
  assert.equal(report.grandTotalSalary, 5000);
  assert.equal(report.adjustments[0].dailyRate, 1000);
  assert.equal(report.adjustments[0].sundayCount, 4);
  assert.equal(report.adjustments[0].leaveCount, 1);
});

test('paid days respect partial ranges and monthly rates; unknown salary keeps totals unavailable', () => {
  const report = calculateEmployeeReport(person, [], '2026-10-31', '2026-11-02', settings);
  assert.equal(report.adjustments.length, 2);
  assert.equal(report.adjustments[0].sundayCount, 0);
  assert.equal(report.adjustments[1].sundayCount, 1);
  assert.equal(report.grandTotalSalary, 500);
  const unknown = calculateEmployeeReport(
    { ...person, monthlySalary: null },
    [],
    '2026-10-01',
    '2026-10-31',
    settings,
  );
  assert.equal(unknown.sundayPay, null);
  assert.equal(unknown.grandTotalSalary, null);
});
