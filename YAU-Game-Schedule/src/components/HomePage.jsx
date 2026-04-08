// src/components/HomePage.jsx
import { Box, Card, CardActionArea, Typography, Grid, Button } from '@mui/material';
import React from 'react';

import flagFootballImage from '../assets/images/image.png';
import soccerImage from '../assets/images/soccer.png';
import basketballImage from '../assets/images/basketball.png';

const HomePage = () => {

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Welcome to YAU Game Day Schedule
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        Select your child's sport for  to view their team and game schedule.
      </Typography>

      {/* Additional Sports Cards with Images like the example */}
      <Box sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {/* Flag Football Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img 
                  src={flagFootballImage} 
                  alt="Flag Football"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))',
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 16,
                    color: 'white',
                    fontWeight: 600,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                  }}
                >
                  Flag Football
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    variant="contained" 
                    size="small"
                    // onClick={() => onSelectSport('Flag_football')}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    View Flag Football
                  </Button>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Soccer Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img 
                  src={soccerImage} 
                  alt="Soccer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))',
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 16,
                    color: 'white',
                    fontWeight: 600,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                  }}
                >
                  Soccer
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    variant="contained" 
                    size="small"
                    // onClick={() => onSelectSport('Soccer')}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    View Soccer Schedule
                  </Button>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Basketball Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img 
                  src={basketballImage} 
                  alt="Basketball"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))',
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 16,
                    color: 'white',
                    fontWeight: 600,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                  }}
                >
                  Basketball
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    variant="contained" 
                    size="small"
                    // onClick={() => onSelectSport('Basketball')}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    View Basketball Schedule
                  </Button>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* How to Use Guide */}
      <Box sx={{ mt: 6, p: 3, backgroundColor: 'background.default', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          How to Use This Page
        </Typography>
        <Box component="ol" sx={{ pl: 2 }}>
          <Typography component="li" variant="body1" sx={{ mb: 1 }}>
            <strong>Select your child's sport</strong> from the options above
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 1 }}>
            <strong>Choose your child's age group</strong> from the available divisions
          </Typography>
          <Typography component="li" variant="body1">
            <strong>View practice times, game schedules, and locations</strong>
          </Typography>
        </Box>
      </Box>

      {/* Quick Access Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card 
          sx={{ 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>📅</Typography>
            <Typography variant="body2" fontWeight={500}>
              Full Game Calendar
            </Typography>
          </Box>
        </Card>
        
        <Card 
          sx={{ 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>📍</Typography>
            <Typography variant="body2" fontWeight={500}>
              Game Day Locations
            </Typography>
          </Box>
        </Card>
        
        <Card 
          sx={{ 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>👤</Typography>
            <Typography variant="body2" fontWeight={500}>
              Parent Resources
            </Typography>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default HomePage;