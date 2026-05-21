import { useEffect, useState, useRef } from 'react';
import { SchemaPerson } from '../types';
import { useGoogleAuth } from '../lib/auth';
import { UserCircle, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslation } from '../locales';

interface AuthUIProps {
  profile: SchemaPerson;
  onLogin: (updates: Partial<SchemaPerson>) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export function AuthUI({ profile, onLogin, onSignOut, onOpenSettings }: AuthUIProps) {
  const { isReady, signIn, error } = useGoogleAuth(onLogin);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const t = getTranslation(profile.preferences.language);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (profile.authState.isAuthenticated) {
    return (
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] hover:border-[var(--color-brand-primary)] p-1.5 pr-4 rounded-full transition-all cursor-pointer"
        >
          {profile.image ? (
            <img src={profile.image} alt="User avatar" className="w-8 h-8 rounded-full border border-[var(--color-brand-primary)]" referrerPolicy="no-referrer" />
          ) : (
            <UserCircle className="w-8 h-8 text-[var(--color-brand-primary)]" />
          )}
          <span className="text-sm font-medium text-[var(--color-brand-glow)]">
            {profile.givenName} {profile.familyName}
          </span>
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-56 bg-[var(--color-brand-surface)] border border-[var(--color-brand-primary)] shadow-[0_0_20px_rgba(22,137,115,0.2)] rounded-lg overflow-hidden py-1 z-50 text-[var(--color-brand-glow)]"
            >
              <div className="px-4 py-3 border-b border-[var(--color-brand-element)]">
                <p className="text-sm font-bold truncate">{profile.givenName} {profile.familyName}</p>
                <p className="text-xs font-mono opacity-70 truncate mt-1">{profile.email}</p>
              </div>
              
              <button 
                onClick={() => { setMenuOpen(false); onOpenSettings(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-brand-element)] transition-colors text-left cursor-pointer"
              >
                <Settings size={16} className="text-[var(--color-brand-primary)]" /> 
                {t.auth.configuration}
              </button>
              
              <button 
                onClick={() => { setMenuOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-brand-element)] transition-colors text-left text-red-400 cursor-pointer"
              >
                <LogOut size={16} /> 
                {t.auth.terminateSession}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={signIn}
        disabled={!isReady}
        className="px-5 py-2 border border-dashed border-[var(--color-brand-element)] hover:border-[var(--color-brand-primary)] rounded bg-[var(--color-brand-dark)] text-xs font-mono tracking-widest uppercase text-[var(--color-brand-primary)]/80 hover:text-[var(--color-brand-glow)] hover:shadow-[0_0_15px_rgba(22,137,115,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {t.auth.signIn}
      </button>
      {error && <p className="text-xs text-red-400 mt-2 max-w-[200px] text-right font-mono">{error}</p>}
    </div>
  );
}
