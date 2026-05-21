import { useState } from 'react';
import { useStore } from './lib/store';
import { Header } from './components/Header';
import { BrokerCard } from './components/BrokerCard';
import { Composer } from './components/Composer';
import { ProfileModal } from './components/ProfileModal';
import { brokers } from './data/brokers';
import { SchemaOrganization } from './types';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const { profile, updateProfile, updatePreferences, signOut } = useStore();
  const [selectedBroker, setSelectedBroker] = useState<SchemaOrganization | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col font-sans relative selection:bg-[var(--color-brand-primary)] selection:text-[var(--color-brand-dark)]">
      {/* Decorative background grid and gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(var(--color-brand-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[var(--color-brand-primary)]/5 to-transparent h-[400px] z-0" />

      <Header 
        profile={profile} 
        onLogin={updateProfile}
        onSignOut={signOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10 flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Catalog */}
        <section className="w-full md:w-1/3 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-mono uppercase tracking-widest text-[var(--color-brand-glow)]">Data Harvesters</h2>
            <div className="h-px bg-gradient-to-r from-[var(--color-brand-element)] to-transparent flex-1" />
          </div>

          <div className="bg-[var(--color-brand-dark)]/80 backdrop-blur border border-[var(--color-brand-element)] rounded-xl p-4 flex-1">
            <div className="mb-4 text-xs font-mono opacity-60 flex items-center justify-between px-2 uppercase text-[var(--color-brand-primary)] tracking-wider">
               <span>Directory List</span>
               <span>{brokers.length} Found</span>
            </div>
            
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 pb-2">
              {brokers.map(broker => (
                <BrokerCard
                  key={broker.identifier}
                  broker={broker}
                  isSelected={selectedBroker?.identifier === broker.identifier}
                  onSelect={setSelectedBroker}
                />
              ))}
            </div>

            <div className="mt-6 p-4 border border-[var(--color-brand-primary)]/20 rounded bg-gradient-to-br from-[var(--color-brand-primary)]/5 to-transparent flex gap-3 text-[var(--color-brand-primary)]">
               <ShieldAlert size={20} className="shrink-0 mt-0.5" />
               <p className="text-xs font-mono leading-relaxed opacity-80">
                 Select a target from the directory to construct a compliant GDPR Article 17 erasure request. Ensure you review the payload before sending.
               </p>
            </div>
          </div>
        </section>

        {/* Right Column: Actuator/Composer */}
        <section className="w-full md:w-2/3 h-full min-h-[600px] flex flex-col">
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
    </div>
  );
}
