import React, { createContext, useContext } from 'react';
import { db } from '@/db/client';

const DatabaseContext = createContext(db);

/**
 * Database provider
 */
export const DatabaseProvider = ({ children }: { children: React.ReactNode }) => (
  <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
);

/**
 * Database hook
 */
export const useDatabase = () => useContext(DatabaseContext);
