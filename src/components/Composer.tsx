import { useState, useEffect } from 'react';
import { SchemaOrganization, SchemaPerson } from '../types';
import { Send, Copy, CheckCircle2, UserCircle2 } from 'lucide-react';

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

  // Derived info based on auth and preferences
  const activeFirstName = autoFillEnabled ? profile.givenName : manualFirstName;
  const activeLastName = autoFillEnabled ? profile.familyName : manualLastName;
  const activeFullName = `${activeFirstName} ${activeLastName}`.trim();
  const activeEmail = autoFillEnabled ? profile.email : "[Your Email]";
  
  useEffect(() => {
    let t: any;
    if (copied) {
      t = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(t);
  }, [copied]);

  if (!broker) {
    return (
      <div className="h-full min-h-[400px] border border-[var(--color-brand-element)] border-dashed rounded-xl flex flex-col items-center justify-center text-center p-8 bg-[var(--color-brand-dark)]/50">
        <div className="w-16 h-16 rounded-full border border-[var(--color-brand-element)] flex items-center justify-center mb-4 text-[var(--color-brand-primary)]/50">
           <Send size={24} />
        </div>
        <h3 className="text-lg font-mono text-[var(--color-brand-primary)] uppercase tracking-widest mb-2">Awaiting Target</h3>
        <p className="text-sm font-mono opacity-60 max-w-sm mx-auto">Select a data broker entity from the catalog to initialize the erasure protocol sequence.</p>
      </div>
    );
  }

  const subject = `Opt-Out Request: ${broker.name}`;
  const body = `Dear ${broker.contactPoint.name},

I am writing to formally request the deletion of all my personal data from your systems in accordance with Article 17 of the GDPR (Right to Erasure).

Please confirm receipt of this request and provide a timeline for completion as required under GDPR regulations (within 30 days).

Thank you for your prompt attention to this matter.

Best regards,
${activeFullName || '[Your Name]'}
${activeEmail}`;

  const mailtoLink = `mailto:${broker.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
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
            <h2 className="text-sm font-mono tracking-widest uppercase text-[var(--color-brand-glow)]">Protocol Active</h2>
         </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {!autoFillEnabled && (
          <div className="mb-6 p-4 border border-[var(--color-brand-element)] rounded-lg bg-[var(--color-brand-dark)] space-y-4">
             <div className="flex items-center gap-2 text-sm font-mono text-[var(--color-brand-primary)] uppercase">
                <UserCircle2 size={16} /> Guest Mode: Manual Input required
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <input 
                   type="text" 
                   placeholder="First Name" 
                   value={manualFirstName}
                   onChange={(e) => setManualFirstName(e.target.value)}
                   className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brand-primary)] transition-colors text-[var(--color-brand-glow)] font-mono"
                 />
               </div>
               <div>
                 <input 
                   type="text" 
                   placeholder="Last Name" 
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
                <span className="text-[var(--color-brand-primary)]">Auto-fill active</span> using Identity Module: {activeFullName}
             </div>
          </div>
        )}

        <div className="space-y-4 font-mono text-sm">
          <div className="space-y-1">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">TO:</span>
             <div className="bg-[var(--color-brand-dark)] p-2 rounded border border-[var(--color-brand-element)]">{broker.email}</div>
          </div>
          <div className="space-y-1">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">SUBJECT:</span>
             <div className="bg-[var(--color-brand-dark)] p-2 rounded border border-[var(--color-brand-element)]">{subject}</div>
          </div>
          <div className="space-y-1">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">PAYLOAD:</span>
             <div className="bg-[var(--color-brand-dark)] p-4 rounded border border-[var(--color-brand-element)] whitespace-pre-wrap leading-relaxed opacity-90 h-[280px] overflow-y-auto">
                {body}
             </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-brand-element)] p-4 bg-[var(--color-brand-dark)] flex items-center justify-end gap-3 z-10">
         <button 
           onClick={handleCopy}
           className="px-5 py-2.5 rounded bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] hover:border-[var(--color-brand-primary)] text-sm font-mono uppercase tracking-widest text-[var(--color-brand-primary)] transition-all flex items-center gap-2"
         >
           {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
           {copied ? "Copied" : "Copy Raw"}
         </button>
         <a 
           href={mailtoLink}
           className="px-6 py-2.5 rounded bg-[var(--color-brand-primary)] text-[var(--color-brand-dark)] hover:bg-[var(--color-brand-glow)] shadow-[0_0_15px_rgba(22,137,115,0.4)] text-sm font-bold font-mono uppercase tracking-widest transition-all focus:outline-none flex items-center gap-2"
         >
           <Send size={16} className="-mt-0.5" />
           Execute Mailto
         </a>
      </div>
    </div>
  );
}
