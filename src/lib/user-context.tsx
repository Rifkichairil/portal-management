"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  role: "admin" | "manager" | "submittercase" | string;
  contact_sf_id: string | null;
  account_sf_id: string | null;
}

interface UserContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSubmitter: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  isManager: false,
  isSubmitter: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === "admin",
        isManager: user?.role === "manager",
        isSubmitter: user?.role === "submittercase",
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
