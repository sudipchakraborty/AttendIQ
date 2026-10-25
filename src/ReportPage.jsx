import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowDownToLine } from 'lucide-react';
import { calculateEmployeeReport, reportRange, salaryCsv, employeeAttendanceRange } from './payroll.js';
import { loadPayrollSources } from './payrollSources.js';

const columns = ['Date', 'Name', 'Start Time', 'Tiffin Time Entry', 'Tiffin Time Exit', 'Exit Time', 'Total Working Hours', 'Earned Salary'];
const money = value => value === null ? 'Unavailable' : value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const displayDate = value => value.split('-').reverse().join('.');

export default function ReportPage({ settings, data, attendanceFile, salaryFile, holidayFile, onBack }) {
  const heading = useRef(null);
  const [loaded, setLoaded] = useState(null), [loadError, setLoadError] = useState('');
  const initialStart = settings.dateRange.start, initialEnd = settings.dateRange.end;
  const month = reportRange('Monthly', initialStart);
  const [period, setPeriod] = useState(initialStart === month.start && initialEnd === month.end ? 'Monthly' : 'Custom');
  const [anchor, setAnchor] = useState(initialStart);
  const [from, setFrom] = useState(initialStart), [to, setTo] = useState(initialEnd);
  const [employeeId, setEmployeeId] = useState(null);
  const tabRefs = useRef([]);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    if (data) return;
    let cancelled = false;
    loadPayrollSources(attendanceFile, salaryFile, holidayFile).then(result => { if (!cancelled) setLoaded(result); }).catch(error => { if (!cancelled) setLoadError(error.message); });
    return () => { cancelled = true; };
  }, [data, attendanceFile, salaryFile, holidayFile]);
  const sources = data || loaded;
  const employee = sources?.employees.find(person => person.id === employeeId) || sources?.employees[0];
  const range = period === 'Custom' || anchor ? reportRange(period, anchor, from, to) : { start: '', end: '' };
  const employeeMonths = [...new Set((sources?.punches || []).filter(punch => punch.id === employee?.id).map(punch => punch.date.slice(0, 7)))].sort();
  const chooseEmployee = id => {
    const nextRange = employeeAttendanceRange(id, sources.punches, range.start, range.end);
    if (nextRange.start !== range.start || nextRange.end !== range.end) {
      setAnchor(nextRange.start); setFrom(nextRange.start); setTo(nextRange.end); setPeriod('Monthly');
    }
    setEmployeeId(id);
  };
  useEffect(() => {
    if (!sources?.employees.length) return;
    const next = employeeAttendanceRange(sources.employees[0].id, sources.punches, initialStart, initialEnd);
    if (next.start !== initialStart || next.end !== initialEnd) {
      setAnchor(next.start); setFrom(next.start); setTo(next.end); setPeriod('Monthly');
    }
  }, [sources, initialStart, initialEnd]);
  const calculation = useMemo(() => {
    if (!employee) return {};
    try { return { report: calculateEmployeeReport(employee, sources.punches, range.start, range.end, { ...settings, holidays: sources.holidays ?? settings.holidays }) }; }
    catch (error) { return { error: error.message }; }
  }, [employee, sources, range.start, range.end, settings]);
  const report = calculation.report;
  const attendanceDates = sources?.punches.map(punch => punch.date).sort();
  const hasPunches = sources?.punches.some(punch => punch.id === employee?.id && punch.date >= range.start && punch.date <= range.end);
  const download = () => {
    const url = URL.createObjectURL(new Blob([salaryCsv(employee, report, sources)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendiq-${employee.name.replace(/[^a-z0-9]+/gi, '-')}-${range.start}-${range.end}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const moveTab = (event, index) => {
    const count = sources.employees.length;
    const next = event.key === 'ArrowRight' ? (index + 1) % count : event.key === 'ArrowLeft' ? (index - 1 + count) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
    if (next === null) return;
    event.preventDefault();
    chooseEmployee(sources.employees[next].id); tabRefs.current[next]?.focus();
  };
  return <div className="report-page">
    <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to setup</button>
    <section className="report-sheet">
      <h1 ref={heading} tabIndex={-1}>Report</h1>
      {loadError ? <p role="alert" className="error">{loadError}</p> : !sources ? <p role="status">Reading attendance and salary files...</p> : <>
        <div className="report-sources"><span>Attendance: <strong>{sources.attendanceSource}</strong></span><span>Salary list: <strong>{sources.salarySource}</strong></span></div>
        <div className="employee-tabs" role="tablist" aria-label="Employee salary reports">{sources.employees.map((person, index) => <button key={person.id} ref={node => { tabRefs.current[index] = node; }} id={`employee-tab-${index}`} type="button" role="tab" aria-selected={employee.id === person.id} aria-controls={`employee-panel-${index}`} tabIndex={employee.id === person.id ? 0 : -1} onClick={() => chooseEmployee(person.id)} onKeyDown={event => moveTab(event, index)}>{person.name}<small>{person.monthlySalary === null ? 'Salary unmatched' : `Monthly ${money(person.monthlySalary)}`}</small></button>)}</div>
        <div className="report-policy">Attendance-based salary = payable working hours multiplied by monthly salary divided by scheduled monthly hours. Scheduled hours exclude weekly leave, holidays, and configured tiffin. Missing or incomplete work punches are unpaid pending review. Paid Sundays and configured holidays are added separately. Work after the configured office end time is excluded from payable hours and salary.</div>
        <div className="report-layout">
          <div><fieldset className="report-periods"><legend className="visually-hidden">Report period</legend>{['Weekly', 'Monthly', 'Yearly', 'Custom'].map(option => <label key={option}><input type="radio" name="report-period" value={option} checked={period === option} onChange={() => setPeriod(option)}/><span>{option}</span></label>)}</fieldset>{employeeMonths.length > 0 && <label className="report-anchor">Recorded month<select aria-label="Recorded month" value={employeeMonths.includes(anchor.slice(0, 7)) ? anchor.slice(0, 7) : ''} onChange={event => { const next = reportRange('Monthly', `${event.target.value}-01`); setAnchor(next.start); setFrom(next.start); setTo(next.end); setPeriod('Monthly'); }}><option value="" disabled>Choose recorded month</option>{employeeMonths.map(value => <option key={value} value={value}>{value}</option>)}</select></label>}{period !== 'Custom' && <label className="report-anchor">Period date<input type="date" value={anchor} onChange={event => setAnchor(event.target.value)}/></label>}</div>
          <div className="individual-report" role="tabpanel" id={`employee-panel-${sources.employees.indexOf(employee)}`} aria-labelledby={`employee-tab-${sources.employees.indexOf(employee)}`}>
            <h2>Individual report</h2><h3 className="employee-name">{employee.name}</h3>
            {period === 'Custom' && <div className="report-custom-dates"><label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>To<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)}/></label></div>}
            {calculation.error ? <p role="alert" className="error">{calculation.error}</p> : report && <>
              <p className="report-range">{displayDate(range.start)} - {displayDate(range.end)}</p>
              {!hasPunches && <p className="report-warning">No attendance punches for this employee in this period. File dates: {displayDate(attendanceDates[0])} - {displayDate(attendanceDates.at(-1))}. Earned salary is zero without complete punches; paid Sundays and configured holidays are added below.</p>}
              {employee.monthlySalary === null && <p role="alert" className="report-warning">No salary matches this employee. Pay is unavailable; match their name in the salary list before paying.</p>}
              <div className="employee-metrics"><span>Monthly base salary <strong>{money(employee.monthlySalary)}</strong></span><span>Payable work <strong>{report.totalHours}</strong></span><span>Incomplete days <strong>{report.incompleteDays}</strong></span><span>Workdays without punches <strong>{report.missingDays}</strong></span></div>
              <div className="salary-rate-details" aria-label="Salary calculation rates">{report.rates.map(rate => <p key={rate.month}><strong>{rate.month}</strong> | {rate.workingDays} scheduled days | {rate.scheduledHours} scheduled hours | Hourly rate {money(rate.hourlyRate)}</p>)}<small>Daily salary is rounded to two decimals; Total Salary adds the displayed daily amounts.</small></div>
              <p className="punch-method">Punches are paired chronologically within each day. Two punches use the configured {settings.breakMinutes}-minute tiffin break; four or more use recorded breaks. With three punches, the second and third appear as tiffin entry/return; exit and hours remain unconfirmed. Odd counts require review. Actual exit punches stay visible, but only time up to the configured office end ({settings.officeEnd}) counts toward salary. Overnight shifts require manual review.</p>
              <div className="attendance-table-wrap"><table className="attendance-table"><caption className="visually-hidden">Salary and attendance for {employee.name}</caption><thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{report.rows.map(row => <tr key={row.date} className={row.status === 'Incomplete punches' ? 'incomplete-row' : ''}><td>{displayDate(row.date)}<small className="day-status">{row.status}</small></td><td>{row.name}</td><td>{row.start || 'Not recorded'}</td><td>{row.tiffinEntry || 'Not recorded'}</td><td>{row.tiffinExit || 'Not recorded'}{row.tiffinDuration && <small className="day-status">Break: {row.tiffinDuration}</small>}</td><td>{row.exit || 'Not recorded'}</td><td>{row.hours || 'Not recorded'}{(row.punches.length > 4 || row.status === 'Incomplete punches') && <details className="all-punches"><summary>All punches</summary>{row.punches.join(' / ')}</details>}</td><td className="salary-cell">{money(row.salary)}</td></tr>)}</tbody></table></div>
              <div className="salary-breakdown" aria-label="Salary breakdown">
                <div className="salary-breakdown-total"><span>Total Salary</span><output aria-live="polite" aria-label="Total salary">{money(report.totalSalary)}</output></div>
                {report.adjustments.map(item => <React.Fragment key={item.month}>
                  {report.adjustments.length > 1 && <p className="adjustment-month">{item.month}</p>}
                  <div className="salary-adjustment" aria-label={`Sunday pay ${item.month}`}><span>Sunday</span><span>{money(item.dailyRate)}</span><span className="salary-multiply">&times;</span><span>{item.sundayCount}</span><output>{money(item.sundayPay)}</output></div>
                  <div className="salary-adjustment" aria-label={`Leave pay ${item.month}`}><span>Leave</span><span>{money(item.dailyRate)}</span><span className="salary-multiply">&times;</span><span>{item.leaveCount}</span><output>{money(item.leavePay)}</output></div>
                </React.Fragment>)}
                <div className="salary-breakdown-total grand-total"><span>Grand Total Salary</span><output aria-live="polite" aria-label="Grand total salary">{money(report.grandTotalSalary)}</output></div>
                <p className="salary-rule-note">Sunday and Leave pay are added. Daily rate = monthly base salary / calendar days, rounded to two decimals. Leave means configured holidays; Sunday holidays count once.</p>
              </div>
              <div className="report-bottom report-download-row"><button type="button" className="report-download" onClick={download}><ArrowDownToLine size={17}/> Download</button></div>
            </>}
          </div>
        </div>
      </>}
    </section>
  </div>;
}
