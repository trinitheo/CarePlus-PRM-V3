import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Heart, Shield } from 'lucide-react';
import { sessionService } from './services';
import type { UserRecord } from './types';
import { PatientPanel } from './components/PatientPanel';
import { PatientCareTeamView } from './components/PatientCareTeamView';
import { RolePlaceholder } from './components/RolePlaceholder';
import { tokens } from './theme/tokens';

// Lazy-load dev-only components so they are entirely excluded from production
const DevUserSwitcher = import.meta.env.DEV
  ? lazy(() => import('./dev/DevUserSwitcher').then((m) => ({ default: m.DevUserSwitcher })))
  : null;

const RulesMatrix = import.meta.env.DEV
  ? lazy(() => import('./dev/RulesMatrix').then((m) => ({ default: m.RulesMatrix })))
  : null;

const MainApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(sessionService.getCurrentUser());

  useEffect(() => {
    const unsubscribe = sessionService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSwitchUser = (uid: string) => {
    if (sessionService.signInAs) {
      sessionService.signInAs(uid);
    }
  };

  const isCareTeamMember = currentUser?.role === 'clinician' || currentUser?.role === 'nurse';

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

        {/* Dynamic Role-Based View */}
        {currentUser ? (
          isCareTeamMember ? (
            <PatientPanel currentUser={currentUser} />
          ) : currentUser.role === 'patient' ? (
            <PatientCareTeamView currentUser={currentUser} />
          ) : (
            <RolePlaceholder currentUser={currentUser} />
          )
        ) : (
          <div className={`p-12 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <p className={`text-sm ${tokens.text.muted}`}>No active user session. Please sign in.</p>
          </div>
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
