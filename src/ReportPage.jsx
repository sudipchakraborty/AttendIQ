import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowDownToLine, CalendarDays, Clock3, FileSpreadsheet, Info } from 'lucide-react';

export default function ReportPage({ settings, onBack, onExport }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const details = settings && [
    ['Attendance file', settings.attendanceFile || 'Not selected'],
    ['Salary list', settings.salaryFile || 'Not selected'],
    ['Weekly leave', settings.weeklyLeave.join(', ') || 'None'],
    ['Monthly holidays', Array.isArray(settings.holidays) ? settings.holidays.join(', ') || 'None' : settings.holidays || 'None'],
    ['Office start', settings.officeStart],
    ['Office end', settings.officeEnd],
    ['Tiffin break', `${settings.breakMinutes} minutes`],
  ];

  return <div className="report-page">
    <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to setup</button>
    <div className="breadcrumb">REVIEW & EXPORT</div>
    <div className="page-heading"><div><h1 ref={heading} tabIndex={-1}>Attendance report<span>.</span></h1><p>Review your attendance configuration in one place.</p></div><span className="heading-icon"><FileSpreadsheet size={27}/></span></div>
    {!settings ? <section className="card report-empty"><FileSpreadsheet size={36}/><h2>No report prepared yet</h2><p>Add an attendance file and prepare your report from the setup page.</p><button type="button" className="primary-button" onClick={onBack}>Set up report</button></section> : <>
      <div className="report-stats">
        <section className="card"><CalendarDays size={20}/><span>Report period</span><strong>{settings.dateRange.start} → {settings.dateRange.end}</strong></section>
        <section className="card"><Clock3 size={20}/><span>Office hours</span><strong>{settings.officeStart} – {settings.officeEnd}</strong></section>
        <section className="card"><FileSpreadsheet size={20}/><span>Source files selected</span><strong>{1 + Number(!!settings.salaryFile)} <small>/ 2 files</small></strong></section>
      </div>
      <section className="card report-details"><div className="section-heading"><span className="section-icon"><FileSpreadsheet size={19}/></span><div><h2>Report configuration</h2><p>The settings selected for this attendance report.</p></div><span className="required-tag">SETUP PREVIEW</span></div><dl>{details.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className="card report-empty"><Info size={27}/><h2>Employee report pending</h2><p>Your files and settings are ready for the next stage. File parsing, employee attendance totals, and payroll calculations have not been implemented yet.</p></section>
      <div className="action-bar"><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16}/> Edit setup</button><button type="button" className="primary-button" onClick={onExport}><ArrowDownToLine size={17}/> Export settings</button></div>
    </>}
  </div>;
}
