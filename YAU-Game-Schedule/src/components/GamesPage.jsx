// src/components/GamesPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import AgeGroups from './AgeGroups';
import ScheduleTable from './ScheduleTable';
import { api } from '../services/api';
import HomePage from './HomePage';

const GamesPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHomepage, setShowHomepage] = useState(true);

  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [orgsResponse, schedulesResponse] = await Promise.all([
          api.getOrganizations(),
          api.getSchedules()
        ]);

        console.log('Organizations:', orgsResponse);
        console.log('SchedulesSchedules:Schedules::', schedulesResponse);

        if (orgsResponse.success) {
          setOrganizations(orgsResponse.data);
        }

        if (schedulesResponse.success) {
          setSchedules(schedulesResponse.data);
        } else {
          console.warn('Schedules API returned unsuccessful:', schedulesResponse);
          setSchedules([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const org = organizations.find((o) => o.name === selectedOrg);

  // Get available age groups for selected organization
// Get available age groups for selected organization from schedules
const getAvailableAgeGroups = () => {
  if (!selectedOrg || !schedules.length) return [];

  const ageGroupSet = new Set();

  schedules.forEach((schedule) => {
    const { team1, team2 } = schedule;

    // Check if this org appears in team1 or team2
    if (team1?.orgName === selectedOrg && team1.ageGroup) {
      const groups = Array.isArray(team1.ageGroup) ? team1.ageGroup : [team1.ageGroup];
      groups.forEach((g) => ageGroupSet.add(g));
    }

    if (team2?.orgName === selectedOrg && team2.ageGroup) {
      const groups = Array.isArray(team2.ageGroup) ? team2.ageGroup : [team2.ageGroup];
      groups.forEach((g) => ageGroupSet.add(g));
    }
  });

  // Return unique sorted age groups
  return Array.from(ageGroupSet).sort();
};


  // Get filtered schedules for table
  const getFilteredSchedules = () => {
    if (!selectedOrg || !selectedAgeGroup) return [];

    console.log('Filtering schedules for:', selectedOrg, selectedAgeGroup);
    console.log('All schedules:', schedules);

    const filtered = schedules.filter(schedule => {
      if (!schedule.team1 || !schedule.team2) return false;

      // Normalize to arrays (in case API returns string or array)
      const team1Ages = Array.isArray(schedule.team1.ageGroup)
        ? schedule.team1.ageGroup
        : [schedule.team1.ageGroup];
      const team2Ages = Array.isArray(schedule.team2.ageGroup)
        ? schedule.team2.ageGroup
        : [schedule.team2.ageGroup];

      const team1Match =
        schedule.team1.orgName === selectedOrg &&
        team1Ages.includes(selectedAgeGroup);

      const team2Match =
        schedule.team2.orgName === selectedOrg &&
        team2Ages.includes(selectedAgeGroup);

      return team1Match || team2Match;
    });

    console.log('Filtered schedules:', filtered);
    return filtered;
  };


  // Reset when organization changes
  const handleSelectOrg = (orgName) => {
    setSelectedOrg(orgName);
    setSelectedAgeGroup(null);
    setShowHomepage(false);
  };

  // Show homepage when ORGANIZATIONS header is clicked
  const handleShowHomepage = () => {
    setSelectedOrg(null);
    setSelectedAgeGroup(null);
    setShowHomepage(true);
  };

  // Handle age group selection
  const handleSelectAgeGroup = (ageGroup) => {
    setSelectedAgeGroup(ageGroup);
  };

  // Handle back navigation
  const handleBackToAgeGroups = () => {
    setSelectedAgeGroup(null);
  };

  const handleBackToHomepage = () => {
    setSelectedOrg(null);
    setSelectedAgeGroup(null);
    setShowHomepage(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar
        organizations={organizations}
        selectedOrg={selectedOrg}
        onSelectOrg={handleSelectOrg}
        onShowHomepage={handleShowHomepage}
        showHomepage={showHomepage}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isMobile={isMobile}
      />

      <Box sx={{ flex: 1, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        {/* Mobile AppBar */}
        {isMobile && (
          <AppBar
            position="fixed"
            color="primary"
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap>
                YAU TeamUp
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        <Box sx={{ mt: isMobile ? 8 : 0 }}>
          {showHomepage ? (
            // Show Homepage Component
            <HomePage />
          ) : !selectedOrg ? (
            // This shouldn't happen with the new flow, but as fallback
            <HomePage />
          ) : !selectedAgeGroup ? (
            // Show Age Groups for selected organization
            <AgeGroups
              org={org}
              ageGroups={getAvailableAgeGroups()}
              onSelectAgeGroup={handleSelectAgeGroup}
              onBack={handleBackToHomepage}
            />
          ) : (
            // Show Schedule Table for selected age group
            <ScheduleTable
              org={org}
              ageGroup={selectedAgeGroup}
              onBack={handleBackToAgeGroups}
              schedules={getFilteredSchedules()}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default GamesPage;