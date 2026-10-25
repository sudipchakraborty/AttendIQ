export interface Punch {
  id: string;
  name?: string;
  date: string;
  time: string;
  mode?: string;
}
export interface Holiday {
  date: string;
  purpose?: string;
}
export interface Employee {
  id: string;
  name: string;
  monthlySalary: number | null;
}
export interface SalaryEntry {
  name: string;
  monthlySalary: number;
}
export interface PayrollSettings {
  officeStart?: string;
  officeEnd?: string;
  breakMinutes?: number;
  weeklyLeave?: string[];
  holidays?: Holiday[];
}
export interface SetupValues extends PayrollSettings {
  dateRange: { start: string; end: string };
  officeStart: string;
  officeEnd: string;
  breakMinutes: number;
  weeklyLeave: string[];
  holidays: Holiday[];
  holidayMode: 'manual' | 'file';
}
export interface SourceFiles {
  attendance: File | null;
  salary: File | null;
  holiday: File | null;
}
export interface PayrollSources {
  punches: Punch[];
  employees: Employee[];
  holidays?: Holiday[];
  attendanceSource: string;
  salarySource: string;
}
export type ReportPeriod = 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
export interface PayRate {
  month: string;
  workingDays: number;
  scheduledSeconds: number;
  scheduledHours: string;
  hourlyRate: number | null;
}
export interface AdjustmentBase {
  month: string;
  dailyRate: number | null;
  sundayCount: number;
  leaveCount: number;
}
export interface PayAdjustment extends AdjustmentBase {
  sundayPay: number | null;
  leavePay: number | null;
}
export interface AttendanceRow {
  date: string;
  name: string;
  start: string | null;
  tiffinEntry: string | null;
  tiffinExit: string | null;
  tiffinDuration: string | null;
  exit: string | null;
  hours: string | null;
  salary: number | null;
  status: string;
  punches: string[];
}
export interface EmployeeReport {
  rows: AttendanceRow[];
  totalSalary: number | null;
  sundayPay: number | null;
  leavePay: number | null;
  grandTotalSalary: number | null;
  adjustments: PayAdjustment[];
  totalHours: string;
  incompleteDays: number;
  missingDays: number;
  rates: PayRate[];
}
