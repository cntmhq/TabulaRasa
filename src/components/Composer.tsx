import { useState, useEffect } from 'react';
import { SchemaOrganization, SchemaPerson } from '../types';
import { Send, Copy, CheckCircle2, UserCircle2 } from 'lucide-react';
import { getTranslation } from '../locales';

interface ComposerProps {
  broker: SchemaOrganization | null;
  profile: SchemaPerson;
}

export function Composer({ broker, profile }: ComposerProps) {
  const isAuth = profile.authState.isAuthenticated;
  const autoFillEnabled = isAuth && profile.preferences.autoFillSignature;

  // Manual inputs fallback
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');

  const [copied, setCopied] = useState(false);
  const [customBody, setCustomBody] = useState<string | null>(null);

  // Derived info based on auth and preferences
  const activeFirstName = autoFillEnabled ? profile.givenName : manualFirstName;
  const activeLastName = autoFillEnabled ? profile.familyName : manualLastName;
  const activeFullName = `${activeFirstName} ${activeLastName}`.trim();
  const activeEmail = autoFillEnabled ? profile.email : "[Your Email]";
  
  const t = getTranslation(profile.preferences.language);
  
  useEffect(() => {
    let timeoutId: any;
    if (copied) {
      timeoutId = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(timeoutId);
  }, [copied]);

  useEffect(() => {
    setCustomBody(null);
  }, [broker?.identifier, profile.preferences.language]);

  if (!broker) {
    return (
      <div className="h-full min-h-[400px] border border-[var(--color-brand-element)] border-dashed rounded-xl flex flex-col items-center justify-center text-center p-8 bg-[var(--color-brand-dark)]/50">
        <div className="w-16 h-16 rounded-full border border-[var(--color-brand-element)] flex items-center justify-center mb-4 text-[var(--color-brand-primary)]/50">
           <Send size={24} />
        </div>
        <h3 className="text-lg font-mono text-[var(--color-brand-primary)]/70 uppercase tracking-widest mb-2">{t.composer.awaitingTarget}</h3>
        <p className="text-sm font-mono text-[var(--color-brand-primary)]/50 max-w-sm mx-auto">{t.composer.selectTargetPrompt}</p>
      </div>
    );
  }

  const subject = t.composer.subjectLine.replace('{name}', broker.name);
  const translatedContactName = t.brokers?.roles[broker.contactPoint.name as keyof typeof t.brokers.roles] || broker.contactPoint.name;
  
  const defaultBody = `${t.composer.greeting.replace('{name}', translatedContactName)}

${t.composer.body1.replace('{name}', broker.name)}

${t.composer.body2}

${t.composer.body3}

${t.composer.body4}

${t.composer.body5}

${t.composer.signOff}

${activeFullName || '[Your Name]'}
${activeEmail}`;

  const bodyToUse = customBody !== null ? customBody : defaultBody;

  const mailtoLink = `mailto:${broker.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyToUse)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bodyToUse);
      setCopied(true);
    } catch (err) {
      console.error("Clipboard access failed", err);
    }
  };

  return (
    <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-primary)] shadow-[0_0_30px_rgba(22,137,115,0.1)] rounded-xl overflow-hidden flex flex-col h-full">
      <div className="bg-[var(--color-brand-dark)] border-b border-[var(--color-brand-element)] p-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-glow)] shadow-[0_0_8px_rgba(82,209,184,0.8)] animate-pulse" />
            <h2 className="text-sm font-mono tracking-widest uppercase text-[var(--color-brand-glow)]">{t.composer.protocolActive}</h2>
         </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {!autoFillEnabled && (
          <div className="mb-6 p-4 border border-[var(--color-brand-element)] rounded-lg bg-[var(--color-brand-dark)] space-y-4">
             <div className="flex items-center gap-2 text-sm font-mono text-[var(--color-brand-primary)] uppercase">
                <UserCircle2 size={16} /> {t.composer.guestMode}
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <input 
                   type="text" 
                   placeholder={t.composer.firstName} 
                   value={manualFirstName}
                   onChange={(e) => setManualFirstName(e.target.value)}
                   className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brand-primary)] transition-colors text-[var(--color-brand-glow)] font-mono"
                 />
               </div>
               <div>
                 <input 
                   type="text" 
                   placeholder={t.composer.lastName}
                   value={manualLastName}
                   onChange={(e) => setManualLastName(e.target.value)}
                   className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brand-primary)] transition-colors text-[var(--color-brand-glow)] font-mono"
                 />
               </div>
             </div>
          </div>
        )}

        {autoFillEnabled && (
          <div className="mb-6 p-4 border border-dashed border-[var(--color-brand-primary)]/50 rounded-lg bg-[var(--color-brand-primary)]/5 flex items-center gap-3">
             <CheckCircle2 size={18} className="text-[var(--color-brand-primary)]" />
             <div className="text-sm font-mono opacity-80">
                <span className="text-[var(--color-brand-primary)]">{t.composer.autoFillActive}</span> {t.composer.usingIdentityModule} {activeFullName}
             </div>
          </div>
        )}

        <div className="space-y-4 font-mono text-sm">
          <div className="space-y-1">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">{t.composer.to}</span>
             <div className="bg-[var(--color-brand-dark)] p-2 rounded border border-[var(--color-brand-element)]">{broker.email}</div>
          </div>
          <div className="space-y-1">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">{t.composer.subject}</span>
             <div className="bg-[var(--color-brand-dark)] p-2 rounded border border-[var(--color-brand-element)]">{subject}</div>
          </div>
          <div className="space-y-1">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">{t.composer.payload}</span>
             <textarea 
               value={bodyToUse}
               onChange={(e) => setCustomBody(e.target.value)}
               className="w-full bg-[var(--color-brand-dark)] p-4 rounded border border-[var(--color-brand-element)] whitespace-pre-wrap leading-relaxed opacity-90 h-[280px] overflow-y-auto focus:border-[var(--color-brand-primary)] focus:outline-none transition-colors resize-y font-mono text-sm"
               spellCheck={false}
             />
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-brand-element)] p-4 bg-[var(--color-brand-dark)] flex items-center justify-end gap-3 z-10">
         <button 
           onClick={handleCopy}
           className="px-5 py-2.5 rounded bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] hover:border-[var(--color-brand-primary)] text-sm font-mono uppercase tracking-widest text-[var(--color-brand-primary)] transition-all flex items-center gap-2 cursor-pointer"
         >
           {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
           {copied ? t.composer.copied : t.composer.copyRaw}
         </button>
         <a 
           href={mailtoLink}
           className="px-6 py-2.5 rounded bg-[var(--color-brand-primary)] text-[var(--color-brand-dark)] hover:bg-[var(--color-brand-glow)] shadow-[0_0_15px_rgba(22,137,115,0.4)] text-sm font-bold font-mono uppercase tracking-widest transition-all focus:outline-none flex items-center gap-2 cursor-pointer"
         >
           <Send size={16} className="-mt-0.5" />
           {t.composer.executeMailto}
         </a>
      </div>
    </div>
  );
}
