import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Save, ShieldCheck } from 'lucide-react';
import { currentYear, localLeaveApi, policyYears } from './client';
import type { LeaveSettings } from './types';
import { errorMessage } from '../../shared/format';

export default function LeaveSettingsPage() {
  const [year, setYear] = useState(currentYear());
  const [sl, setSl] = useState('10'),
    [cl, setCl] = useState('10');
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setNotice('');
    localLeaveApi<LeaveSettings>(`/settings?year=${year}`)
      .then((data) => {
        if (active) {
          setSl(String(data.SL));
          setCl(String(data.CL));
        }
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year, retry]);
  return (
    <Stack spacing={3} sx={{ maxWidth: 850 }}>
      <Box>
        <Typography variant="overline" color="primary">
          ADMINISTRATION / APP SETTINGS
        </Typography>
        <Typography variant="h1" sx={{ mt: 0.5 }}>
          Admin Settings
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Manage the annual leave policy for your employees.
        </Typography>
      </Box>
      {error && (
        <Alert
          severity="error"
          action={<Button onClick={() => setRetry((n) => n + 1)}>Retry</Button>}
        >
          {error}
        </Alert>
      )}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', mb: 1 }}>
          <ShieldCheck size={23} />
          <Typography variant="h2">Annual leave allowances</Typography>
        </Stack>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
          These limits apply to every employee for the selected calendar year.
        </Typography>
        <TextField
          select
          label="Policy year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={busy}
          slotProps={{ select: { native: true } }}
          sx={{ width: 160, mb: 3 }}
        >
          {policyYears().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </TextField>
        {loading ? (
          <Box role="status" sx={{ py: 3 }}>
            <CircularProgress size={25} />
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await localLeaveApi('/settings', 'PUT', { year, SL: Number(sl), CL: Number(cl) });
                setNotice(`Leave settings saved for ${year}.`);
              } catch (error) {
                setError(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <TextField
                label="SL allowance (days)"
                type="number"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                required
                fullWidth
                helperText="Sick leave per employee"
                slotProps={{ htmlInput: { min: 0, max: 366, step: 1 } }}
              />
              <TextField
                label="CL allowance (days)"
                type="number"
                value={cl}
                onChange={(e) => setCl(e.target.value)}
                required
                fullWidth
                helperText="Casual leave per employee"
                slotProps={{ htmlInput: { min: 0, max: 366, step: 1 } }}
              />
            </Stack>
            <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
              Changes update available balances immediately. Allowances cannot be reduced below
              leave already approved. Other years keep their own policy, with 10 SL and 10 CL as the
              initial allowance.
            </Alert>
            <Button
              variant="contained"
              type="submit"
              startIcon={<Save size={17} />}
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save leave settings'}
            </Button>
          </Box>
        )}
      </Paper>
      <Typography variant="body2" color="text.secondary">
        Policy period: 1 January–31 December. Whole calendar days. No carry-forward.
      </Typography>
    </Stack>
  );
}
