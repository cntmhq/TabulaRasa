import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { SchemaPerson } from '../types';
import { getTranslation } from '../locales';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchemaPerson;
  onUpdatePreferences: (prefs: Partial<SchemaPerson["preferences"]>) => void;
}

export function ProfileModal({ isOpen, onClose, profile, onUpdatePreferences }: ProfileModalProps) {
  const [autoFill, setAutoFill] = useState(profile.preferences.autoFillSignature);

  const t = getTranslation(profile.preferences.language);
  
  const handleSave = () => {
    onUpdatePreferences({ autoFillSignature: autoFill });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[var(--color-brand-surface)] border border-[var(--color-brand-primary)] shadow-[0_0_30px_rgba(22,137,115,0.15)] rounded-xl overflow-hidden text-[var(--color-brand-glow)]"
          >
            <div className="px-6 py-4 border-b border-[var(--color-brand-element)] flex items-center justify-between bg-[var(--color-brand-dark)]">
              <h2 className="text-lg font-mono tracking-wider uppercase text-[var(--color-brand-primary)]">{t.profile.configuration}</h2>
              <button 
                onClick={onClose}
                className="text-[var(--color-brand-primary)] hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-mono tracking-widest text-[var(--color-brand-primary)] uppercase opacity-80">{t.profile.identityVector}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono opacity-60 mb-1 block">{t.profile.fullNameOverride}</label>
                    <div className="px-3 py-2 bg-[var(--color-brand-dark)] border border-[var(--color-brand-element)] rounded opacity-70">
                      {profile.givenName || "-"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono opacity-60 mb-1 block">{t.profile.provideLegalName}</label>
                    <div className="px-3 py-2 bg-[var(--color-brand-dark)] border border-[var(--color-brand-element)] rounded opacity-70">
                      {profile.familyName || "-"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-mono opacity-60 mb-1 block">{t.profile.emailOverride}</label>
                    <div className="px-3 py-2 bg-[var(--color-brand-dark)] border border-[var(--color-brand-element)] rounded opacity-70">
                      {profile.email || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-mono tracking-widest text-[var(--color-brand-primary)] uppercase opacity-80">{t.profile.useSpecificEmail}</h3>
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={autoFill}
                      onChange={(e) => setAutoFill(e.target.checked)}
                    />
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${autoFill ? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)]' : 'bg-[var(--color-brand-dark)] border-[var(--color-brand-element)] group-hover:border-[var(--color-brand-primary)]'}`}>
                      {autoFill && <Check size={14} className="text-[var(--color-brand-dark)]" />}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium mb-1">{t.profile.operationalParameters}</span>
                    <span className="block text-xs opacity-70 font-mono">{t.profile.autoBccArchive}</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--color-brand-dark)] border-t border-[var(--color-brand-element)] flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-mono uppercase tracking-wider text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-element)] rounded transition-colors cursor-pointer"
              >
                {t.profile.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="px-5 py-2 text-sm font-mono uppercase tracking-wider bg-[var(--color-brand-primary)] text-[var(--color-brand-dark)] hover:bg-[var(--color-brand-glow)] shadow-[0_0_15px_rgba(22,137,115,0.4)] rounded transition-all font-bold cursor-pointer"
              >
                {t.profile.applyChanges}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
