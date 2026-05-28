import { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import { Header } from './components/Header';
import { BrokerCard } from './components/BrokerCard';
import { Composer } from './components/Composer';
import { ProfileModal } from './components/ProfileModal';
import { SchemaOrganization } from './types';
import { ShieldAlert, Globe } from 'lucide-react';
import { getTranslation, useLocaleEnsured } from './locales';
import { getStoredBrokerId, setStoredBrokerId } from './lib/session';

type ViewState = 'form' | 'brokers' | 'tldr' | 'policy';

// Groups views that render the same left-panel content so brokers↔form
// doesn't trigger a fade for what would otherwise be a no-op swap.
type PanelKey = 'brokers' | 'tldr' | 'policy';
const panelKeyFor = (view: ViewState): PanelKey =>
  view === 'tldr' ? 'tldr' : view === 'policy' ? 'policy' : 'brokers';

const PANEL_FADE_MS = 180;

export default function App() {
  const { profile, updateProfile, updatePreferences, signOut } = useStore();
  const [brokers, setBrokers] = useState<SchemaOrganization[]>([]);
  const [brokersReady, setBrokersReady] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<SchemaOrganization | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('form');
  const [displayedView, setDisplayedView] = useState<ViewState>('form');
  const [panelVisible, setPanelVisible] = useState(true);

  const currentLang = profile.preferences.language || 'pl';
  const showBrokersPanel = displayedView === 'brokers' || displayedView === 'form';
  useLocaleEnsured(currentLang);
  const t = getTranslation(currentLang);

  // Lazy-load the broker catalogue. Hydrate the stored selection once data is in.
  useEffect(() => {
    let alive = true;
    import('./data/brokers').then((m) => {
      if (!alive) return;
      setBrokers(m.brokers);
      const id = getStoredBrokerId();
      setSelectedBroker(id ? (m.brokers.find((b) => b.identifier === id) ?? null) : null);
      setBrokersReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!brokersReady) return;
    setStoredBrokerId(selectedBroker?.identifier ?? null);
  }, [selectedBroker, brokersReady]);

  // Cross-fade the left panel when the rendered content actually changes.
  // brokers↔form share the same panel so they bypass the fade and just
  // swap displayedView in place.
  useEffect(() => {
    if (displayedView === activeView) return;
    if (panelKeyFor(displayedView) === panelKeyFor(activeView)) {
      setDisplayedView(activeView);
      return;
    }
    setPanelVisible(false);
    const id = window.setTimeout(() => {
      setDisplayedView(activeView);
      requestAnimationFrame(() => setPanelVisible(true));
    }, PANEL_FADE_MS);
    return () => window.clearTimeout(id);
  }, [activeView, displayedView]);

  const getLeftTitle = () => {
    if (displayedView === 'tldr') return t.app.tldrContext;
    if (displayedView === 'policy') return t.app.directivePolicy;
    return t.app.directorySearch;
  };

  const toggleLanguage = () => {
    updatePreferences({ language: currentLang === 'en' ? 'pl' : 'en' });
  };

  const selectView = (view: ViewState) => {
    setActiveView(view);
    document.getElementById('directory-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectBroker = (broker: SchemaOrganization) => {
    setSelectedBroker(broker);
    setActiveView('form');
    document.getElementById('composer-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const focusForm = () => {
    setActiveView('form');
    document.getElementById('composer-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        onGoHome={() => {
          setSelectedBroker(null);
          setActiveView('form');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10 flex flex-col md:flex-row gap-4 sm:gap-8 md:overflow-hidden overflow-y-auto overflow-x-hidden">

        {/* Left Column: Catalog or Modals */}
        <section id="directory-section" className="order-2 md:order-1 flex-1 md:flex-none md:w-1/3 flex flex-col min-h-0 mb-2 md:mb-0 md:min-h-0 min-h-[100dvh] scroll-mt-4">
          <div
            className={`flex flex-col flex-1 min-h-0 transition-opacity duration-[180ms] will-change-[opacity] ${panelVisible ? 'opacity-100 ease-out' : 'opacity-0 ease-in'}`}
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6 shrink-0">
              <h2 className="text-xl font-mono uppercase tracking-widest text-[var(--color-brand-glow)] truncate">{getLeftTitle()}</h2>
              <div className="h-px bg-gradient-to-r from-[var(--color-brand-element)] to-transparent flex-1" />
            </div>

            <div className="bg-[var(--color-brand-dark)]/80 backdrop-blur border border-[var(--color-brand-element)] rounded-xl p-3 sm:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="mb-4 text-xs font-mono opacity-60 flex items-center justify-between px-2 uppercase text-[var(--color-brand-primary)] tracking-wider shrink-0 min-h-[16px]">
                 <span>{showBrokersPanel ? t.app.directoryList : t.app.systemInformation}</span>
                 {showBrokersPanel && brokersReady && <span>{brokers.length} {t.app.found}</span>}
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 pb-2 flex-1 scroll-smooth">
                {showBrokersPanel && !brokersReady && (
                  <div className="space-y-3" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[88px] rounded-lg border border-[var(--color-brand-element)] bg-black/40 animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {showBrokersPanel && brokersReady && brokers.map(broker => (
                  <BrokerCard
                    key={broker.identifier}
                    broker={broker}
                    isSelected={selectedBroker?.identifier === broker.identifier}
                    onSelect={handleSelectBroker}
                    t={t}
                  />
                ))}

                {displayedView === 'tldr' && (
                  <div className="space-y-5 text-sm font-mono text-[var(--color-brand-primary)] flex flex-col gap-2 opacity-90 leading-relaxed pr-2">
                     {/* <div>
                       <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.tldr.problemTitle}</strong>
                       {t.app.tldr.problemDesc}
                     </div> */}
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

                {displayedView === 'policy' && (
                  <div className="space-y-5 text-sm font-mono text-[var(--color-brand-primary)] flex flex-col gap-2 opacity-90 leading-relaxed pr-2">
                     <div>
                       <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.policy.liabilityTitle}</strong>
                       {t.app.policy.liabilityDesc}
                     </div>
                     <div>
                       <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.policy.trackingTitle}</strong>
                       {t.app.policy.trackingDesc}
                     </div>
                     <div>
                       <strong className="text-[var(--color-brand-glow)] block mb-1">{t.app.policy.storageTitle}</strong>
                       {t.app.policy.storageDesc}
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
                      {showBrokersPanel ? (
                         <p>{t.app.selectTarget}</p>
                      ) : (
                         <>
                            {t.app.initiativeDesc}
                            <span className="block mt-1 opacity-75"><a href="mailto:privacy@engram.connectome.name" className="hover:text-[var(--color-brand-glow)] hover:underline cursor-pointer transition-colors text-white">privacy@engram.connectome.name</a></span>
                         </>
                      )}
                  </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Actuator/Composer */}
        <section id="composer-section" className="order-1 md:order-2 flex-[1.5] flex flex-col min-h-0 md:min-h-0 min-h-[100dvh] scroll-mt-4">
          <Composer
            broker={selectedBroker}
            profile={profile}
            onRequestDirectory={() => setActiveView('brokers')}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider sm:tracking-widest text-[var(--color-brand-primary)]/70">
          <div className="flex items-center gap-1.5 sm:gap-6 min-w-0 flex-1">
            <button
              onClick={focusForm}
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer whitespace-nowrap ${activeView === 'form' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.form}
            </button>
            <span className="opacity-30">/</span>
            <button
              onClick={() => selectView('brokers')}
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer whitespace-nowrap ${activeView === 'brokers' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.directorySearch}
            </button>
            <span className="opacity-30">/</span>
            <button
              onClick={() => selectView('tldr')}
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer whitespace-nowrap ${activeView === 'tldr' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.tldrContext}
            </button>
            <span className="opacity-30">/</span>
            <button
              onClick={() => selectView('policy')}
              className={`hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer whitespace-nowrap ${activeView === 'policy' ? 'text-[var(--color-brand-glow)] font-bold' : ''}`}
            >
              {t.app.directivePolicy}
            </button>
          </div>

          <button
            onClick={toggleLanguage}
            className="shrink-0 flex items-center gap-1 sm:gap-2 hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer px-1.5 sm:px-2 py-1 rounded border border-transparent hover:border-[var(--color-brand-element)]"
          >
            <Globe size={12} className="sm:hidden" />
            <Globe size={14} className="hidden sm:inline" />
            <span className={currentLang === 'en' ? 'text-[var(--color-brand-glow)] font-bold' : ''}>EN</span>
            <span className="opacity-30">|</span>
            <span className={currentLang === 'pl' ? 'text-[var(--color-brand-glow)] font-bold' : ''}>PL</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
