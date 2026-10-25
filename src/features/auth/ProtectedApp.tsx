import type { PropsWithChildren } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedApp({ children }: PropsWithChildren) {
  const auth = useAuth(),
    location = useLocation();
  if (auth.loading)
    return (
      <Box role="status" sx={{ p: 5, textAlign: 'center' }}>
        <CircularProgress size={25} />
      </Box>
    );
  if (!auth.user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
export function Permission({ permission, children }: PropsWithChildren<{ permission: string }>) {
  const auth = useAuth();
  return auth.can(permission) ? (
    children
  ) : (
    <Alert severity="warning">Your role does not have access to this page.</Alert>
  );
}
