// utils/requestCache.js
const cache = new Map();
const activeRequests = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const deduplicateRequest = async (key, requestFunction) => {
  // If request is already in progress, return the existing promise
  if (activeRequests.has(key)) {
    console.log('🔄 Request already in progress, returning existing promise:', key);
    return activeRequests.get(key);
  }

  // Create new request promise
  const requestPromise = requestFunction()
    .finally(() => {
      // Remove from active requests when completed
      activeRequests.delete(key);
    });

  // Store the promise
  activeRequests.set(key, requestPromise);
  
  return requestPromise;
};

export const cachedRequest = async (key, requestFunction, ttl = CACHE_DURATION) => {
  // Check if we have cached data that's still valid
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log('🔄 Returning cached data for:', key);
    return cached.data;
  }

  // Check if request is already in progress
  if (activeRequests.has(key)) {
    console.log('⏳ Request already in progress, waiting for:', key);
    return activeRequests.get(key);
  }

  // Create new request
  const requestPromise = requestFunction()
    .then(data => {
      // Cache the successful result
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
      return data;
    })
    .finally(() => {
      // Remove from active requests
      activeRequests.delete(key);
    });

  // Store the promise
  activeRequests.set(key, requestPromise);
  
  return requestPromise;
};

export const clearCache = (pattern) => {
  if (pattern) {
    // Clear specific cache entries
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all cache
    cache.clear();
  }
};

// Get cache info for debugging
export const getCacheInfo = () => {
  return {
    cacheSize: cache.size,
    activeRequestsSize: activeRequests.size,
    cacheKeys: Array.from(cache.keys()),
    activeRequestKeys: Array.from(activeRequests.keys())
  };
};