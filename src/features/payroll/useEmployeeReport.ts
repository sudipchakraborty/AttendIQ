import { useEffect, useMemo, useState } from 'react';
import { calculateEmployeeReport, employeeAttendanceRange, reportRange } from './payroll';
import type { PayrollSources, ReportPeriod, SetupValues } from './types';
import { errorMessage } from '../../shared/format';

export function useEmployeeReport(sources: PayrollSources | null, values: SetupValues) {
  const initialMonth = reportRange('Monthly', values.dateRange.start);
  const [period, setPeriod] = useState<ReportPeriod>(
    values.dateRange.start === initialMonth.start && values.dateRange.end === initialMonth.end
      ? 'Monthly'
      : 'Custom',
  );
  const [anchor, setAnchor] = useState(values.dateRange.start);
  const [from, setFrom] = useState(values.dateRange.start),
    [to, setTo] = useState(values.dateRange.end);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const employee =
    sources?.employees.find((item) => item.id === employeeId) || sources?.employees[0];
  const range =
    period === 'Custom' || anchor ? reportRange(period, anchor, from, to) : { start: '', end: '' };
  useEffect(() => {
    if (!sources?.employees.length) return;
    const next = employeeAttendanceRange(
      sources.employees[0].id,
      sources.punches,
      values.dateRange.start,
      values.dateRange.end,
    );
    if (next.start !== values.dateRange.start || next.end !== values.dateRange.end) {
      setPeriod('Monthly');
      setAnchor(next.start);
      setFrom(next.start);
      setTo(next.end);
    }
  }, [sources, values.dateRange.start, values.dateRange.end]);
  const selectEmployee = (id: string) => {
    if (!sources) return;
    const next = employeeAttendanceRange(id, sources.punches, range.start, range.end);
    if (next.start !== range.start || next.end !== range.end) {
      setPeriod('Monthly');
      setAnchor(next.start);
      setFrom(next.start);
      setTo(next.end);
    }
    setEmployeeId(id);
  };
  const recordedMonths = [
    ...new Set(
      (sources?.punches || [])
        .filter((punch) => punch.id === employee?.id)
        .map((punch) => punch.date.slice(0, 7)),
    ),
  ].sort();
  const selectMonth = (month: string) => {
    const next = reportRange('Monthly', `${month}-01`);
    setAnchor(next.start);
    setFrom(next.start);
    setTo(next.end);
    setPeriod('Monthly');
  };
  const calculation = useMemo(() => {
    if (!employee || !sources) return { report: null, error: '' };
    try {
      return {
        report: calculateEmployeeReport(employee, sources.punches, range.start, range.end, {
          ...values,
          holidays: sources.holidays ?? values.holidays,
        }),
        error: '',
      };
    } catch (error) {
      return { report: null, error: errorMessage(error) };
    }
  }, [employee, sources, range.start, range.end, values]);
  const hasPunches = sources?.punches.some(
    (punch) => punch.id === employee?.id && punch.date >= range.start && punch.date <= range.end,
  );
  return {
    ...calculation,
    employee,
    selectEmployee,
    recordedMonths,
    selectMonth,
    period,
    setPeriod,
    anchor,
    setAnchor,
    from,
    setFrom,
    to,
    setTo,
    range,
    hasPunches,
  };
}
