// src/components/AgeGroups.jsx
import { Box, Card, CardActionArea, Typography, Button, Grid } from '@mui/material';
import React from 'react';
import { ArrowBack } from '@mui/icons-material';

const AgeGroups = ({ org, ageGroups, onSelectAgeGroup, onBack }) => {
  console.log("AgeGroups component - org:", org, "ageGroups:", ageGroups);

  if (!org || !ageGroups || ageGroups.length === 0) {
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
          Back to Home
        </Button>
        
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          No Age Groups Available
        </Typography>
        
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No age groups found for {org?.name}. This organization might not have any active divisions.
        </Typography>
      </Box>
    );
  }

  console.log("Agegroups",{
    ageGroups,org
  })

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
        Back to Home
      </Button>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Dashboard / {org.name}
      </Typography>

      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        {org.name}
      </Typography>
      
      <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
        Select an age group to view available sports and schedules
      </Typography>

      <Grid container spacing={3}>
        {ageGroups.map((ageGroup) => (
          <Grid item xs={12} sm={6} md={4} key={ageGroup}>
            <Card
              sx={{
                height: '100%',
                textAlign: 'center',
                borderRadius: 3,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                },
              }}
            >
              <CardActionArea 
                onClick={() => onSelectAgeGroup(ageGroup)}
                sx={{ height: '100%', p: 4 }}
              >
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  {ageGroup}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Age Group Division
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600 
                  }}
                >
                  View Sports & Schedules →
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Information */}
      <Box sx={{ mt: 6, p: 3, backgroundColor: 'background.default', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          About Age Groups & Grades
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Age groups ensure fair competition by grouping players of similar ages and skill levels. 
          Some organizations also use grade-based divisions for school-level competitions.
        </Typography>
        <Typography variant="body1">
          After selecting an age group or grade, you'll see all scheduled games and matches for that division.
        </Typography>
      </Box>
    </Box>
  );
};

export default AgeGroups;