import  { createContext, useContext, useState, ReactNode } from 'react';

interface RefreshContextType {
  refreshSchools: (() => void) | null;
  setRefreshSchools: (callback: (() => void) | null) => void;
  refreshStudents: (() => void) | null;
  setRefreshStudents: (callback: (() => void) | null) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const RefreshProvider = ({ children }: { children: ReactNode }) => {
  const [refreshSchools, setRefreshSchools] = useState<(() => void) | null>(null);
  const [refreshStudents, setRefreshStudents] = useState<(() => void) | null>(null);

  return (
    <RefreshContext.Provider value={{ refreshSchools, setRefreshSchools, refreshStudents, setRefreshStudents }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
