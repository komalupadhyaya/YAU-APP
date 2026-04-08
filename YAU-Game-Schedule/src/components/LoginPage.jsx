// game-schedule\src\components\LoginPage.jsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Link,
  CircularProgress,
  Switch,
  FormGroup,
  useTheme,
} from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import logo from '../assets/vblogo.png';

const LoginPage = ({ onLogin, toggleTheme }) => {
  const [formData, setFormData] = useState({
    email: 'secdamngood@gmail.com',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (formData.email !== 'secdamngood@gmail.com' || formData.password !== '123123') {
        setErrors({ submit: 'Login failed. Please try again.' });
        return;
      }
      onLogin();
    } catch (error) {
      setErrors({ submit: 'Login failed. Please try again.' });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.gradient?.primary || `linear-gradient(135deg, #22c55e 0%, #0ea5e9 50%, #8b5cf6 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Card
        sx={{
          width: 440,
          borderRadius: 3,
          boxShadow: theme.shadows[5],
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ p: 5 }}>
          {/* Logo & Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src={logo}
              alt="VB Logo"
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: `3px solid ${theme.palette.secondary.main}`,
                margin:'auto',
                mb: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                objectFit: 'cover',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: theme.palette.gradient?.primary || `linear-gradient(135deg, #22c55e 0%, #0ea5e9 50%, #8b5cf6 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Game Schedule
            </Typography>
            <Typography color="text.secondary">
              Welcome back! Please sign in to your account.
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              placeholder="Enter your email"
              sx={{ mb: 3 }}
              InputProps={{ sx: { borderRadius: 2 } }}
              disabled={isLoading}
              autoFocus
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              placeholder="Enter your password"
              sx={{ mb: 2 }}
              InputProps={{ sx: { borderRadius: 2 } }}
              disabled={isLoading}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    disabled={isLoading}
                    sx={{
                      color: theme.palette.primary.main,
                      '&.Mui-checked': {
                        color: theme.palette.primary.main,
                      },
                    }}
                  />
                }
                label="Remember me"
                sx={{ color: 'text.secondary' }}
              />
              <Link
                href="#"
                variant="body2"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.dark' },
                }}
              >
                Forgot password?
              </Link>
            </Box>

            {errors.submit && (
              <Typography
                color="error"
                variant="body2"
                sx={{
                  mb: 3,
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.error.light,
                  color: theme.palette.error.dark,
                  textAlign: 'center',
                }}
              >
                {errors.submit}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{
                py: 1.8,
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 6px 14px rgba(34, 197, 94, 0.4)',
                },
              }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white', justifyContent: 'center' }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  Signing in...
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          {/* Signup Link */}
          {/* <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                href="#"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.dark' },
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box> */}

          {/* Theme Toggle */}
          {/* <FormGroup sx={{ mt: 4, justifyContent: 'center', display: 'flex' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={theme.palette.mode === 'dark'}
                  onChange={toggleTheme}
                  icon={<LightMode sx={{ fontSize: 18 }} />}
                  checkedIcon={<DarkMode sx={{ fontSize: 18 }} />}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary" sx={{ userSelect: 'none' }}>
                  {theme.palette.mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Typography>
              }
            />
          </FormGroup> */}
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
