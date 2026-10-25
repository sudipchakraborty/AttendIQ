import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { EmployeeReport } from './types';
import { money } from '../../shared/format';

export function SalarySummary({ report }: { report: EmployeeReport }) {
  return (
    <Box aria-label="Salary breakdown" sx={{ maxWidth: 580, ml: 'auto', mt: 3 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Total Salary
        </Typography>
        <Typography
          component="output"
          aria-label="Total salary"
          aria-live="polite"
          sx={{ ...{ fontVariantNumeric: 'tabular-nums' }, fontWeight: 650, fontSize: 19 }}
        >
          {money(report.totalSalary)}
        </Typography>
      </Stack>
      <Divider />
      {report.adjustments.map((item) => (
        <Box key={item.month} sx={{ py: 1 }}>
          {report.adjustments.length > 1 && (
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {item.month}
            </Typography>
          )}
          {[
            { label: 'Sunday', count: item.sundayCount, amount: item.sundayPay },
            { label: 'Leave', count: item.leaveCount, amount: item.leavePay },
          ].map((row) => (
            <Box
              aria-label={`${row.label} pay ${item.month}`}
              key={row.label}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 16px 22px minmax(85px, 1fr)',
                gap: { xs: 0.5, sm: 1.5 },
                alignItems: 'center',
                py: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.label}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {money(item.dailyRate)}
              </Typography>
              <Typography sx={{ ...{ fontSize: 12 }, color: 'text.secondary' }}>×</Typography>
              <Typography variant="body2">{row.count}</Typography>
              <Typography
                component="output"
                variant="body2"
                sx={{ textAlign: 'right', fontWeight: 600 }}
              >
                {money(row.amount)}
              </Typography>
            </Box>
          ))}
        </Box>
      ))}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
        >
          <Typography sx={{ fontSize: { xs: 12, sm: 14 }, fontWeight: 600 }}>
            Grand Total Salary
          </Typography>
          <Typography
            component="output"
            aria-label="Grand total salary"
            aria-live="polite"
            sx={{
              ...{
                ...{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-.04em' },
                fontWeight: 700,
                fontSize: { xs: 21, sm: 26 },
              },
              color: 'primary.main',
            }}
          >
            {money(report.grandTotalSalary)}
          </Typography>
        </Stack>
      </Paper>
      <Typography
        variant="caption"
        sx={{ ...{ textAlign: 'right', display: 'block', mt: 1.5 }, color: 'text.secondary' }}
      >
        Sunday and holiday pay are added at monthly base / calendar days, rounded to two decimals.
        Leave means configured holidays. Sunday holidays count once.
      </Typography>
    </Box>
  );
}
