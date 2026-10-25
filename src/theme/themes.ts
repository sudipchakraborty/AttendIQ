import { alpha, createTheme } from '@mui/material/styles';
import type { ThemeId } from './preferences';

export const themeOptions: { id: ThemeId; name: string; description: string; swatch: string }[] = [
  {
    id: 'pearl',
    name: 'Pearl Light',
    description: 'Warm whites & forest accents',
    swatch: '#1c6b59',
  },
  {
    id: 'graphite',
    name: 'Graphite Dark',
    description: 'Soft charcoal & fresh mint',
    swatch: '#88dbb5',
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep navy & periwinkle',
    swatch: '#a9b8ff',
  },
];

export function createAppTheme(id: ThemeId) {
  const dark = id !== 'pearl';
  const midnight = id === 'midnight';
  const primary = midnight ? '#a9b8ff' : dark ? '#88dbb5' : '#1c6b59';
  const paper = midnight ? '#141d36' : dark ? '#1b2027' : '#ffffff';
  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: primary, contrastText: dark ? '#0c1522' : '#ffffff' },
      secondary: { main: midnight ? '#c2a7ef' : dark ? '#a7bcce' : '#6c7f94' },
      background: { default: midnight ? '#0c1225' : dark ? '#11161c' : '#f4f6f7', paper },
      text: {
        primary: midnight ? '#edf0ff' : dark ? '#edf2f5' : '#1c3038',
        secondary: dark ? '#a9b5c7' : '#657880',
      },
      divider: dark ? '#ffffff14' : '#243d4814',
      success: { main: dark ? '#88dbb5' : '#237452' },
      warning: { main: dark ? '#f3c47a' : '#936020' },
      error: { main: dark ? '#ffa5a5' : '#b14444' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
      h1: {
        fontSize: 'clamp(1.9rem, 3vw, 2.65rem)',
        fontWeight: 650,
        letterSpacing: '-.055em',
        lineHeight: 1.2,
      },
      h2: { fontSize: '1.2rem', fontWeight: 650, letterSpacing: '-.03em' },
      h3: { fontSize: '1.05rem', fontWeight: 650 },
      body1: { fontSize: '.875rem', lineHeight: 1.7 },
      body2: { fontSize: '.8rem', lineHeight: 1.65 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '.8rem' },
      overline: { fontSize: '.65rem', fontWeight: 650, letterSpacing: '.16em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: `radial-gradient(ellipse at 70% -10%, ${alpha(primary, dark ? 0.065 : 0.035)}, transparent 60%)`,
          },
          '*': { boxSizing: 'border-box' },
          '::selection': { background: alpha(primary, 0.25) },
          'input::-webkit-calendar-picker-indicator': { opacity: 0.65 },
          ':focus-visible': { outline: `3px solid ${alpha(primary, 0.65)}`, outlineOffset: 3 },
          '@media (prefers-reduced-motion: reduce)': {
            '*': {
              animationDuration: '0.01ms !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: dark ? '#ffffff14' : '#243d4814' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 9, padding: '10px 17px' } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 9, fontSize: '.83rem' },
          notchedOutline: { borderColor: dark ? '#ffffff26' : '#243d4829' },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 6, fontSize: '.67rem', fontWeight: 550 } },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10, fontSize: '.78rem' } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: dark ? '#ffffff14' : '#243d4814', fontSize: '.75rem' },
          head: {
            background: paper,
            fontWeight: 650,
            color: dark ? '#c1cde2' : '#49616a',
            fontSize: '.68rem',
          },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3 } } },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontSize: '.78rem',
            alignItems: 'flex-start',
            minHeight: 60,
          },
        },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
    },
  });
}
