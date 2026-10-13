import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { Heart, Shield, LogOut } from 'lucide-react';
import { sessionService, type SessionState } from './services';
import { PatientPanel } from './components/PatientPanel';
import { PatientCareTeamView } from './components/PatientCareTeamView';
import { RolePlaceholder } from './components/RolePlaceholder';
import { PatientChartScreen } from './components/chart/PatientChartScreen';
import { SignInScreen } from './components/SignInScreen';
import { AccountNotSetUpScreen } from './components/AccountNotSetUpScreen';
import { ConfigurationErrorScreen } from './components/ConfigurationErrorScreen';
import { tokens } from './theme/tokens';

// Lazy-load dev-only components so they are entirely excluded from production
const DevUserSwitcher = import.meta.env.DEV
  ? lazy(() => import('./dev/DevUserSwitcher').then((m) => ({ default: m.DevUserSwitcher })))
  : null;

const RulesMatrix = import.meta.env.DEV
  ? lazy(() => import('./dev/RulesMatrix').then((m) => ({ default: m.RulesMatrix })))
  : null;

const MainApp: React.FC = () => {
  const { orgId, patientId } = useParams<{ orgId: string; patientId: string }>();
  const [sessionState, setSessionState] = useState<SessionState>(sessionService.getState());

  useEffect(() => {
    const unsubscribe = sessionService.subscribe((state) => {
      setSessionState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleSwitchUser = (uid: string) => {
    if (sessionService.signInAs) {
      sessionService.signInAs(uid);
    }
  };

  const currentUser = sessionState.user;
  const isCareTeamMember = currentUser?.role === 'clinician' || currentUser?.role === 'nurse';

  const handleSignOut = async () => {
    if (sessionService.signOut) {
      await sessionService.signOut();
    }
  };

  return (
    <div className={`min-h-screen ${tokens.surfaces.canvas} text-text-body font-sans`}>
      {/* Top Navbar */}
      <header className={`border-b ${tokens.surfaces.card} ${tokens.borders.default} sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-base text-text-inverted flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className={`text-base font-bold ${tokens.text.title}`}>CarePlus v2</span>
              <span className="ml-2 text-xs text-text-muted">Care Team Relationship Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {import.meta.env.DEV && RulesMatrix && (
              <Link
                to="/dev/rules"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${tokens.surfaces.card} ${tokens.borders.default} ${tokens.surfaces.hover} ${tokens.text.muted}`}
              >
                <Shield className="w-3.5 h-3.5 text-primary-base" />
                Rules Matrix
              </Link>
            )}

            {currentUser && (
              <div className="flex items-center gap-3 pl-2 border-l border-border-default">
                <div className="text-right hidden sm:block">
                  <div className={`text-xs font-semibold ${tokens.text.title}`}>{currentUser.displayName}</div>
                  <div className="text-[10px] text-text-muted">{currentUser.email}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tokens.roles[currentUser.role]}`}>
                  {currentUser.role}
                </span>
              </div>
            )}

            {(sessionState.status === 'signedIn' || sessionState.status === 'notSetUp') && sessionService.signOut && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border-default hover:bg-surface-hover text-text-muted cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Dev switcher available only when in DEV mode */}
        {import.meta.env.DEV && DevUserSwitcher && (
          <Suspense fallback={null}>
            <DevUserSwitcher currentUser={currentUser} onSelectUser={handleSwitchUser} />
          </Suspense>
        )}

        {/* Dynamic View based on Session Status */}
        {sessionState.status === 'configError' ? (
          <ConfigurationErrorScreen errorMessage={sessionState.errorMessage} />
        ) : sessionState.status === 'loading' ? (
          <div className={`p-12 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <p className={`text-sm ${tokens.text.muted}`}>Loading user session...</p>
          </div>
        ) : sessionState.status === 'notSetUp' ? (
          <AccountNotSetUpScreen />
        ) : sessionState.status === 'error' ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl border border-status-error/30 bg-status-error/10 text-center">
            <div className="text-sm font-semibold text-status-error mb-2">Session Error</div>
            <div className="text-xs text-text-muted mb-4">{sessionState.errorMessage || 'An error occurred.'}</div>
            {sessionService.signOut && (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-card border border-border-default hover:bg-surface-hover text-text-title cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        ) : sessionState.status === 'signedIn' && currentUser ? (
          orgId && patientId ? (
            <PatientChartScreen currentUser={currentUser} />
          ) : isCareTeamMember ? (
            <PatientPanel currentUser={currentUser} />
          ) : currentUser.role === 'patient' ? (
            <PatientCareTeamView currentUser={currentUser} />
          ) : (
            <RolePlaceholder currentUser={currentUser} />
          )
        ) : (
          <SignInScreen />
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/patients/:orgId/:patientId" element={<MainApp />} />
        {import.meta.env.DEV && RulesMatrix && (
          <Route
            path="/dev/rules"
            element={
              <div className={`min-h-screen ${tokens.surfaces.canvas} p-6`}>
                <div className="max-w-7xl mx-auto">
                  <Suspense fallback={<div className="p-8 text-center text-sm text-text-muted">Loading Rules Matrix...</div>}>
                    <RulesMatrix />
                  </Suspense>
                </div>
              </div>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
