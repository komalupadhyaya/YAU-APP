
// src/App.jsx
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import GamesPage from './components/GamesPage';

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <GamesPage />
  </ThemeProvider>
);

export default App;
