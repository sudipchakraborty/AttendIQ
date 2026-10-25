import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Mail, Send } from 'lucide-react';
import { SectionCard } from '../../shared/SectionCard';
import { api } from '../../shared/api';
import { errorMessage } from '../../shared/format';
import { useAuth } from '../auth/AuthProvider';

export default function SupportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  return (
    <Box sx={{ maxWidth: 780 }}>
      <Typography variant="overline" color="primary">
        WE’RE HERE TO HELP
      </Typography>
      <Typography variant="h1" sx={{ mt: 1 }}>
        A little help goes a long way.
      </Typography>
      <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
        Send your question to info@niyanti.com. Replies go to {user?.email}.
      </Typography>
      <SectionCard
        title="Contact support"
        subtitle="Tell us what happened and how we can help."
        icon={<Mail size={20} />}
      >
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
        <Box
          component="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            setNotice('');
            try {
              const result = await api<{ ticketId: string; message: string }>('/support', 'POST', {
                subject,
                message,
              });
              setNotice(`${result.message} Ticket: ${result.ticketId}`);
              setSubject('');
              setMessage('');
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Stack spacing={2.5}>
            <TextField
              label="Subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 160 } }}
            />
            <TextField
              label="Message"
              required
              multiline
              minRows={7}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              slotProps={{ htmlInput: { minLength: 10, maxLength: 10000 } }}
              helperText="Include enough detail to investigate. Do not include passwords or private salary exports."
            />
            <Button
              variant="contained"
              type="submit"
              disabled={busy}
              startIcon={<Send size={16} />}
              sx={{ alignSelf: 'flex-end' }}
            >
              {busy ? 'Sending…' : 'Submit request'}
            </Button>
          </Stack>
        </Box>
      </SectionCard>
    </Box>
  );
}
