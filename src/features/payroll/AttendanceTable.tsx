import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { AttendanceRow } from './types';
import { displayDate, money } from '../../shared/format';

export function AttendanceTable({ rows, name }: { rows: AttendanceRow[]; name: string }) {
  return (
    <TableContainer
      tabIndex={0}
      aria-label={`Attendance table for ${name}`}
      sx={{
        maxHeight: 520,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        '&:focus-visible': { outlineOffset: 2 },
      }}
    >
      <Table
        stickyHeader
        size="small"
        sx={{ minWidth: 890 }}
        aria-label={`Salary and attendance for ${name}`}
      >
        <TableHead>
          <TableRow>
            {[
              'Date',
              'Name',
              'Start Time',
              'Tiffin Time Entry',
              'Tiffin Time Exit',
              'Exit Time',
              'Total Working Hours',
              'Earned Salary',
            ].map((label) => (
              <TableCell
                key={label}
                sx={{ py: 1.7, whiteSpace: label === 'Date' ? 'nowrap' : undefined }}
              >
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.date}
              hover
              sx={{
                bgcolor: (theme) =>
                  row.status === 'Incomplete punches'
                    ? alpha(theme.palette.warning.main, 0.075)
                    : undefined,
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              <TableCell sx={{ minWidth: 125, verticalAlign: 'top' }}>
                {displayDate(row.date)}
                <Box sx={{ mt: 0.6 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      ...{ fontSize: 9, lineHeight: 1.3, display: 'block' },
                      color:
                        row.status === 'Incomplete punches' ? 'warning.main' : 'text.secondary',
                    }}
                  >
                    {row.status}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 115, verticalAlign: 'top' }}>{row.name}</TableCell>
              {[row.start, row.tiffinEntry].map((time, index) => (
                <TableCell
                  key={index}
                  sx={{ verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}
                >
                  <Typography
                    component="span"
                    sx={{ ...{ fontSize: 12 }, color: time ? 'text.primary' : 'text.disabled' }}
                  >
                    {time || 'Not recorded'}
                  </Typography>
                </TableCell>
              ))}
              <TableCell sx={{ verticalAlign: 'top' }}>
                <Typography
                  sx={{
                    ...{ fontSize: 12 },
                    color: row.tiffinExit ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {row.tiffinExit || 'Not recorded'}
                </Typography>
                {row.tiffinDuration && (
                  <Typography sx={{ ...{ fontSize: 9 }, color: 'text.secondary' }}>
                    Break: {row.tiffinDuration}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ verticalAlign: 'top' }}>
                <Typography
                  sx={{ ...{ fontSize: 12 }, color: row.exit ? 'text.primary' : 'text.disabled' }}
                >
                  {row.exit || 'Not recorded'}
                </Typography>
              </TableCell>
              <TableCell sx={{ verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                {row.hours || (
                  <Typography component="span" sx={{ ...{ fontSize: 12 }, color: 'text.disabled' }}>
                    Not recorded
                  </Typography>
                )}
                {(row.punches.length > 4 || row.status === 'Incomplete punches') && (
                  <Box
                    component="details"
                    sx={{ fontSize: 10, mt: 1, maxWidth: 140, color: 'text.secondary' }}
                  >
                    <Box component="summary" sx={{ cursor: 'pointer', color: 'primary.main' }}>
                      All punches
                    </Box>
                    {row.punches.join(' / ')}
                  </Box>
                )}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  verticalAlign: 'top',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {money(row.salary)}
                {row.status === 'Incomplete punches' && (
                  <Box sx={{ mt: 0.75 }}>
                    <Chip
                      label="Review"
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ height: 18, fontSize: 9 }}
                    />
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
