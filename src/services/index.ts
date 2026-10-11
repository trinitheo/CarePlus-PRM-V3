import type { DataService } from './types';
import type { SessionService } from './session';
// Production fails closed: Mock mode is strictly forbidden unless import.meta.env.DEV is true
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
  // In production or when VITE_USE_FIRESTORE is true, lazy-wire Firestore
  // Real Firestore client setup will be configured via firebase init
  // Fails closed if not in DEV mode
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');
  const { FirestoreDataService, FirestoreSessionService } = await import('./firestore');

  let app;
  if (getApps().length === 0) {
    app = initializeApp({
      projectId: 'careplus-v2',
      apiKey: 'fake-api-key-for-init',
    });
  } else {
    app = getApps()[0];
  }
  const db = getFirestore(app);

  dataService = new FirestoreDataService(db);
  sessionService = new FirestoreSessionService();
}

export { dataService, sessionService };
export * from './types';
export * from './session';
