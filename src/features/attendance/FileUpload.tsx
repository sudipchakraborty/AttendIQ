import { useRef } from 'react';
import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { UploadCloud, FileText, X } from 'lucide-react';

export function FileUpload({
  title,
  description,
  file,
  onChange,
  fallback,
}: {
  title: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
  fallback: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Chip label="Optional override" size="small" sx={{ height: 21 }} />
      </Stack>
      <Box
        sx={{
          border: '1px dashed',
          borderColor: file ? 'primary.main' : 'divider',
          bgcolor: (theme) => alpha(theme.palette.primary.main, file ? 0.06 : 0.018),
          borderRadius: 2.5,
          p: 2.5,
          minHeight: 205,
          position: 'relative',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input
          ref={input}
          type="file"
          accept=".txt"
          aria-label={title}
          style={{ display: 'none' }}
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
        {file && (
          <IconButton
            aria-label={`Clear ${title}`}
            size="small"
            onClick={() => {
              onChange(null);
              if (input.current) input.current.value = '';
            }}
            sx={{ position: 'absolute', right: 5, top: 5 }}
          >
            <X size={14} />
          </IconButton>
        )}
        <Box sx={{ color: 'primary.main', mb: 1.5 }}>
          {file ? <FileText size={26} /> : <UploadCloud size={26} />}
        </Box>
        <Typography variant="body2" sx={{ ...{ overflowWrap: 'anywhere' }, fontWeight: 600 }}>
          {file?.name || description}
        </Typography>
        <Typography variant="caption" sx={{ ...{ mt: 0.5 }, color: 'text.secondary' }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'Use your own text export'}
        </Typography>
        <Button size="small" onClick={() => input.current?.click()} sx={{ mt: 1 }}>
          {file ? 'Replace file' : 'Browse files'}
        </Button>
      </Box>
      <Typography
        variant="caption"
        sx={{ ...{ display: 'block', mt: 1 }, color: 'text.secondary' }}
      >
        Default: {fallback}
      </Typography>
    </Box>
  );
}
