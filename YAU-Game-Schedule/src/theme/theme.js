// // game-schedule\src\theme\theme.js
// import { createTheme } from '@mui/material/styles';

// export const lightTheme = createTheme({
//   palette: {
//     mode: 'light',
//     primary: {
//       main: '#0ea5e9',
//       light: '#38bdf8',
//       dark: '#0284c7',
//       contrastText: '#ffffff',
//     },
//     secondary: {
//       main: '#3b82f6',
//       light: '#60a5fa',
//       dark: '#1d4ed8',
//     },
//     background: {
//       default: '#f9fafb',
//       paper: '#ffffff',
//       sidebar: '#f3f4f6',
//     },
//     text: {
//       primary: '#111827',
//       secondary: '#4b5563',
//     },
//     gradient: {
//       primary: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
//       sidebar: 'linear-gradient(180deg, #1d4ed8 0%, #0ea5e9 100%)',
//       card: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)',
//     },
//   },
//   typography: {
//     fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
//     h4: {
//       fontWeight: 600,
//       color: '#111827',
//     },
//     h6: {
//       fontWeight: 600,
//     },
//   },
//   components: {
//     MuiAppBar: {
//       styleOverrides: {
//         root: {
//           backgroundColor: '#ffffff',
//           color: '#111827',
//           boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
//         },
//       },
//     },
//     MuiCard: {
//       styleOverrides: {
//         root: {
//           borderRadius: 12,
//           boxShadow:
//             '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
//           border: '1px solid #e5e7eb',
//         },
//       },
//     },
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           borderRadius: 8,
//           textTransform: 'uppercase',
//           fontWeight: 500,
//           transition: 'all 0.3s ease',
//         },
//         containedPrimary: {
//           background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
//           color: '#ffffff',
//           '&:hover': {
//             background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
//             transform: 'translateY(-2px)',
//             boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
//           },
//         },
//       },
//     },
//   },
// });

// export const darkTheme = createTheme({
//   palette: {
//     mode: 'dark',
//     primary: {
//       main: '#3b82f6',
//       light: '#60a5fa',
//       dark: '#1d4ed8',
//       contrastText: '#ffffff',
//     },
//     secondary: {
//       main: '#0ea5e9',
//       light: '#38bdf8',
//       dark: '#0284c7',
//     },
//     background: {
//       default: '#0f0f10',
//       paper: '#1f2937',
//       sidebar: '#111827',
//     },
//     text: {
//       primary: '#f9fafb',
//       secondary: '#9ca3af',
//     },
//     gradient: {
//       primary: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
//       sidebar: 'linear-gradient(180deg, #1e3a8a 0%, #0369a1 100%)',
//       card: 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)',
//     },
//   },
//   typography: {
//     fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
//     h4: {
//       fontWeight: 600,
//       color: '#f9fafb',
//     },
//     h6: {
//       fontWeight: 600,
//     },
//   },
//   components: {
//     MuiAppBar: {
//       styleOverrides: {
//         root: {
//           backgroundColor: '#1f2937',
//           color: '#f9fafb',
//           boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
//         },
//       },
//     },
//     MuiCard: {
//       styleOverrides: {
//         root: {
//           borderRadius: 12,
//           boxShadow:
//             '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
//           border: '1px solid #374151',
//         },
//       },
//     },
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           borderRadius: 8,
//           textTransform: 'uppercase',
//           fontWeight: 500,
//           transition: 'all 0.3s ease',
//         },
//         containedPrimary: {
//           background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
//           color: '#ffffff',
//           '&:hover': {
//             background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
//             transform: 'translateY(-2px)',
//             boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
//           },
//         },
//       },
//     },
//   },
// });





// import { createTheme } from '@mui/material/styles';

