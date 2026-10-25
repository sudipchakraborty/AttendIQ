import { useState } from 'react';
import {
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { Check, Palette, ChevronDown } from 'lucide-react';
import { themeOptions } from '../theme/themes';
import { useAppTheme } from '../theme/ThemeProvider';

export function ThemePicker() {
  const { id, setId } = useAppTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        aria-label="Choose theme"
        aria-controls={anchor ? 'theme-menu' : undefined}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<Palette size={16} />}
        endIcon={<ChevronDown size={13} />}
        sx={{ borderColor: 'divider', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {themeOptions.find((option) => option.id === id)?.name}
        </Box>
        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
          Theme
        </Box>
      </Button>
      <Menu
        id="theme-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: { sx: { minWidth: 270, mt: 1, border: 1, borderColor: 'divider', p: 0.5 } },
        }}
      >
        <Typography
          component="li"
          variant="overline"
          sx={{ ...{ px: 2, py: 1, listStyle: 'none' }, color: 'text.secondary' }}
        >
          MAKE IT YOUR WORKSPACE
        </Typography>
        {themeOptions.map((option) => (
          <MenuItem
            key={option.id}
            selected={id === option.id}
            onClick={() => {
              setId(option.id);
              setAnchor(null);
            }}
            sx={{ borderRadius: 1.5, py: 1.5 }}
          >
            <ListItemIcon>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: option.swatch,
                  border: '3px solid',
                  borderColor: 'divider',
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={option.name}
              secondary={option.description}
              slotProps={{
                primary: { sx: { fontSize: 13, fontWeight: 600 } },
                secondary: { sx: { fontSize: 11 } },
              }}
            />
            <Stack sx={{ ml: 2 }}>{id === option.id && <Check size={16} />}</Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
