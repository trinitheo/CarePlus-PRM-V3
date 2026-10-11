import type { UserRecord } from '../types';

export interface SessionService {
  getCurrentUser(): UserRecord | null;
  subscribe(callback: (user: UserRecord | null) => void): () => void;
  // Mock-only sign-in method
  signInAs?(uid: string): void;
}
