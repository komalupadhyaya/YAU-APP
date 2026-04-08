// coach-panel/src/hooks/useCoachData.js
import { useState, useEffect } from 'react';
import { getCoachRosters, getCoachSchedule } from '../firebase/coachFirestore';

export const useCoachData = (coachId) => {
  const [data, setData] = useState({
    rosters: [],
    schedule: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadCoachData = async () => {
      if (!coachId) {
        if (mounted) {
          setData(prev => ({ ...prev, loading: false }));
        }
        return;
      }

      try {
        if (mounted) {
          setData(prev => ({ ...prev, loading: true, error: null }));
        }

        const [rosters, schedule] = await Promise.all([
          getCoachRosters(coachId),
          getCoachSchedule(coachId)
        ]);

        if (mounted) {
          setData({
            rosters: rosters || [],
            schedule: schedule || [],
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error loading coach data:', error);
        if (mounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error.message
          }));
        }
      }
    };

    loadCoachData();

    return () => {
      mounted = false;
    };
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
        rosters: rosters || [],
        schedule: schedule || []
      }));
    } catch (error) {
      console.error('Error refreshing coach data:', error);
    }
  };

  return { ...data, refreshData };
};