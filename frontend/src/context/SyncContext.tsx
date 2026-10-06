import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncService, SyncStatus } from '../db/syncService';

interface SyncContextType {
  status: SyncStatus;
  syncNow: () => Promise<{ success: boolean; message: string }>;
  refreshStatus: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    unsyncedCount: 0,
    message: 'Prêt'
  });

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const syncNow = async () => {
    return await syncService.syncNow();
  };

  const refreshStatus = async () => {
    await syncService.checkStatusAndAutoSync();
  };

  return (
    <SyncContext.Provider value={{ status, syncNow, refreshStatus }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
