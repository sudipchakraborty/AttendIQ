import { useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowDownToLine, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceProvider';
import { useEmployeeReport } from './useEmployeeReport';
import { AttendanceTable } from './AttendanceTable';
import { SalarySummary } from './SalarySummary';
import { salaryCsv } from './payroll';
import type { ReportPeriod } from './types';
import { displayDate, money } from '../../shared/format';

export default function ReportPage() {
  const { values, sources, busy, error, prepare } = useWorkspace();
  const heading = useRef<HTMLHeadingElement>(null);
  const view = useEmployeeReport(sources, values);
  const { employee, report } = view;
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (!sources) void prepare();
  }, [sources, prepare]);
  const download = () => {
    if (!employee || !report || !sources) return;
    const url = URL.createObjectURL(
      new Blob([salaryCsv(employee, report, sources)], { type: 'text/csv;charset=utf-8;' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendiq-${employee.name.replace(/[^a-z0-9]+/gi, '-')}-${view.range.start}-${view.range.end}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <Button
        component={Link}
        to="/"
        startIcon={<ArrowLeft size={15} />}
        size="small"
        sx={{ mb: 2.5, px: 0 }}
      >
        Back to setup
      </Button>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="overline" color="primary">
            REVIEW & EXPORT
          </Typography>
          <Typography
            variant="h1"
            ref={heading}
            tabIndex={-1}
            sx={{ ...{ outline: 'none' }, mt: 1 }}
          >
            Your people. Your picture.
          </Typography>
          <Typography sx={{ ...{ mt: 1 }, color: 'text.secondary' }}>
            Attendance, working hours, and salary. Every detail in one place.
          </Typography>
        </Box>
        <Chip
          icon={<FileSpreadsheet size={14} />}
          label="Salary report"
          variant="outlined"
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        />
      </Stack>
      {busy && (
        <Stack direction="row" role="status" sx={{ alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={22} />
          <Typography>Reading attendance and salary files…</Typography>
        </Stack>
      )}
      {error && (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => void prepare()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {sources && employee && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
            <Chip
              label={`Attendance: ${sources.attendanceSource}`}
              variant="outlined"
              size="small"
              sx={{
                maxWidth: '100%',
                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
              }}
            />
            <Chip label={`Salary: ${sources.salarySource}`} variant="outlined" size="small" />
          </Stack>
          <Paper variant="outlined" sx={{ mb: 2.5, overflow: 'hidden' }}>
            <Tabs
              value={employee.id}
              onChange={(_, id: string) => view.selectEmployee(id)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              selectionFollowsFocus
              aria-label="Employee salary reports"
            >
              {sources.employees.map((person, index) => (
                <Tab
                  key={person.id}
                  value={person.id}
                  id={`employee-tab-${index}`}
                  aria-controls={`employee-panel-${index}`}
                  label={
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{person.name}</Typography>
                      <Typography sx={{ ...{ fontSize: 10, mt: 0.4 }, color: 'text.secondary' }}>
                        {person.monthlySalary === null
                          ? 'Salary unmatched'
                          : `Monthly ${money(person.monthlySalary)}`}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Paper>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '175px minmax(0, 1fr)' },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            <Paper variant="outlined" sx={{ p: 2.25 }}>
              <FormControl>
                <FormLabel sx={{ fontSize: 11, mb: 1 }}>Report period</FormLabel>
                <RadioGroup
                  value={view.period}
                  onChange={(event) => view.setPeriod(event.target.value as ReportPeriod)}
                  aria-label="Report period"
                  sx={{ flexDirection: { xs: 'row', lg: 'column' }, gap: { xs: 0, lg: 0.5 } }}
                >
                  {['Weekly', 'Monthly', 'Yearly', 'Custom'].map((option) => (
                    <FormControlLabel
                      key={option}
                      value={option}
                      control={<Radio size="small" />}
                      label={<Typography sx={{ fontSize: 12 }}>{option}</Typography>}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2.5}>
                {view.recordedMonths.length > 0 && (
                  <TextField
                    select
                    label="Recorded month"
                    value={
                      view.recordedMonths.includes(view.anchor.slice(0, 7))
                        ? view.anchor.slice(0, 7)
                        : ''
                    }
                    onChange={(event) => view.selectMonth(event.target.value)}
                  >
                    {view.recordedMonths.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {view.period === 'Custom' ? (
                  <>
                    <TextField
                      label="From"
                      type="date"
                      value={view.from}
                      onChange={(event) => view.setFrom(event.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label="To"
                      type="date"
                      value={view.to}
                      onChange={(event) => view.setTo(event.target.value)}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: view.from } }}
                    />
                  </>
                ) : (
                  <TextField
                    label="Period date"
                    type="date"
                    value={view.anchor}
                    onChange={(event) => view.setAnchor(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                )}
              </Stack>
            </Paper>
            <Paper
              variant="outlined"
              role="tabpanel"
              id={`employee-panel-${sources.employees.indexOf(employee)}`}
              aria-labelledby={`employee-tab-${sources.employees.indexOf(employee)}`}
              sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { sm: 'center' },
                  gap: 1,
                  mb: 2.5,
                }}
              >
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                    INDIVIDUAL REPORT
                  </Typography>
                  <Typography variant="h2" sx={{ mt: 0.6 }}>
                    {employee.name}
                  </Typography>
                </Box>
                <Chip
                  label={`${displayDate(view.range.start)} — ${displayDate(view.range.end)}`}
                  variant="outlined"
                  size="small"
                  sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
                />
              </Stack>
              {view.error && <Alert severity="error">{view.error}</Alert>}
              {report && (
                <>
                  {!view.hasPunches && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      No punches for this employee in this period. Earned salary is zero; paid
                      Sundays and configured holidays are added below.
                    </Alert>
                  )}
                  {employee.monthlySalary === null && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No salary matches this employee. Match their name in the salary list before
                      paying.
                    </Alert>
                  )}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                      gap: 2,
                      py: 2,
                      mb: 2,
                      borderTop: 1,
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                    {[
                      ['Monthly base', money(employee.monthlySalary)],
                      ['Payable work', report.totalHours],
                      ['Incomplete days', report.incompleteDays],
                      ['Missing workdays', report.missingDays],
                    ].map(([label, value]) => (
                      <Box key={label}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {label}
                        </Typography>
                        <Typography
                          sx={{
                            ...{ fontVariantNumeric: 'tabular-nums' },
                            fontSize: 18,
                            fontWeight: 600,
                            mt: 0.5,
                          }}
                        >
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box
                    component="details"
                    sx={{ mb: 2.5, fontSize: 11, color: 'text.secondary', lineHeight: 1.8 }}
                  >
                    <Box
                      component="summary"
                      sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600 }}
                    >
                      How salary is calculated
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      Work pay = payable hours × monthly base / scheduled monthly hours. Weekly
                      leave, holidays, and tiffin are excluded from the schedule. Only time up to
                      office end ({values.officeEnd}) counts; actual exit punches remain visible.
                      Two punches deduct the configured {values.breakMinutes}-minute tiffin; four or
                      more use recorded breaks. Odd punch counts need review and earn no work pay.
                      Overnight shifts need manual review.
                    </Typography>
                    {report.rates.map((rate) => (
                      <Typography
                        key={rate.month}
                        variant="caption"
                        sx={{ display: 'block', mt: 0.75 }}
                      >
                        {rate.month}: {rate.workingDays} scheduled days · {rate.scheduledHours}{' '}
                        hours · Hourly rate {money(rate.hourlyRate)}
                      </Typography>
                    ))}
                  </Box>
                  <AttendanceTable rows={report.rows} name={employee.name} />
                  <SalarySummary report={report} />
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={<ArrowDownToLine size={17} />}
                      onClick={download}
                    >
                      Download
                    </Button>
                  </Stack>
                </>
              )}
            </Paper>
          </Box>
        </>
      )}
    </>
  );
}
