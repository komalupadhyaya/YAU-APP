import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import StatCard from '../common/StatCard';
import Table, { TableRow, TableCell } from '../common/Table';
import {  getCoaches, getRosters } from '../../firebase/firestore';
import { getMembers } from '../../firebase/apis/api-parents';
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalParents: 0,
    totalChildren: 0,
    totalCoaches: 0,
    totalRosters: 0,
    activeRosters: 0,
    needCoachRosters: 0,
    needPlayersRosters: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []); // eslint-disable-line

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [parentsData, coachesData, rostersData] = await Promise.all([
        getMembers(),
        getCoaches(),
        getRosters()
      ]);

      // Calculate basic stats
      const totalParents = parentsData.length;
      const totalChildren = parentsData.reduce((total, parentItem) => {
        return total + (parentItem.students ? parentItem.students.length : 0);
      }, 0);
      const validCoaches = coachesData.filter(coachItem => coachItem.role === 'coach');
      const totalCoaches = validCoaches.length;

      // Calculate roster stats from Firestore data
      const totalRosters = rostersData.length;
      const activeRosters = rostersData.filter(r => r.status === 'active').length;
      const needCoachRosters = rostersData.filter(r => r.status === 'needs-coach').length;
      const needPlayersRosters = rostersData.filter(r => r.status === 'needs-players').length;

      console.log('📊 Dashboard Roster Stats:', {
        totalRosters,
        activeRosters,
        needCoachRosters,
        needPlayersRosters
      });

      setStats({
        totalParents,
        totalChildren,
        totalCoaches,
        totalRosters,
        activeRosters,
        needCoachRosters,
        needPlayersRosters
      });

      // Generate recent activity from actual data
      const activities = generateRecentActivity(parentsData, coachesData);
      setRecentActivity(activities);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivity = (parents, coaches) => {
    const activities = [];

    // Recent parent registrations
    const recentParents = parents
      .filter(parentItem => parentItem.createdAt)
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      })
      .slice(0, 3);

    recentParents.forEach(parentItem => {
      const createdDate = parentItem.createdAt?.toDate ? parentItem.createdAt.toDate() : new Date(parentItem.createdAt);
      activities.push({
        id: `parent-${parentItem.id}`,
        activity: `New parent registration`,
        user: `${parentItem.firstName} ${parentItem.lastName}`,
        time: formatTimeAgo(createdDate),
        status: 'completed',
        type: 'registration'
      });

      // Add students registrations
      if (parentItem.students && parentItem.students.length > 0) {
        parentItem.students.forEach((child, index) => {
          console.log(child)
          activities.push({
            id: `student-${parentItem.id}-${index}`,
            activity: `Student registered for ${parentItem.sport}`,
            user: `${child.firstName} ${child.lastName} (${child.ageGroup})`,
            time: formatTimeAgo(createdDate),
            status: 'completed',
            type: 'student-registration'
          });
        });
      }
    });

    // Recent coach additions
    const recentCoaches = coaches
      .filter(coachItem => coachItem.createdAt && coachItem.role === 'coach')
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      })
      .slice(0, 2);

    recentCoaches.forEach(coachItem => {
      const createdDate = coachItem.createdAt?.toDate ? coachItem.createdAt.toDate() : new Date(coachItem.createdAt);
      activities.push({
        id: `coach-${coachItem.id}`,
        activity: `New coach added`,
        user: `${coachItem.firstName} ${coachItem.lastName}`,
        time: formatTimeAgo(createdDate),
        status: 'assigned',
        type: 'coach'
      });
    });

    // Sort all activities by time and return top 10
    return activities
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 10);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getBadgeColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'registration':
        return '👥';
      case 'student-registration':
        return '🧑‍🎓';
      case 'coach':
        return '🏃';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="max-w-full">
        <Header
          title="Dashboard Overview"
          subtitle="Loading dashboard data..."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      <Header
        title="Dashboard Overview"
        subtitle="Welcome to the YAU Admin Panel - Manage your youth athletic organization"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          number={stats.totalParents}
          label="Total Parents"
          icon="👥"
          trend={stats.totalParents > 0 ? "+12%" : "0%"}
        />
        <StatCard
          number={stats.totalChildren}
          label="Total Students"
          icon="🧑‍🎓"
          trend={stats.totalChildren > 0 ? "+8%" : "0%"}
        />
        <StatCard
          number={stats.totalCoaches}
          label="Active Coaches"
          icon="🏃"
          trend={stats.totalCoaches > 0 ? "+15%" : "0%"}
        />
        <StatCard
          number={stats.totalRosters}
          label="Total Rosters"
          icon="📋"
          trend={stats.totalRosters > 0 ? "+5%" : "0%"}
        />
      </div>

      {/* Roster Status Row (Commented out as in original) */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <StatCard 
          number={stats.activeRosters} 
          label="Active Rosters"
          icon="✅"
          trend="Ready to play"
          color="green"
        />
        <StatCard 
          number={stats.needCoachRosters} 
          label="Need Coaches"
          icon="❌"
          trend="Requires assignment"
          color="red"
        />
        <StatCard 
          number={stats.needPlayersRosters} 
          label="Need Players"
          icon="👥"
          trend="Coach assigned"
          color="blue"
        />
      </div> */}

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Age Group Distribution */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Age Group Distribution</h3>
          <AgeGroupChart />
        </div>

        {/* Sports Distribution */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sports Popularity</h3>
          <SportsChart />
        </div>

        {/* Location Distribution */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Location Distribution</h3>
          <LocationChart />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass rounded-2xl p-4 lg:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
          <button
            onClick={loadDashboardData}
            className="text-primary-500 hover:text-primary-600 text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {recentActivity.length > 0 ? (
          <Table headers={['Activity', 'User', 'Time', 'Status']}>
            {recentActivity.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    <div className="truncate max-w-[150px] lg:max-w-none">
                      {activity.activity}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="truncate max-w-[100px] lg:max-w-none">
                    {activity.user}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  <div className="truncate max-w-[80px] lg:max-w-none">
                    {activity.time}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No recent activity found</p>
            <p className="text-sm text-gray-500 mt-1">Activity will appear here as users register and coaches are added</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AgeGroupChart = () => {
  const [ageGroups, setAgeGroups] = useState({});

  useEffect(() => {
    loadAgeGroupData();
  }, []); // eslint-disable-line

  const calculateAgeGroup = (dob, storedAgeGroup = null) => {
    if (!dob && storedAgeGroup) {
      return storedAgeGroup;
    }
    if (!dob) {
      return '2U';
    }

    const birthDate = new Date(dob);
    const currentYear = new Date().getFullYear();
    const cutoffDate = new Date(currentYear, 6, 31);

    let ageAsOfJuly31 = currentYear - birthDate.getFullYear();
    const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    if (birthdayThisYear > cutoffDate) {
      ageAsOfJuly31--;
    }

    const ageGroupMapping = {
      2: '2U', 3: '2U', 4: '4U', 5: '4U', 6: '6U', 7: '6U',
      8: '8U', 9: '9U', 10: '10U', 11: '10U', 12: '12U', 13: '12U', 14: '14U', 15: '14U'
    };

    return ageGroupMapping[ageAsOfJuly31] || '2U';
  };

  const loadAgeGroupData = async () => {
    try {
      const parents = await getMembers();
      const ageGroupCounts = {};

      parents.forEach(parentItem => {
        if (parentItem.students) {
          parentItem.students.forEach(child => {
            const correctAgeGroup = calculateAgeGroup(child.dob, child.ageGroup);
            ageGroupCounts[correctAgeGroup] = (ageGroupCounts[correctAgeGroup] || 0) + 1;
          });
        }
      });

      setAgeGroups(ageGroupCounts);
    } catch (error) {
      console.error('Error loading age group data:', error);
    }
  };

  const sortedAgeGroups = Object.entries(ageGroups)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .slice(0, 8);

  return (
    <div className="space-y-3">
      {sortedAgeGroups.length > 0 ? (
        sortedAgeGroups.map(([ageGroup, count]) => (
          <div key={ageGroup} className="flex justify-between items-center">
            <span className="text-sm font-medium">{ageGroup}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${(count / Math.max(...Object.values(ageGroups))) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-sm">No age group data available</p>
      )}
    </div>
  );
};

const SportsChart = () => {
  const [sports, setSports] = useState({});

  useEffect(() => {
    loadSportsData();
  }, []); // eslint-disable-line

  const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };

  const loadSportsData = async () => {
    try {
      const parents = await getMembers();
      const sportCounts = {};

      parents.forEach(parentItem => {
        if (parentItem.sport) {
          const mappedSport = sportMapping[parentItem.sport] || parentItem.sport;
          sportCounts[mappedSport] = (sportCounts[mappedSport] || 0) + 1;
        }
      });

      setSports(sportCounts);
    } catch (error) {
      console.error('Error loading sports data:', error);
    }
  };

  const sortedSports = Object.entries(sports)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="space-y-3">
      {sortedSports.length > 0 ? (
        sortedSports.map(([sport, count]) => (
          <div key={sport} className="flex justify-between items-center">
            <span className="text-sm font-medium truncate max-w-[100px]">{sport}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(count / Math.max(...Object.values(sports))) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-sm">No sports data available</p>
      )}
    </div>
  );
};

const LocationChart = () => {
  const [locations, setLocations] = useState({});

  useEffect(() => {
    loadLocationData();
  }, []);

  const loadLocationData = async () => {
    try {
      const parents = await getMembers();
      const locationCounts = {};

      parents.forEach(parentItem => {
        if (parentItem.location) {
          locationCounts[parentItem.location] = (locationCounts[parentItem.location] || 0) + 1;
        }
      });

      setLocations(locationCounts);
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const sortedLocations = Object.entries(locations)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {sortedLocations.length > 0 ? (
        sortedLocations.map(([location, count]) => (
          <div key={location} className="flex justify-between items-center">
            <span className="text-sm font-medium truncate max-w-[100px]">{location}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(count / Math.max(...Object.values(locations))) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-sm">No location data available</p>
      )}
    </div>
  );
};

export default Dashboard;