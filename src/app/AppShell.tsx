import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  Avatar,
  Button,
  Tooltip,
  Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Activity,
  LayoutDashboard,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  Users,
  Wallet,
  Mail,
  LogOut,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ThemePicker } from '../shared/ThemePicker';
import { useAuth } from '../features/auth/AuthProvider';
import { standalone } from './runtime';

export function AppShell({ children }: PropsWithChildren) {
  const path = useLocation().pathname;
  const report = path === '/report';
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState('');
  return (
    <Box sx={{ minHeight: '100vh', display: { xs: 'block', md: 'flex' } }}>
      <Box
        component="a"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 1600,
          transform: 'translateY(-150%)',
          '&:focus': { transform: 'none' },
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 1.5,
          borderRadius: 1,
          textDecoration: 'none',
        }}
      >
        Skip to content
      </Box>
      <Paper
        component="aside"
        square
        sx={{
          position: { xs: 'static', md: 'fixed' },
          width: { xs: '100%', md: 232 },
          height: { md: '100vh' },
          borderRight: { md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'column' },
          alignItems: { xs: 'center', md: 'stretch' },
          p: { xs: 2, md: 3 },
          gap: { xs: 2, md: 0 },
        }}
      >
        <Stack
          component={Link}
          to="/"
          direction="row"
          spacing={1.2}
          sx={{
            ...{ textDecoration: 'none', color: 'text.primary', mb: { md: 6 } },
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: 36,
              height: 38,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Activity size={23} />
          </Box>
          <Typography sx={{ fontSize: 23, fontWeight: 750, letterSpacing: '-1.2px' }}>
            Attend
            <Box component="span" sx={{ color: 'primary.main' }}>
              IQ
            </Box>
          </Typography>
        </Stack>
        <Typography
          variant="overline"
          sx={{
            ...{ display: { xs: 'none', md: 'block' }, px: 1.5, mb: 1.5 },
            color: 'text.secondary',
          }}
        >
          WORKSPACE
        </Typography>
        <Stack
          component="nav"
          aria-label="Main navigation"
          direction={{ xs: 'row', md: 'column' }}
          spacing={0.75}
          sx={{ ml: 0, width: '100%', flexWrap: { xs: 'wrap', md: 'nowrap' } }}
        >
          {[
            {
              name: 'Attendance',
              path: '/',
              icon: LayoutDashboard,
              active: path === '/',
              permission: 'reports.read',
            },
            {
              name: 'Reports',
              path: '/report',
              icon: FileSpreadsheet,
              active: report,
              permission: 'reports.read',
            },
            {
              name: 'Employees',
              path: '/employees',
              icon: Users,
              active: path === '/employees',
              permission: 'employees.write',
            },
            {
              name: 'Salaries',
              path: '/salaries',
              icon: Wallet,
              active: path === '/salaries',
              permission: 'salaries.write',
            },
            {
              name: 'Users & roles',
              path: '/users',
              icon: ShieldCheck,
              active: path === '/users',
              permission: 'users.manage',
            },
            {
              name: 'Support',
              path: '/support',
              icon: Mail,
              active: path === '/support',
              permission: 'support.send',
            },
          ]
            .filter((item) => auth.can(item.permission))
            .map((item) => (
              <Tooltip title={item.name} key={item.path}>
                <Button
                  component={Link}
                  to={item.path}
                  aria-label={item.name}
                  aria-current={item.active ? 'page' : undefined}
                  startIcon={<item.icon size={18} />}
                  sx={{
                    justifyContent: 'flex-start',
                    px: { xs: 1, md: 1.5 },
                    minWidth: 0,
                    color: item.active ? 'primary.main' : 'text.secondary',
                    background: (theme) =>
                      item.active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {item.name}
                  </Box>
                  {item.active && (
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        ml: 'auto',
                        display: { xs: 'none', md: 'block' },
                      }}
                    />
                  )}
                </Button>
              </Tooltip>
            ))}
        </Stack>
        <Box sx={{ mt: 'auto', display: { xs: 'none', md: 'block' } }}>
          <Box
            sx={{
              p: 2,
              mb: 3,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.055),
              borderRadius: 2.5,
            }}
          >
            <ShieldCheck size={20} />
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
              A little peace of mind.
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {standalone
                ? 'Your uploads stay in this browser tab. Refreshing clears them.'
                : 'Employee and salary records are saved securely on your server.'}
            </Typography>
          </Box>
          <Divider />
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mt: 2.5 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: 11,
                bgcolor: 'action.selected',
                color: 'text.secondary',
              }}
            >
              HR
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{auth.user?.name}</Typography>
              <Typography sx={{ ...{ fontSize: 10 }, color: 'text.secondary' }}>
                {standalone ? 'Local calculations' : auth.user?.role}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
      <Box sx={{ ml: { md: '232px' }, width: { md: 'calc(100% - 232px)' }, minWidth: 0 }}>
        <Box
          component="header"
          sx={{
            height: 76,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.85),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2.5, lg: 5 },
            gap: 1,
          }}
        >
          <Typography sx={{ ...{ fontSize: 12 }, color: 'text.secondary' }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, mr: 1 }}>
              Workspace /
            </Box>{' '}
            <Box component="span" sx={{ color: 'text.primary' }}>
              {(
                {
                  '/': 'Attendance management',
                  '/report': 'Salary reports',
                  '/employees': 'Employees',
                  '/salaries': 'Salary management',
                  '/users': 'Users & roles',
                  '/support': 'Support',
                } as Record<string, string>
              )[path] || 'Workspace'}
            </Box>
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    ml: '10px !important',
                  }}
                />
              }
              label={standalone ? 'Browser calculator' : auth.user?.role || 'Workspace'}
              size="small"
              variant="outlined"
              sx={{ display: { xs: 'none', lg: 'flex' } }}
            />
            <ThemePicker />
            {!standalone && (
              <Button
                size="small"
                aria-label="Sign out"
                disabled={auth.developmentBypass}
                startIcon={<LogOut size={15} />}
                onClick={async () => {
                  try {
                    await auth.logout();
                  } catch {
                    setLogoutError('Could not sign out. Please try again.');
                  }
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {auth.developmentBypass ? 'Development access' : 'Sign out'}
              </Button>
            )}
          </Stack>
        </Box>
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            maxWidth: 1500,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 5 },
            pt: { xs: 3, lg: 4.5 },
            pb: 3,
          }}
        >
          {logoutError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {logoutError}
            </Alert>
          )}
          {children}
          <Stack
            component="footer"
            direction="row"
            sx={{
              justifyContent: 'space-between',
              mt: 4,
              pt: 2.5,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              AttendIQ · A clearer view of your workday.
            </Typography>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Made for your people
              </Typography>
              <ArrowUpRight size={13} />
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
