import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Plus, X } from 'lucide-react';
import type { Holiday } from '../payroll/types';

export function HolidayEditor({
  holidays,
  onChange,
  mode,
  onMode,
  file,
  onFile,
}: {
  holidays: Holiday[];
  onChange: (rows: Holiday[]) => void;
  mode: 'manual' | 'file';
  onMode: (mode: 'manual' | 'file') => void;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const update = (index: number, field: keyof Holiday, value: string) =>
    onChange(holidays.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  return (
    <Box sx={{ mt: 3 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Monthly holidays
        </Typography>
        <ToggleButtonGroup
          size="small"
          value={mode}
          exclusive
          onChange={(_, value) => {
            if (value) onMode(value);
          }}
          aria-label="Holiday input mode"
        >
          <ToggleButton value="manual" sx={{ px: 1.5, fontSize: 11 }}>
            Enter dates
          </ToggleButton>
          <ToggleButton value="file" sx={{ px: 1.5, fontSize: 11 }}>
            From file
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {mode === 'manual' ? (
        <>
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small" aria-label="Monthly holidays">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '42%' }}>Date</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell sx={{ width: 35 }}>
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                      Remove
                    </span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holidays.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ p: 1 }}>
                      <TextField
                        type="date"
                        value={row.date}
                        required={Boolean(row.purpose?.trim())}
                        onChange={(event) => update(index, 'date', event.target.value)}
                        slotProps={{ htmlInput: { 'aria-label': `Holiday date ${index + 1}` } }}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1 }}>
                      <TextField
                        placeholder="e.g. Birthday"
                        value={row.purpose || ''}
                        onChange={(event) => update(index, 'purpose', event.target.value)}
                        slotProps={{ htmlInput: { 'aria-label': `Holiday purpose ${index + 1}` } }}
                      />
                    </TableCell>
                    <TableCell sx={{ px: 0.5 }}>
                      <IconButton
                        size="small"
                        aria-label={`Remove holiday row ${index + 1}`}
                        onClick={() => onChange(holidays.filter((_, i) => i !== index))}
                      >
                        <X size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ textAlign: 'right', mt: 0.75 }}>
            <Button
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => onChange([...holidays, { date: '', purpose: '' }])}
            >
              add row
            </Button>
          </Box>
        </>
      ) : (
        <Box>
          <Button component="label" variant="outlined" fullWidth>
            {file?.name || 'Choose holiday file'}
            <input
              hidden
              type="file"
              accept=".txt,.csv"
              aria-label="Holiday file"
              onChange={(event) => onFile(event.target.files?.[0] || null)}
            />
          </Button>
          <Typography
            variant="caption"
            sx={{ ...{ mt: 1, display: 'block' }, color: 'text.secondary' }}
          >
            TXT or CSV: YYYY-MM-DD, optional purpose; one holiday per line.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
