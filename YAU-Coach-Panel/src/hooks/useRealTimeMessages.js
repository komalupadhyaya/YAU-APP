// coach-panel/src/hooks/useRealTimeMessages.js
import { useState, useEffect } from 'react';
import { subscribeToGroupChat, getTeamMessages } from '../firebase/coachFirestore';

export const useRealTimeMessages = (rosterId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe;

    if (!rosterId) {
      if (mounted) {
        setMessages([]);
        setLoading(false);
      }
      return;
    }

    if (mounted) {
      setLoading(true);
    }
    
    unsubscribe = subscribeToGroupChat(rosterId, (newMessages) => {
      if (mounted) {
        setMessages(newMessages || []);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [rosterId]);

  return { messages, loading };
};

export const useTeamMessages = (coachId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe;

    if (!coachId) {
      if (mounted) {
        setMessages([]);
        setLoading(false);
      }
      return;
    }

    unsubscribe = getTeamMessages(coachId, (newMessages) => {
      if (mounted) {
        setMessages(newMessages || []);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [coachId]);

  return { messages, loading };
};