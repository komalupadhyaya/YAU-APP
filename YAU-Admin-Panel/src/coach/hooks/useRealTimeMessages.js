// coach/hooks/useRealTimeMessages.js
import { useState, useEffect } from 'react';
import { subscribeToGroupChat, getTeamMessages } from '../../firebase/coachFirestore';

export const useRealTimeMessages = (rosterId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rosterId) return;

    setLoading(true);
    
    const unsubscribe = subscribeToGroupChat(rosterId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
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
    if (!coachId) return;

    const unsubscribe = getTeamMessages(coachId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [coachId]);

  return { messages, loading };
};