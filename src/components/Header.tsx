import { memo } from 'react';
import { Logo } from './Logo';
import { AuthUI } from './AuthUI';
import { SchemaPerson } from '../types';

interface HeaderProps {
  profile: SchemaPerson;
  onLogin: (updates: Partial<SchemaPerson>) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
}

function HeaderImpl({ profile, onLogin, onSignOut, onOpenSettings, onGoHome }: HeaderProps) {
  return (
    <header className="border-b border-[var(--color-brand-element)] bg-black/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo onClick={onGoHome} />
        <div className="flex items-center gap-6">
          <AuthUI
            profile={profile}
            onLogin={onLogin}
            onSignOut={onSignOut}
            onOpenSettings={onOpenSettings}
          />
        </div>
      </div>
    </header>
  );
}

export const Header = memo(HeaderImpl);
