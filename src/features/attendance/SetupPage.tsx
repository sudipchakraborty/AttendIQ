import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  FolderUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceProvider';
import { SectionCard } from '../../shared/SectionCard';
import { FileUpload } from './FileUpload';
import { HolidayEditor } from './HolidayEditor';

export default function SetupPage() {
  const { values, update, files, setFile, busy, error, prepare } = useWorkspace();
  const navigate = useNavigate();
  const days =
    values.dateRange.start && values.dateRange.end
      ? Math.max(
          0,
          Math.round(
            (+new Date(values.dateRange.end) - +new Date(values.dateRange.start)) / 86400000,
          ) + 1,
        )
      : 0;
  return (
    <>
      <Typography variant="overline" color="primary">
        ATTENDANCE MANAGEMENT
      </Typography>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 4 }}
      >
        <Box>
          <Typography variant="h1">
            A good month starts with clarity
            <Box component="span" sx={{ color: 'primary.main' }}>
              .
            </Box>
          </Typography>
          <Typography sx={{ ...{ mt: 1.25 }, color: 'text.secondary' }}>
            Bring your attendance together. We’ll help you take it from here.
          </Typography>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', lg: 'grid' },
            placeItems: 'center',
            width: 60,
            height: 60,
            borderRadius: 3,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.09),
            color: 'primary.main',
            transform: 'rotate(-7deg)',
            ml: 2,
          }}
        >
          <CalendarDays size={29} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 3 }}>
        <Chip label="1" color="primary" size="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Set up your report
        </Typography>
        <Divider sx={{ width: { xs: 20, sm: 45 } }} />
        <Chip label="2" size="small" />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Review & export
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography
          variant="overline"
          sx={{ ...{ display: { xs: 'none', sm: 'block' } }, color: 'text.secondary' }}
        >
          MONTHLY WORKFLOW
        </Typography>
      </Stack>
      <Box
        component="form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await prepare()) navigate('/report');
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 305px' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            <SectionCard
              title="Source files"
              subtitle="A little input. A clearer picture."
              icon={<FolderUp size={20} />}
              action={
                <Chip
                  label="Defaults ready"
                  size="small"
                  variant="outlined"
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                />
              }
            >
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
              >
                <FileUpload
                  title="Monthly attendance"
                  description="Drop in your attendance"
                  file={files.attendance}
                  onChange={(file) => setFile('attendance', file)}
                  fallback="Attendance.TXT"
                />
                <FileUpload
                  title="Salary list"
                  description="Add your salary list"
                  file={files.salary}
                  onChange={(file) => setFile('salary', file)}
                  fallback="Salary.txt"
                />
              </Box>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ ...{ alignItems: 'center', mt: 2 }, color: 'text.secondary' }}
              >
                <ShieldCheck size={14} />
                <Typography variant="caption">
                  Missing uploads use the saved server files. Report calculations run in this
                  browser.
                </Typography>
              </Stack>
            </SectionCard>
            <SectionCard
              title="Leave & holidays"
              subtitle="Make room for the days off."
              icon={<CalendarDays size={20} />}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Weekly leave
              </Typography>
              <ToggleButtonGroup
                value={values.weeklyLeave}
                onChange={(_, leave: string[]) => update({ weeklyLeave: leave })}
                aria-label="Weekly leave"
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '7px !important',
                    py: 1.1,
                    px: 0.5,
                    fontSize: 11,
                    minWidth: 0,
                  },
                  '& .Mui-selected': { color: 'primary.main' },
                }}
              >
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <ToggleButton key={day} value={day} aria-label={day}>
                    {day}
                    {values.weeklyLeave.includes(day) && (
                      <Check size={11} style={{ marginLeft: 3 }} />
                    )}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography
                variant="caption"
                sx={{ ...{ display: 'block', mt: 1.25 }, color: 'text.secondary' }}
              >
                Select recurring weekly days off for your employees.
              </Typography>
              <HolidayEditor
                holidays={values.holidays}
                onChange={(holidays) => update({ holidays })}
                mode={values.holidayMode}
                onMode={(holidayMode) => update({ holidayMode })}
                file={files.holiday}
                onFile={(file) => setFile('holiday', file)}
              />
            </SectionCard>
            <SectionCard
              title="Office hours"
              subtitle="Define what a working day looks like."
              icon={<Clock3 size={20} />}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
                  gap: 2,
                }}
              >
                <TextField
                  label="Office start time"
                  type="time"
                  required
                  value={values.officeStart}
                  onChange={(event) => update({ officeStart: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Office end time"
                  type="time"
                  required
                  value={values.officeEnd}
                  onChange={(event) => update({ officeEnd: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Tiffin break (minutes)"
                  type="number"
                  required
                  value={Number.isFinite(values.breakMinutes) ? values.breakMinutes : ''}
                  onChange={(event) =>
                    update({
                      breakMinutes: event.target.value === '' ? NaN : Number(event.target.value),
                    })
                  }
                  slotProps={{ htmlInput: { min: 0, max: 240 } }}
                  sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                />
              </Box>
            </SectionCard>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr' },
              gap: 2.5,
            }}
          >
            <SectionCard
              title="Report period"
              subtitle="Choose your date range."
              icon={<CalendarDays size={20} />}
            >
              <Stack spacing={2.5}>
                <TextField
                  label="Start date"
                  type="date"
                  required
                  value={values.dateRange.start}
                  onChange={(event) =>
                    update({ dateRange: { ...values.dateRange, start: event.target.value } })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="End date"
                  type="date"
                  required
                  value={values.dateRange.end}
                  onChange={(event) =>
                    update({ dateRange: { ...values.dateRange, end: event.target.value } })
                  }
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: values.dateRange.start },
                  }}
                />
                <Divider />
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Selected period
                  </Typography>
                  <Typography sx={{ ...{ fontSize: 27, fontWeight: 600 }, color: 'primary.main' }}>
                    {days}
                    <Typography
                      component="span"
                      sx={{ ...{ fontSize: 12, ml: 0.5 }, color: 'text.secondary' }}
                    >
                      days
                    </Typography>
                  </Typography>
                </Stack>
                <Alert severity="info" icon={false}>
                  If there are no punches in this period, the report opens the employee’s first
                  recorded month.
                </Alert>
              </Stack>
            </SectionCard>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                background: (theme) =>
                  `linear-gradient(140deg, ${alpha(theme.palette.primary.main, 0.13)}, ${alpha(theme.palette.primary.main, 0.035)})`,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ ...{ alignItems: 'center' }, color: 'primary.main' }}
              >
                <Sparkles size={18} />
                <Typography variant="overline">YOUR REPORT, AT A GLANCE</Typography>
              </Stack>
              <Typography
                sx={{
                  fontSize: 31,
                  fontWeight: 600,
                  letterSpacing: '-1.2px',
                  lineHeight: 1.25,
                  mt: 3,
                  mb: 1.5,
                }}
              >
                Every day.
                <br />
                Accounted for.
              </Typography>
              <Typography variant="body2" sx={{ ...{ mb: 3 }, color: 'text.secondary' }}>
                One place for attendance, time off, and your team’s working hours.
              </Typography>
              {[
                [
                  'Source files',
                  `${Number(Boolean(files.attendance)) + Number(Boolean(files.salary))} uploaded · defaults ready`,
                ],
                ['Weekly days off', values.weeklyLeave.length],
                [
                  'Monthly holidays',
                  values.holidayMode === 'file'
                    ? files.holiday
                      ? 'File selected'
                      : 'No file'
                    : values.holidays.filter((row) => row.date).length,
                ],
              ].map(([label, value]) => (
                <Stack
                  key={label}
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    borderTop: 1,
                    borderColor: 'divider',
                    py: 1.5,
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {value}
                  </Typography>
                </Stack>
              ))}
            </Paper>
          </Box>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mt: 3, py: 2 }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {busy
              ? 'Reading your files…'
              : 'Your workspace is ready. Let’s make sense of the month.'}
          </Typography>
          <Button
            variant="contained"
            type="submit"
            disabled={busy}
            endIcon={<ArrowRight size={17} />}
            sx={{ minWidth: 155 }}
          >
            {busy ? 'Preparing report…' : 'Report'}
          </Button>
        </Stack>
      </Box>
    </>
  );
}
