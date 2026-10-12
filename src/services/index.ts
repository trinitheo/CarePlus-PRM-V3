import type { DataService } from './types';
import type { SessionService, SessionState } from './session';
import { firebaseConfig } from './firebaseConfig';

function isFirebaseConfigValid(config: Record<string, string>): boolean {
  return Boolean(
    config &&
      config.projectId &&
      config.apiKey &&
      config.authDomain &&
      !config.projectId.includes('placeholder')
  );
}

const isDev = import.meta.env.DEV;
const forceFirestore = import.meta.env.VITE_USE_FIRESTORE === 'true';

let dataService: DataService;
let sessionService: SessionService;

if (isDev && !forceFirestore) {
  const { MockDataService, MockSessionService } = await import('./mock');
  const mockData = new MockDataService();
  const mockSession = new MockSessionService(mockData);
  dataService = mockData;
  sessionService = mockSession;
} else {
  // Production or VITE_USE_FIRESTORE mode
  if (!isFirebaseConfigValid(firebaseConfig)) {
    // Fail closed: Missing or invalid config in production build
    class ConfigErrorSessionService implements SessionService {
      getState(): SessionState {
        return {
          status: 'configError',
          user: null,
          errorMessage: 'Firebase configuration is missing or invalid.',
        };
      }
      getCurrentUser() {
        return null;
      }
      subscribe(callback: (state: SessionState) => void) {
        callback(this.getState());
        return () => {};
      }
    }

    const { FirestoreDataService } = await import('./firestore');
    // Dummy DB for type safety (will not be called as UI shows config error screen)
    dataService = new FirestoreDataService({} as any);
    sessionService = new ConfigErrorSessionService();
  } else {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    const { FirestoreDataService, FirestoreSessionService } = await import('./firestore');

    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    const auth = getAuth(app);
    const db = getFirestore(app);

    dataService = new FirestoreDataService(db);
    sessionService = new FirestoreSessionService(auth, db);
  }
}

export { dataService, sessionService };
export * from './types';
export * from './session';
