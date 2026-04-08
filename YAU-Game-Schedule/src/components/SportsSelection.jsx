// src/components/SportsSelection.jsx
import { Box, Card, CardActionArea, Typography, Grid, Button } from '@mui/material';
import React from 'react';
import { ArrowBack } from '@mui/icons-material';

// Sport icons or images (you can replace these with actual images)
const sportImages = {
  Soccer: '⚽',
  Basketball: '🏀',
  Flag_football: '🏈',
  Kickball: '👟',
  Cheer: '📣'
};

const SportsSelection = ({ org, ageGroup, sports, onSelectSport, onBack }) => {
  if (!org || !sports || sports.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{ 
            mb: 2,
            textTransform: 'none',
            color: 'text.secondary'
          }}
        >
          Back to Age Groups
        </Button>
        
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          No Sports Available
        </Typography>
        
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No sports found for {org?.name} in the {ageGroup} age group.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Back Button and Breadcrumb */}
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{ 
          mb: 2,
          textTransform: 'none',
          color: 'text.secondary'
        }}
      >
        Back to Age Groups
      </Button>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Dashboard / {org.name} / {ageGroup}
      </Typography>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Select Sport
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        Choose a sport for <strong>{ageGroup}</strong> in <strong>{org.name}</strong> to view the game schedule.
      </Typography>

      {/* Sports Grid */}
      <Grid container spacing={3}>
        {sports.map((sport) => (
          <Grid item xs={12} sm={6} md={4} key={sport}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 3,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                },
              }}
            >
              <CardActionArea 
                onClick={() => onSelectSport(sport)}
                sx={{ height: '100%', p: 3 }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontSize: '4rem', 
                      mb: 2,
                      lineHeight: 1
                    }}
                  >
                    {sportImages[sport] || '🏆'}
                  </Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 600,
                      mb: 1 
                    }}
                  >
                    {sport.replace('_', ' ')}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {ageGroup} Division
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 600 
                    }}
                  >
                    View {sport.replace('_', ' ')} Schedule →
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

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
            <strong>View the complete game schedule</strong> including dates, times, and locations
          </Typography>
          <Typography component="li" variant="body1">
            <strong>Track your child's games and practices</strong> throughout the season
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SportsSelection;