// export const lightTheme = createTheme({
//   palette: {
//     mode: 'light',
//     primary: {
//       main: '#2563eb', // blue-600
//       light: '#3b82f6', // blue-500
//       dark: '#1e40af', // blue-800
//       contrastText: '#ffffff',
//     },
//     secondary: {
//       main: '#9333ea', // purple-600
//       light: '#a855f7', // purple-500
//       dark: '#7e22ce', // purple-700
//     },
//     background: {
//       default: '#f9fafb', // gray-50
//       paper: '#ffffff',
//       sidebar: '#f3f4f6', // gray-100
//     },
//     text: {
//       primary: '#111827', // gray-900
//       secondary: '#4b5563', // gray-600
//     },
//     gradient: {
//       primary: 'linear-gradient(to right, #2563eb, #9333ea)',
//       sidebar: 'linear-gradient(to right, #2563eb, #9333ea)',
//       card: 'linear-gradient(to right, #eff6ff, #f5f3ff)', // blue-50 → purple-50
//     },
//   },
//   typography: {
//     fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
//     h4: {
//       fontWeight: 600,
//       color: '#111827',
//     },
//     h6: {
//       fontWeight: 600,
//     },
//   },
//   components: {
//     MuiAppBar: {
//       styleOverrides: {
//         root: {
//           backgroundColor: '#ffffff',
//           color: '#111827',
//           boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
//         },
//       },
//     },
//     MuiCard: {
//       styleOverrides: {
//         root: {
//           borderRadius: 12,
//           boxShadow:
//             '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
//           border: '1px solid #e5e7eb',
//           backgroundImage: 'linear-gradient(to right, #eff6ff, #f5f3ff)',
//         },
//       },
//     },
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           borderRadius: 8,
//           textTransform: 'uppercase',
//           fontWeight: 500,
//           transition: 'all 0.3s ease',
//         },
//         containedPrimary: {
//           background: 'linear-gradient(to right, #2563eb, #9333ea)',
//           color: '#ffffff',
//           '&:hover': {
//             background: 'linear-gradient(to right, #1d4ed8, #7e22ce)',
//             transform: 'translateY(-2px)',
//             boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
//           },
//         },
//       },
//     },
//   },
// });

// export const darkTheme = createTheme({
//   palette: {
//     mode: 'dark',
//     primary: {
//       main: '#2563eb',
//       light: '#3b82f6',
//       dark: '#1e40af',
//       contrastText: '#ffffff',
//     },
//     secondary: {
//       main: '#9333ea',
//       light: '#a855f7',
//       dark: '#7e22ce',
//     },
//     background: {
//       default: '#0f0f10',
//       paper: '#1f2937', // gray-800
//       sidebar: '#111827', // gray-900
//     },
//     text: {
//       primary: '#f9fafb',
//       secondary: '#9ca3af',
//     },
//     gradient: {
//       primary: 'linear-gradient(to right, #2563eb, #9333ea)',
//       sidebar: 'linear-gradient(to right, #1e3a8a, #6b21a8)', // darker blue→purple
//       card: 'linear-gradient(to right, #1e293b, #312e81)', // gray-blue→indigo
//     },
//   },
//   typography: {
//     fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
//     h4: {
//       fontWeight: 600,
//       color: '#f9fafb',
//     },
//     h6: {
//       fontWeight: 600,
//     },
//   },
//   components: {
//     MuiAppBar: {
//       styleOverrides: {
//         root: {
//           backgroundColor: '#1f2937',
//           color: '#f9fafb',
//           boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.2)',
//         },
//       },
//     },
//     MuiCard: {
//       styleOverrides: {
//         root: {
//           borderRadius: 12,
//           border: '1px solid #374151',
//           backgroundImage: 'linear-gradient(to right, #1e293b, #312e81)',
//           boxShadow:
//             '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
//         },
//       },
//     },
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           borderRadius: 8,
//           textTransform: 'uppercase',
//           fontWeight: 500,
//           transition: 'all 0.3s ease',
//         },
//         containedPrimary: {
//           background: 'linear-gradient(to right, #2563eb, #9333ea)',
//           color: '#ffffff',
//           '&:hover': {
//             background: 'linear-gradient(to right, #1d4ed8, #7e22ce)',
//             transform: 'translateY(-2px)',
//             boxShadow: '0 4px 12px rgba(147, 51, 234, 0.4)',
//           },
//         },
//       },
//     },
//   },
// });

















// src/theme/theme.js
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // blue-600
      light: '#3b82f6',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
      sidebar: '#1e3a8a',
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 500 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});
