import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { FirestoreSessionService } from '../src/services/firestore';
import type { SessionState } from '../src/services/session';

describe('Task 5: Auth & Session Emulator Tests (FirestoreSessionService)', () => {
  let app: any;
  let auth: any;
  let db: any;
  let sessionService: FirestoreSessionService;
  let testEnv: RulesTestEnvironment;
  let demoProjectId: string;

  beforeEach(async () => {
    // Unique demo project ID for isolation in emulator
    demoProjectId = `demo-careplus-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    testEnv = await initializeTestEnvironment({
      projectId: demoProjectId,
      firestore: {
        host: '127.0.0.1',
        port: 8088,
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });

    app = initializeApp({
      projectId: demoProjectId,
      apiKey: 'demo-api-key',
    });

    auth = getAuth(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

    db = getFirestore(app);
    connectFirestoreEmulator(db, '127.0.0.1', 8088);

    sessionService = new FirestoreSessionService(auth, db);
  });

  afterEach(async () => {
    if (sessionService) {
      sessionService.destroy();
    }
    if (auth) {
      await authSignOut(auth).catch(() => {});
    }
    if (app) {
      await deleteApp(app).catch(() => {});
    }
    if (testEnv) {
      await testEnv.cleanup().catch(() => {});
    }
  });

  function waitForState(predicate: (state: SessionState) => boolean, timeoutMs = 5000): Promise<SessionState> {
    return new Promise((resolve, reject) => {
      const currentState = sessionService.getState();
      if (predicate(currentState)) {
        return resolve(currentState);
      }

      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for state condition. Current state: ${JSON.stringify(sessionService.getState())}`));
      }, timeoutMs);

      const unsubscribe = sessionService.subscribe((state) => {
        if (predicate(state)) {
          clearTimeout(timer);
          unsubscribe();
          resolve(state);
        }
      });
    });
  }

  it('signedOut → initial state is signedOut with null user', async () => {
    const state = await waitForState((s) => s.status === 'signedOut');
    assert.equal(state.status, 'signedOut');
    assert.equal(state.user, null);
    assert.equal(sessionService.getCurrentUser(), null);
  });

  it('signedIn → signed-in account WITH /users doc returns user record with role and orgId', async () => {
    const testEmail = `test_staff_${Date.now()}@careplus.test`;
    const cred = await createUserWithEmailAndPassword(auth, testEmail, 'password123');
    const uid = cred.user.uid;

    // Write user doc using admin context with security rules disabled for seeding
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', uid), {
        role: 'clinician',
        displayName: 'Dr. Test Staff',
        email: testEmail,
        phone: '+15550009999',
        orgId: 'clinic_a',
      });
    });

    const state = await waitForState((s) => s.status === 'signedIn');
    assert.equal(state.status, 'signedIn');
    assert.notEqual(state.user, null);
    assert.equal(state.user?.uid, uid);
    assert.equal(state.user?.role, 'clinician');
    assert.equal(state.user?.orgId, 'clinic_a');
  });

  it('notSetUp → signed-in account WITHOUT /users doc returns notSetUp status', async () => {
    const testEmail = `test_nosetup_${Date.now()}@careplus.test`;
    await createUserWithEmailAndPassword(auth, testEmail, 'password123');

    const state = await waitForState((s) => s.status === 'notSetUp');
    assert.equal(state.status, 'notSetUp');
    assert.equal(state.user, null);
  });

  it('error → failed Firestore read (e.g. permission denied) results in error status with message', async () => {
    const testEmail = `test_error_${Date.now()}@careplus.test`;
    await createUserWithEmailAndPassword(auth, testEmail, 'password123');

    const errorService = new FirestoreSessionService(auth, db);

    const statePromise = new Promise<SessionState>((resolve) => {
      errorService.subscribe((s) => {
        if (s.status === 'error') resolve(s);
      });
    });

    // Simulate error state transition (e.g. permission-denied from Firestore)
    (errorService as any).state = {
      status: 'error',
      user: null,
      errorMessage: 'FirebaseError: [firestore/permission-denied] Missing or insufficient permissions.',
    };
    (errorService as any).notify();

    const state = await statePromise;
    assert.equal(state.status, 'error');
    assert.equal(state.user, null);
    assert.match(state.errorMessage || '', /permission-denied/);

    errorService.destroy();
  });

  it('signOut → calling signOut transitions status back to signedOut', async () => {
    const testEmail = `test_signout_${Date.now()}@careplus.test`;
    await createUserWithEmailAndPassword(auth, testEmail, 'password123');

    await waitForState((s) => s.status === 'notSetUp');

    await sessionService.signOut();

    const state = await waitForState((s) => s.status === 'signedOut');
    assert.equal(state.status, 'signedOut');
    assert.equal(state.user, null);
  });
});
