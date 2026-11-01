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
import { Clock3, Save } from 'lucide-react';
import { localLeaveApi } from './client';
import { errorMessage } from '../../shared/format';

interface WorkHours {
  dutyStart: string;
  dutyEnd: string;
  tiffinStart: string;
  tiffinEnd: string;
}

export function WorkHoursSettings() {
  const [hours, setHours] = useState<WorkHours | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    localLeaveApi<WorkHours>('/settings/hours')
      .then((data) => {
        if (active) setHours(data);
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
  }, [retry]);
  function change(key: keyof WorkHours, value: string) {
    setHours((current) => (current ? { ...current, [key]: value } : null));
    setSaved(false);
  }
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', mb: 1 }}>
        <Clock3 size={23} />
        <Typography variant="h2">Duty & tiffin hours</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set your daily duty period and tiffin break. Use times within the same day.
      </Typography>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            !hours ? <Button onClick={() => setRetry((n) => n + 1)}>Retry</Button> : undefined
          }
        >
          {error}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Duty and tiffin hours saved.
        </Alert>
      )}
      {loading ? (
        <Box role="status" aria-label="Loading working hours" sx={{ py: 3 }}>
          <CircularProgress size={25} />
        </Box>
      ) : (
        hours && (
          <Box
            component="form"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              setSaved(false);
              try {
                setHours(await localLeaveApi<WorkHours>('/settings/hours', 'PUT', hours));
                setSaved(true);
              } catch (error) {
                setError(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Typography variant="h3" sx={{ mb: 2 }}>
              Duty hours
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
              <TextField
                label="Duty start time"
                type="time"
                value={hours.dutyStart}
                onChange={(e) => change('dutyStart', e.target.value)}
                required
                disabled={busy}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
              />
              <TextField
                label="Duty end time"
                type="time"
                value={hours.dutyEnd}
                onChange={(e) => change('dutyEnd', e.target.value)}
                required
                disabled={busy}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
              />
            </Stack>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Tiffin hours
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
              <TextField
                label="Tiffin start time"
                type="time"
                value={hours.tiffinStart}
                onChange={(e) => change('tiffinStart', e.target.value)}
                required
                disabled={busy}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
              />
              <TextField
                label="Tiffin end time"
                type="time"
                value={hours.tiffinEnd}
                onChange={(e) => change('tiffinEnd', e.target.value)}
                required
                disabled={busy}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
              />
            </Stack>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={17} />}
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save working hours'}
            </Button>
          </Box>
        )
      )}
    </Paper>
  );
}
