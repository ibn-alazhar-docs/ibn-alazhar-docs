import React from "react";
import { vi } from "vitest";

export const signIn = vi.fn(() => Promise.resolve(null));
export const signOut = vi.fn(() => Promise.resolve(null));
export const useSession = () => ({ data: null, status: "unauthenticated" as const });
export const getSession = vi.fn(() => Promise.resolve(null));
export const getProviders = vi.fn(() => Promise.resolve(null));
export const SessionProvider = ({ children }: { children: React.ReactNode }) => children;
export const SessionStatus = () => null;

export default {
  signIn,
  signOut,
  useSession,
  getSession,
  getProviders,
  SessionProvider,
  SessionStatus,
};
