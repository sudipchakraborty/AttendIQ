import { Component } from 'react';
import type { PropsWithChildren } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';

export class ErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 4, mt: 6 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Let’s reload your workspace.
        </Typography>
        <Alert severity="error">
          The page couldn’t be loaded. Reload to try again; selected files will need to be added
          again.
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Reload workspace
        </Button>
      </Box>
    );
  }
}
