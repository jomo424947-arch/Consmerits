import React, { createContext, useContext } from 'react';
import { SafeUser } from '../../shared/types/users.types';

interface UserContextValue {
  currentUser: SafeUser | null;
  setCurrentUser: (user: SafeUser | null) => void;
  logout: () => Promise<void>;
  lockScreen: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UserContextValue;
}): React.ReactElement {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}
