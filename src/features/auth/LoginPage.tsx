import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Activity, ArrowRight, LockKeyhole } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ThemePicker } from '../../shared/ThemePicker';
import { errorMessage } from '../../shared/format';

export default function LoginPage() {
  const auth = useAuth(),
    location = useLocation();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [token, setToken] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (auth.user)
    return <Navigate to={(location.state as { from?: string } | null)?.from || '/'} replace />;
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2.5 }}>
      <Box sx={{ position: 'absolute', right: 24, top: 24 }}>
        <ThemePicker />
      </Box>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 450, p: { xs: 3, sm: 4 } }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', color: 'primary.main', mb: 4 }}
        >
          <Activity size={27} />
          <Typography sx={{ fontSize: 24, fontWeight: 750, letterSpacing: '-1px' }}>
            AttendIQ
          </Typography>
        </Stack>
        <LockKeyhole size={25} />
        <Typography variant="h2" sx={{ mt: 2 }}>
          {auth.setupRequired ? 'Set up your administrator' : 'Welcome to your workspace.'}
        </Typography>
        <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
          {auth.setupRequired
            ? 'Create the first administrator using the private installation token.'
            : 'Sign in to manage your people and payroll.'}
        </Typography>
        {auth.error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={<Button onClick={() => void auth.refresh()}>Retry</Button>}
          >
            {auth.error}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              if (auth.setupRequired) await auth.setup({ name, email, password, token });
              else await auth.login(email, password);
              setPassword('');
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Stack spacing={2.5}>
            {auth.setupRequired && (
              <>
                <TextField
                  label="Administrator name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <TextField
                  label="Installation token"
                  required
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  helperText="Read setup-token.txt from the server’s private storage folder."
                />
              </>
            )}
            <TextField
              autoFocus
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={auth.setupRequired ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              slotProps={{
                htmlInput: { minLength: auth.setupRequired ? 12 : undefined, maxLength: 72 },
              }}
              helperText={
                auth.setupRequired
                  ? 'At least 12 characters. No default password is supplied.'
                  : undefined
              }
            />
            <Button
              variant="contained"
              type="submit"
              disabled={busy || Boolean(auth.error)}
              endIcon={<ArrowRight size={16} />}
            >
              {busy ? 'Please wait…' : auth.setupRequired ? 'Create administrator' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 3, color: 'text.secondary' }}>
          Access is limited to accounts created by your administrator.
        </Typography>
      </Paper>
    </Box>
  );
}
