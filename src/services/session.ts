import type { UserRecord } from '../types';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn' | 'notSetUp' | 'error' | 'configError';

export interface SessionState {
  status: SessionStatus;
  user: UserRecord | null;
  errorMessage?: string;
}

export interface SessionService {
  getState(): SessionState;
  getCurrentUser(): UserRecord | null;
  subscribe(callback: (state: SessionState) => void): () => void;
  signIn?(email: string, password: string): Promise<void>;
  signOut?(): Promise<void>;
  sendPasswordReset?(email: string): Promise<void>;
  // Mock-only sign-in method
  signInAs?(uid: string): void;
}
