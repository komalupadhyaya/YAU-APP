export const calculateAgeGroup = (dateOfBirth) => {
  const birthDate = new Date(dateOfBirth);
  const currentYear = new Date().getFullYear();
  const cutoffDate = new Date(currentYear, 6, 31); // July 31st
  
  let age;
  if (birthDate <= cutoffDate) {
    age = currentYear - birthDate.getFullYear();
  } else {
    age = currentYear - birthDate.getFullYear() - 1;
  }
  
  // Determine age group based on age
  if (age <= 2) return "2U";
  if (age <= 4) return "4U";
  if (age <= 6) return "6U";
  if (age <= 8) return "8U";
  if (age <= 10) return "10U";
  if (age <= 12) return "12U";
  if (age <= 14) return "14U";
  
  return "Over 14";
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "Less than an hour ago";
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "1 day ago";
  return `${diffInDays} days ago`;
};