import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ShieldCheck, Plus } from 'lucide-react';
import { api } from '../../shared/api';
import { errorMessage } from '../../shared/format';
import { SectionCard } from '../../shared/SectionCard';
import { useAuth } from './AuthProvider';
import type { Role, User } from './AuthProvider';

export default function UsersPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<User[]>([]),
    [editing, setEditing] = useState<User | 'new' | null>(null);
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [role, setRole] = useState<Role>('Viewer'),
    [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    try {
      const data = await api<{ users: User[] }>('/users');
      setUsers(data.users);
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(user: User | 'new') {
    setEditing(user);
    setName(user === 'new' ? '' : user.name);
    setEmail(user === 'new' ? '' : user.email);
    setRole(user === 'new' ? 'Viewer' : user.role);
    setActive(user === 'new' || user.active);
    setPassword('');
    setError('');
  }
  async function save() {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      await api(
        editing === 'new' ? '/users' : `/users/${editing.id}`,
        editing === 'new' ? 'POST' : 'PUT',
        {
          name,
          email,
          password,
          role,
          active,
          ...(editing === 'new' ? {} : { version: editing.version }),
        },
      );
      setEditing(null);
      setPassword('');
      setNotice('Account saved. Changes revoke existing sessions for that account.');
      if (editing !== 'new' && editing.id === auth.user?.id) await auth.refresh();
      else await load();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Typography variant="overline" color="primary">
        ACCESS CONTROL
      </Typography>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mt: 1, mb: 3 }}>
        <Box>
          <Typography variant="h1">The right access, for everyone.</Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Admin: full control. HR: people and payroll. Viewer: reports and support.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => edit('new')}>
          Add user
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      <SectionCard
        title="Users & roles"
        subtitle="Permissions are enforced by the server on every request."
        icon={<ShieldCheck size={20} />}
      >
        <TableContainer>
          <Table aria-label="User accounts">
            <TableHead>
              <TableRow>
                {['Name', 'Email', 'Role', 'Status', 'Action'].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip label={user.role} size="small" />
                  </TableCell>
                  <TableCell>{user.active ? 'Active' : 'Disabled'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => edit(user)}>
                      Edit access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
      <Dialog
        open={Boolean(editing)}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogTitle>{editing === 'new' ? 'Add user' : 'Edit account access'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                required
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <TextField
                required
                label="Account email"
                type="email"
                disabled={editing !== 'new'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                label={editing === 'new' ? 'Initial password' : 'Reset password (optional)'}
                required={editing === 'new'}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                slotProps={{ htmlInput: { minLength: 12, maxLength: 72 } }}
              />
              <TextField
                label="Role"
                select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                {(['Admin', 'HR', 'Viewer'] as Role[]).map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              {editing !== 'new' && (
                <FormControlLabel
                  control={
                    <Switch checked={active} onChange={(_, checked) => setActive(checked)} />
                  }
                  label="Account enabled"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Save account
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
