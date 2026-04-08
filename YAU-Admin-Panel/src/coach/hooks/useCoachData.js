// coach/hooks/useCoachData.js
import { useState, useEffect } from 'react';
import { getCoachRosters, getCoachSchedule } from '../../firebase/coachFirestore';

export const useCoachData = (coachId) => {
  const [data, setData] = useState({
    rosters: [],
    schedule: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const loadCoachData = async () => {
      if (!coachId) return;

      try {
        setData(prev => ({ ...prev, loading: true }));

        const [rosters, schedule] = await Promise.all([
          getCoachRosters(coachId),
          getCoachSchedule(coachId)
        ]);

        setData({
          rosters,
          schedule,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error loading coach data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    loadCoachData();
  }, [coachId]);

  const refreshData = async () => {
    if (!coachId) return;
    
    try {
      const [rosters, schedule] = await Promise.all([
        getCoachRosters(coachId),
        getCoachSchedule(coachId)
      ]);

      setData(prev => ({
        ...prev,
        rosters,
        schedule
      }));
    } catch (error) {
      console.error('Error refreshing coach data:', error);
    }
  };

  return { ...data, refreshData };
};