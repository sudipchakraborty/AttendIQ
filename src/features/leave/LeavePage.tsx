import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { CalendarDays, Check, Clock3, FileCheck2, Plus, RefreshCw, Users, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { currentYear, displayDate, leaveNames, localLeaveApi, policyYears } from './client';
import type { LeaveApplication, LeaveBalance, LeaveOverview, LeaveType } from './types';
import { errorMessage } from '../../shared/format';

const statusColor = { Pending: 'warning', Approved: 'success', Rejected: 'error' } as const;
const fieldSelect = { select: { native: true } };

function BalanceCard({ balance }: { balance: LeaveBalance }) {
  return (
    <Paper variant="outlined" data-testid={`balance-${balance.type}`} sx={{ p: 3, flex: 1 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 650 }}>{leaveNames[balance.type]}</Typography>
        <Chip
          label={balance.type}
          size="small"
          color={balance.type === 'SL' ? 'info' : 'primary'}
          variant="outlined"
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mt: 2 }}>
        <Typography sx={{ fontSize: 38, lineHeight: 1.2, fontWeight: 750 }}>
          {balance.available}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          of {balance.allowance} days available
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={balance.allowance ? Math.min(100, (balance.used / balance.allowance) * 100) : 0}
        sx={{ my: 2, height: 5, borderRadius: 4 }}
      />
      <Typography variant="body2" color="text.secondary">
        {balance.used} approved · {balance.pending} pending
      </Typography>
    </Paper>
  );
}

