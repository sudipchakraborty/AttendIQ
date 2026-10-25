import type { PropsWithChildren, ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
}: PropsWithChildren<{ title: string; subtitle: string; icon: ReactNode; action?: ReactNode }>) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
        <Box
          sx={{
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.09),
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3">{title}</Typography>
          <Typography variant="body2" sx={{ ...{ mt: 0.25 }, color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
