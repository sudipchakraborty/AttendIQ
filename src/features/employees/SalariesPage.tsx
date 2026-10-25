import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Wallet, Pencil } from 'lucide-react';
import type { ManagedEmployee } from './types';
import { api } from '../../shared/api';
import { errorMessage, money } from '../../shared/format';
import { SectionCard } from '../../shared/SectionCard';
import { useWorkspace } from '../../app/WorkspaceProvider';

export default function SalariesPage() {
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<ManagedEmployee | null>(null),
    [amount, setAmount] = useState(''),
    [busy, setBusy] = useState(false);
  const { invalidate } = useWorkspace();
  async function load() {
    try {
      const data = await api<{ employees: ManagedEmployee[] }>('/salaries');
      setEmployees(data.employees);
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save() {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      await api(`/salaries/${editing.id}`, 'PUT', {
        version: editing.version,
        monthlySalary: Number(amount),
      });
      setEditing(null);
      invalidate();
      setNotice('Monthly salary saved to Salary.txt. Reports will use the updated rate.');
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
        PAYROLL SETTINGS
      </Typography>
      <Typography variant="h1" sx={{ mt: 1 }}>
        A clear view of every salary.
      </Typography>
      <Typography sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        Manage monthly base rates. Uploaded salary files remain explicit report overrides.
      </Typography>
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
        title="Employee salaries"
        subtitle="Saved to the server’s Salary.txt file."
        icon={<Wallet size={20} />}
      >
        <TableContainer>
          <Table aria-label="Employee salaries">
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Employee name</TableCell>
                <TableCell align="right">Monthly base salary</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.id}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell align="right">{money(employee.monthlySalary)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Pencil size={14} />}
                      onClick={() => {
                        setEditing(employee);
                        setAmount(employee.monthlySalary?.toString() || '');
                        setError('');
                      }}
                    >
                      Modify salary
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
        maxWidth="xs"
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogTitle>Modify salary</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>{editing?.name}</Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              label="Monthly base salary"
              required
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 100000000, step: '.01' } }}
            />
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Save salary
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
