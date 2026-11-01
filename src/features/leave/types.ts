export type LeaveType = 'SL' | 'CL';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export interface LeaveBalance {
  type: LeaveType;
  allowance: number;
  used: number;
  pending: number;
  available: number;
}
export interface LeaveApplication {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  date: string;
  endDate: string;
  year: number;
  days: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}
export interface LeaveOverview {
  year: number;
  applications: LeaveApplication[];
  balances: LeaveBalance[];
  employees: { id: string; name: string; email: string; balances: LeaveBalance[] }[];
}
export interface LeaveSettings {
  year: number;
  SL: number;
  CL: number;
}
