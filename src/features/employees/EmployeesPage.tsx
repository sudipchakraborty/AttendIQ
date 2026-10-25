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
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import { api } from '../../shared/api';
import { errorMessage } from '../../shared/format';
import { SectionCard } from '../../shared/SectionCard';
import { Users } from 'lucide-react';
import type { ManagedEmployee } from './types';
import { useWorkspace } from '../../app/WorkspaceProvider';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [archived, setArchived] = useState(false),
    [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ManagedEmployee | 'new' | null>(null),
    [removing, setRemoving] = useState<ManagedEmployee | null>(null);
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [id, setId] = useState('');
  const { invalidate } = useWorkspace();
  async function load() {
    try {
      const data = await api<{ employees: ManagedEmployee[] }>('/employees');
      setEmployees(data.employees);
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(employee: ManagedEmployee | 'new') {
    setEditing(employee);
    setName(employee === 'new' ? '' : employee.name);
    setEmail(employee === 'new' ? '' : employee.email);
    setId(employee === 'new' ? '' : employee.id);
    setError('');
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      await api(
        editing === 'new' ? '/employees' : `/employees/${id}`,
        editing === 'new' ? 'POST' : 'PUT',
        { id, name, email, ...(editing !== 'new' && editing ? { version: editing.version } : {}) },
      );
      setEditing(null);
      invalidate();
      setNotice('Employee saved to employees.json. Salary.txt was synchronized.');
      await load();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function changeArchive(employee: ManagedEmployee, restore = false) {
    setBusy(true);
    setError('');
    try {
      await api(`/employees/${employee.id}`, restore ? 'PUT' : 'DELETE', {
        version: employee.version,
        name: employee.name,
        email: employee.email,
        archived: false,
      });
      setRemoving(null);
      invalidate();
      setNotice(
        restore ? 'Employee restored.' : 'Employee archived. Attendance history is preserved.',
      );
      await load();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Typography variant="overline" color="primary">
        PEOPLE DIRECTORY
      </Typography>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, mt: 1, mb: 3 }}
      >
        <Box>
          <Typography variant="h1">Your team, in one place.</Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Add people, keep details current, and preserve attendance history.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={17} />} onClick={() => edit('new')}>
          Add employee
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      <SectionCard
        title="Employees"
        subtitle="Changes are saved on the server."
        icon={<Users size={20} />}
        action={
          <FormControlLabel
            control={<Switch checked={archived} onChange={(_, value) => setArchived(value)} />}
            label={<Typography variant="caption">Show archived</Typography>}
          />
        }
      >
        <TableContainer>
          <Table aria-label="Employees">
            <TableHead>
              <TableRow>
                {['Device ID', 'Employee', 'Email', 'Status', 'Actions'].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {employees
                .filter((employee) => archived || !employee.archived)
                .map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.id}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.email || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={employee.archived ? 'Archived' : 'Active'}
                        color={employee.archived ? 'default' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {employee.archived ? (
                          <Button
                            size="small"
                            startIcon={<RotateCcw size={14} />}
                            disabled={busy}
                            onClick={() => void changeArchive(employee, true)}
                          >
                            Restore
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="small"
                              startIcon={<Pencil size={14} />}
                              onClick={() => edit(employee)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Archive size={14} />}
                              onClick={() => setRemoving(employee)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
      <Dialog
        open={editing !== null}
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
          <DialogTitle>{editing === 'new' ? 'Add employee' : 'Edit employee'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Device employee ID"
                value={id}
                disabled={editing !== 'new'}
                onChange={(event) => setId(event.target.value)}
                helperText="Use the employee ID from the attendance device. Leave blank to assign one."
              />
              <TextField
                autoFocus
                label="Employee name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                label="Employee email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Save employee
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(removing)}
        onClose={() => {
          if (!busy) setRemoving(null);
        }}
      >
        <DialogTitle>Delete {removing?.name}?</DialogTitle>
        <DialogContent>
          <Typography>
            The employee will be archived and hidden from reports. Their attendance history remains
            intact, and you can restore them later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => {
              if (removing) void changeArchive(removing);
            }}
          >
            Delete employee
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
