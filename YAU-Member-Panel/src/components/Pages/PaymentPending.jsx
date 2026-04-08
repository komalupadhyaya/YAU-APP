import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Box, 
  Button, 
  Card, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Alert,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Payment,
  AccountCircle,
  ExitToApp,
  Group,
  Event,
  ShoppingCart,
  Security,
  SupportAgent
} from '@mui/icons-material';

function PaymentPending() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCompletePayment = () => {
    const hasPendingRegistration = sessionStorage.getItem("pendingRegistration");
    
    if (hasPendingRegistration) {
      try {
        const registrationData = JSON.parse(hasPendingRegistration);
        const planParam = registrationData.selectedPlan || "monthly";
        const email = encodeURIComponent(registrationData.userEmail || user.email);
        navigate(`/checkout?plan=${planParam}&email=${email}`);
      } catch (error) {
        sessionStorage.removeItem("pendingRegistration");
        navigate('/register');
      }
    } else {
      navigate(`/checkout?plan=monthly&email=${encodeURIComponent(user.email)}`);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error during account switch:', error);
    }
  };

  const benefits = [
    { icon: <Group />, text: 'Full Team Access' },
    { icon: <Event />, text: 'Game Schedules' },
    { icon: <ShoppingCart />, text: 'Uniform Ordering' },
    { icon: <Security />, text: 'Secure Child ID' },
    { icon: <SupportAgent />, text: 'Priority Support' }
  ];

  return (
    <Box sx={{ 
      p: isMobile ? 2 : 3, 
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Box sx={{ 
        maxWidth: 800, 
        width: '100%' 
      }}>
        {/* Header */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 3 
        }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main', 
              mb: 1,
              fontSize: isMobile ? '1.75rem' : '2.125rem'
            }}
          >
            Payment Required
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ color: 'text.secondary' }}
          >
            Complete your payment to access all features
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Main Action Card */}
          <Grid item xs={12} md={7}>
            <Card sx={{ 
              p: 3, 
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2 
              }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  backgroundColor: 'warning.light', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <Payment sx={{ fontSize: 24, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                    Membership Payment
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Complete payment to activate your account
                  </Typography>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mb: 2, fontSize: '0.875rem' }}>
                Registration successful. Payment required to activate membership.
              </Alert>

              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                flexDirection: isMobile ? 'column' : 'row',
                mt: 'auto'
              }}>
                <Button
                  variant="contained"
                  fullWidth={isMobile}
                  onClick={handleCompletePayment}
                  sx={{ 
                    borderRadius: 1,
                    fontWeight: 'bold',
                    py: 1
                  }}
                >
                  Complete Payment
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={handleSwitchAccount}
                  startIcon={<ExitToApp />}
                  sx={{ 
                    borderRadius: 1,
                    py: 1
                  }}
                >
                  Switch Account
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* Benefits Card */}
          <Grid item xs={12} md={5}>
            <Card sx={{ 
              p: 2, 
              borderRadius: 2,
              height: '100%'
            }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
                Membership Benefits
              </Typography>
              
              <List dense sx={{ py: 0 }}>
                {benefits.map((benefit, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {benefit.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={benefit.text} 
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

          {/* Account Info Card */}
          <Grid item xs={12}>
            <Card sx={{ 
              p: 2, 
              borderRadius: 2 
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 1
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  flexGrow: 1 
                }}>
                  <AccountCircle sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="body2">
                    Logged in as: <strong>{user?.email}</strong>
                  </Typography>
                </Box>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={handleSwitchAccount}
                  startIcon={<ExitToApp />}
                  sx={{ borderRadius: 1 }}
                >
                  Switch Account
                </Button>
              </Box>
              
              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                Switching accounts will log you out and clear all stored data.
              </Alert>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default PaymentPending;