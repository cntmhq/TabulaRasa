import { useState } from 'react';
import { useStore } from './lib/store';
import { Header } from './components/Header';
import { BrokerCard } from './components/BrokerCard';
import { Composer } from './components/Composer';
import { ProfileModal } from './components/ProfileModal';
import { brokers } from './data/brokers';
import { SchemaOrganization } from './types';
import { ShieldAlert, Globe } from 'lucide-react';
import { getTranslation } from './locales';

type ViewState = 'brokers' | 'tldr' | 'policy';

export default function App() {
  const { profile, updateProfile, updatePreferences, signOut } = useStore();
  const [selectedBroker, setSelectedBroker] = useState<SchemaOrganization | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('brokers');
  
  const currentLang = profile.preferences.language || 'en';
  const t = getTranslation(currentLang);

  const getLeftTitle = () => {
    if (activeView === 'tldr') return t.app.tldrContext;
    if (activeView === 'policy') return t.app.directivePolicy;
    return t.app.directorySearch;
  };
  
  const toggleLanguage = () => {
    updatePreferences({ language: currentLang === 'en' ? 'pl' : 'en' });
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col font-sans relative selection:bg-[var(--color-brand-primary)] selection:text-[var(--color-brand-dark)]">
      {/* Decorative background grid and gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(var(--color-brand-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[var(--color-brand-primary)]/5 to-transparent h-[400px] z-0" />

      <Header 
        profile={profile} 
        onLogin={updateProfile}
        onSignOut={signOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10 flex flex-col md:flex-row gap-4 sm:gap-8 md:overflow-hidden overflow-y-auto">

        {/* Left Column: Catalog or Modals */}
        <section className="flex-1 md:flex-none md:w-1/3 flex flex-col min-h-0 mb-2 md:mb-0 md:min-h-0 min-h-[100dvh]">
          <div className="flex items-center gap-3 mb-4 sm:mb-6 shrink-0">
            <h2 className="text-xl font-mono uppercase tracking-widest text-[var(--color-brand-glow)] truncate">{getLeftTitle()}</h2>
            <div className="h-px bg-gradient-to-r from-[var(--color-brand-element)] to-transparent flex-1" />
          </div>

          <div className="bg-[var(--color-brand-dark)]/80 backdrop-blur border border-[var(--color-brand-element)] rounded-xl p-3 sm:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="mb-4 text-xs font-mono opacity-60 flex items-center justify-between px-2 uppercase text-[var(--color-brand-primary)] tracking-wider shrink-0 min-h-[16px]">
               <span>{activeView === 'brokers' ? t.app.directoryList : t.app.systemInformation}</span>
               {activeView === 'brokers' && <span>{brokers.length} {t.app.found}</span>}
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-2 pb-2 flex-1 scroll-smooth">
              {activeView === 'brokers' && brokers.map(broker => (
                <BrokerCard
                  key={broker.identifier}
                  broker={broker}
                  isSelected={selectedBroker?.identifier === broker.identifier}
                  onSelect={setSelectedBroker}
                  t={t}
                />
              ))}

              {activeView === 'tldr' && (
                <div className="space-y-5 text-sm font-mono text-[var(--color-brand-primary)] flex flex-col gap-2 opacity-90 leading-relaxed pr-2">
                   <div>
                     <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.tldr.problemTitle}</strong>
                     {t.app.tldr.problemDesc}
                   </div>
                   <div>
                     <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.tldr.rightsTitle}</strong>
                     {t.app.tldr.rightsDesc}
                   </div>
                   <div>
                     <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.tldr.obligationTitle}</strong>
                     {t.app.tldr.obligationDesc}
                   </div>
                </div>
              )}

              {activeView === 'policy' && (
                <div className="space-y-5 text-sm font-mono text-[var(--color-brand-primary)] flex flex-col gap-2 opacity-90 leading-relaxed pr-2">
                   <div>
                     <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.policy.trackingTitle}</strong>
                     {t.app.policy.trackingDesc}
                   </div>
                   <div>
                     <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.policy.storageTitle}</strong>
                     {t.app.policy.storageDesc}
                   </div>
                   <div>
                     <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.policy.liabilityTitle}</strong>
                     {t.app.policy.liabilityDesc}
                   </div>
                </div>
              )}
            </div>

            <div className="mt-4 shrink-0 p-3 sm:p-4 border border-[var(--color-brand-primary)]/20 rounded bg-[var(--color-brand-dark)] bg-gradient-to-br from-[var(--color-brand-primary)]/5 to-transparent flex gap-3 text-[var(--color-brand-primary)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldAlert size={64} />
                </div>
                <ShieldAlert size={20} className="shrink-0 mt-0.5 text-[var(--color-brand-glow)] relative z-10" />
                <div className="text-xs font-mono leading-relaxed opacity-90 overflow-y-auto max-h-24 sm:max-h-none relative z-10">
                    {activeView === 'brokers' ? (
                       <p>{t.app.selectTarget}</p>
                    ) : (
                       <>
                          <strong className="block text-[var(--color-brand-glow)] font-bold mb-1 tracking-wider uppercase">{t.app.tabulaRazaInitiative}</strong>
                          {t.app.initiativeDesc}
                          <span className="block mt-1 opacity-75">COMM_LINK: <a href="mailto:privacy@tabularaza.org" className="hover:text-[var(--color-brand-glow)] hover:underline cursor-pointer transition-colors text-white">privacy@tabularaza.org</a></span>
                       </>
                    )}
                </div>
            </div>
          </div>
        </section>

        {/* Right Column: Actuator/Composer */}
        <section className="flex-[1.5] flex flex-col min-h-0 md:min-h-0 min-h-[100dvh]">
          <Composer 
            broker={selectedBroker} 
            profile={profile} 
          />
        </section>
      </main>

      <ProfileModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onUpdatePreferences={updatePreferences}
      />

      {/* Footer Navigation Sitemap */}
      <footer className="shrink-0 border-t border-[var(--color-brand-element)] bg-[var(--color-brand-dark)]/80 backdrop-blur relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[var(--color-brand-primary)]/70">
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => setActiveView('brokers')} 
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer ${activeView === 'brokers' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.directorySearch}
            </button>
            <span className="opacity-30">/</span>
            <button 
              onClick={() => setActiveView('tldr')} 
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer ${activeView === 'tldr' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.tldrContext}
            </button>
            <span className="opacity-30">/</span>
            <button 
              onClick={() => setActiveView('policy')} 
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer ${activeView === 'policy' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.directivePolicy}
            </button>
          </div>
          
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer px-2 py-1 rounded border border-transparent hover:border-[var(--color-brand-element)]"
          >
            <Globe size={14} />
            <span className={currentLang === 'en' ? 'text-[var(--color-brand-glow)] font-bold' : ''}>EN</span>
            <span className="opacity-30">|</span>
            <span className={currentLang === 'pl' ? 'text-[var(--color-brand-glow)] font-bold' : ''}>PL</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