export default function LeavePage() {
  const auth = useAuth(),
    admin = auth.can('leave.read.all');
  const [year, setYear] = useState(currentYear());
  const [data, setData] = useState<LeaveOverview | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [type, setType] = useState<LeaveType>('SL'),
    [date, setDate] = useState(''),
    [days, setDays] = useState('1'),
    [reason, setReason] = useState('');
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('All');
  const [decision, setDecision] = useState<{
    application: LeaveApplication;
    status: 'Approved' | 'Rejected';
  } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await localLeaveApi<LeaveOverview>(`/leaves?year=${year}`));
    } catch (error) {
      setData(null);
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => {
    void load();
  }, [load]);
  const applications =
    data?.applications.filter(
      (a) =>
        (status === 'All' || a.status === status) &&
        `${a.employeeName} ${a.employeeId} ${a.type} ${a.reason}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const summary = [
    {
      label: 'Awaiting approval',
      value: data?.applications.filter((a) => a.status === 'Pending').length || 0,
      icon: Clock3,
    },
    {
      label: 'Approved applications',
      value: data?.applications.filter((a) => a.status === 'Approved').length || 0,
      icon: FileCheck2,
    },
    { label: 'Employees', value: data?.employees.length || 0, icon: Users },
  ];
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="overline" color="primary">
            PEOPLE & CULTURE / LEAVE
          </Typography>
          <Typography variant="h1" sx={{ mt: 0.5 }}>
            {admin ? 'Leave management' : 'My leave'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {admin
              ? 'Review requests and keep your team’s time off in balance.'
              : 'Plan your time away and track every application in one place.'}
          </Typography>
        </Box>
        <TextField
          select
          label="Year"
          fullWidth={false}
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value));
            setNotice('');
          }}
          slotProps={fieldSelect}
          sx={{ width: { xs: '100%', sm: 140 }, flexShrink: 0 }}
        >
          {policyYears().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </TextField>
      </Stack>
      {error && (
        <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {loading ? (
        <Box role="status" sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress size={26} />
          <Typography sx={{ mt: 1 }}>Loading leave records…</Typography>
        </Box>
      ) : (
        data && (
          <>
            {admin ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {summary.map((item) => (
                  <Paper key={item.label} variant="outlined" sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', color: 'text.secondary' }}
                    >
                      <Typography variant="body2">{item.label}</Typography>
                      <item.icon size={19} />
                    </Stack>
                    <Typography sx={{ fontSize: 34, fontWeight: 750, mt: 1 }}>
                      {item.value}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {data.balances.map((balance) => (
                    <BalanceCard key={balance.type} balance={balance} />
                  ))}
                </Stack>
                <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', mb: 0.75 }}>
                    <CalendarDays size={21} />
                    <Typography variant="h2">Apply for leave</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Applications go to your administrator for approval. Only approved leave reduces
                    your balance.
                  </Typography>
                  <Box
                    component="form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setBusy(true);
                      setError('');
                      setNotice('');
                      try {
                        await localLeaveApi('/leaves', 'POST', {
                          type,
                          date,
                          days: Number(days),
                          reason,
                        });
                        setDate('');
                        setDays('1');
                        setReason('');
                        const submittedYear = Number(date.slice(0, 4));
                        if (submittedYear !== year) setYear(submittedYear);
                        else await load();
                        setNotice('Leave application submitted for approval.');
                      } catch (error) {
                        setError(errorMessage(error));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      <TextField
                        select
                        label="Leave type"
                        value={type}
                        onChange={(e) => setType(e.target.value as LeaveType)}
                        slotProps={fieldSelect}
                      >
                        <option value="SL">SL — Sick leave</option>
                        <option value="CL">CL — Casual leave</option>
                      </TextField>
                      <TextField
                        label="Start date"
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: { min: '2000-01-01', max: '2100-12-31' },
                        }}
                      />
                      <TextField
                        label="Number of days"
                        type="number"
                        required
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        slotProps={{ htmlInput: { min: 1, max: 366, step: 1 } }}
                      />
                    </Box>
                    <TextField
                      fullWidth
                      label="Reason (optional)"
                      multiline
                      minRows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      slotProps={{ htmlInput: { maxLength: 1000 } }}
                      sx={{ mt: 2 }}
                    />
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: { sm: 'center' },
                        mt: 2.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Whole calendar days · January–December · No carry-forward
                      </Typography>
                      <Button
                        variant="contained"
                        type="submit"
                        disabled={busy}
                        startIcon={<Plus size={17} />}
                      >
                        {busy ? 'Submitting…' : 'Submit application'}
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              </>
            )}
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                >
                  <Box>
                    <Typography variant="h2">
                      {admin ? 'Employee applications' : 'My applications'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {data.applications.length}{' '}
                      {data.applications.length === 1 ? 'application' : 'applications'} in {year}
                    </Typography>
                  </Box>
                  <Button
                    aria-label="Refresh leave records"
                    onClick={() => void load()}
                    disabled={busy}
                    startIcon={<RefreshCw size={16} />}
                  >
                    Refresh
                  </Button>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    size="small"
                    label={admin ? 'Search employee or application' : 'Search applications'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    select
                    size="small"
                    label="Approval status"
                    fullWidth={false}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    slotProps={fieldSelect}
                    sx={{ width: { xs: '100%', sm: 180 }, flexShrink: 0 }}
                  >
                    {['All', 'Pending', 'Approved', 'Rejected'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </TextField>
                </Stack>
              </Box>
              {applications.length ? (
                <TableContainer>
                  <Table
                    aria-label={admin ? 'All employee leave applications' : 'My leave applications'}
                    sx={{ minWidth: admin ? 850 : 650 }}
                  >
                    <TableHead>
                      <TableRow>
                        {admin && <TableCell>Employee</TableCell>}
                        <TableCell>Leave type</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="center">No. of days</TableCell>
                        <TableCell>Approval</TableCell>
                        <TableCell>{admin ? 'Action' : 'Reviewed by'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {applications.map((a) => (
                        <TableRow key={a.id} hover>
                          {admin && (
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                {a.employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.employeeId}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <Chip size="small" variant="outlined" label={a.type} />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5, display: 'block' }}
                            >
                              {leaveNames[a.type]}
                            </Typography>
                            {a.reason && (
                              <Typography
                                variant="caption"
                                sx={{
                                  mt: 0.5,
                                  display: 'block',
                                  maxWidth: 220,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {a.reason}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {displayDate(a.date)}
                            {a.days > 1 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                to {displayDate(a.endDate)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">{a.days}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={a.status}
                              color={statusColor[a.status]}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {admin && a.status === 'Pending' ? (
                              <Stack direction="row" spacing={0.5}>
                                <Button
                                  size="small"
                                  color="success"
                                  aria-label={`Approve leave for ${a.employeeName}`}
                                  disabled={busy}
                                  onClick={() =>
                                    setDecision({ application: a, status: 'Approved' })
                                  }
                                  startIcon={<Check size={14} />}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  aria-label={`Reject leave for ${a.employeeName}`}
                                  disabled={busy}
                                  onClick={() =>
                                    setDecision({ application: a, status: 'Rejected' })
                                  }
                                  startIcon={<X size={14} />}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            ) : (
                              <>
                                <Typography variant="body2">
                                  {a.decidedBy || 'Awaiting review'}
                                </Typography>
                                {a.decidedAt && (
                                  <Typography variant="caption" color="text.secondary">
                                    {displayDate(a.decidedAt)}
                                  </Typography>
                                )}
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{ py: 6, px: 3, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}
                >
                  <CalendarDays size={30} />
                  <Typography sx={{ mt: 1.5, fontWeight: 650 }}>
                    {data.applications.length
                      ? 'No matching applications'
                      : 'No leave applications yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {data.applications.length
                      ? 'Try another search or approval status.'
                      : admin
                        ? 'Employee requests will appear here for review.'
                        : 'Your submitted applications will appear here.'}
                  </Typography>
                </Box>
              )}
            </Paper>
            {admin && (
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h2">Employee leave balances</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Available days after approved leave · {year}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table aria-label="Employee leave balances" sx={{ minWidth: 450 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>SL available</TableCell>
                        <TableCell>CL available</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 650 }}>
                              {employee.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {employee.id}
                            </Typography>
                          </TableCell>
                          {employee.balances.map((b) => (
                            <TableCell key={b.type}>
                              {b.available} / {b.allowance}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                {b.pending} pending
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </>
        )
      )}
      <Dialog
        open={Boolean(decision)}
        onClose={() => {
          if (!busy) setDecision(null);
        }}
        aria-labelledby="leave-decision-title"
      >
        <DialogTitle id="leave-decision-title">
          {decision?.status === 'Approved' ? 'Approve leave?' : 'Reject leave?'}
        </DialogTitle>
        <DialogContent>
          {decision && (
            <Typography>
              {decision.application.employeeName} · {decision.application.type} ·{' '}
              {decision.application.days} day(s) from {displayDate(decision.application.date)}.{' '}
              {decision.status === 'Approved'
                ? 'This will deduct the days from their available balance.'
                : 'Their available balance will stay the same.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDecision(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={decision?.status === 'Approved' ? 'success' : 'error'}
            disabled={busy}
            onClick={async () => {
              if (!decision) return;
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await localLeaveApi(`/leaves/${decision.application.id}/decision`, 'POST', {
                  status: decision.status,
                });
                setDecision(null);
                await load();
                setNotice(`Leave application ${decision.status.toLowerCase()}.`);
              } catch (error) {
                setDecision(null);
                setError(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            {decision?.status === 'Approved' ? 'Confirm approval' : 'Confirm rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
