import { useState, useEffect, useMemo, useRef } from 'react';
import { SchemaOrganization, SchemaPerson } from '../types';
import { Send, Copy, CheckCircle2, UserCircle2, ChevronDown, Mail, Link2, Unlink, Loader2 } from 'lucide-react';
import { getTranslation } from '../locales';
import { useGmailConsent } from '../lib/gomail';
import { getDraft, setDraft } from '../lib/session';

const LINE_WIDTH = 52;
const NBSP = ' ';

// Polish orphan words that must not sit alone at the end of a line:
// single-letter prepositions/conjunctions (a, i, o, u, w, z) plus the
// common two-letter ones (na, do, ze, we, po, za, co, że, by).
const PL_ORPHANS_RE = /(?<=\s|^)([iaouwz]|na|do|ze|we|po|za|co|że|by|ale|aby)[ \t]+/gi;

// English orphans: articles, the pronoun "I", short prepositions and
// conjunctions where a line-end break reads as "weak" or choppy.
// Articles: a, an, the. Pronoun: I. Prepositions: of, to, in, on, at,
// by, as, with. Conjunctions: and, or, but, for, nor, if. Plus the
// copula "is", the pronoun "it", and the negation "no".
const EN_ORPHANS_RE = /(?<=\s|^)([aI]|an|the|of|to|in|on|at|by|is|it|or|as|if|no|and|but|for|nor|with)[ \t]+/gi;

// Replace the trailing space after an orphan word with a non-breaking space
// so the wrapper treats "orphan + next word" as a single inseparable token.
function glueOrphans(text: string, lang: string | undefined): string {
  const re = lang === 'pl' ? PL_ORPHANS_RE : EN_ORPHANS_RE;
  return text.replace(re, `$1${NBSP}`);
}

// Greedy word-wrap on whitespace. A single word longer than the width is
// emitted on its own line rather than mid-broken — keeps URLs, email
// addresses, and orphan-glued tokens intact. Splits only on ASCII space/tab
// so non-breaking spaces (NBSP) survive as part of their token.
function wrapParagraph(text: string, width: number): string {
  const words = text.split(/[ \t]+/).filter(Boolean);
  if (words.length === 0) return '';
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

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
  const [customBody, setCustomBody] = useState<string | null>(() =>
    broker ? getDraft(broker.identifier) : null
  );
  const [gmailNotice, setGmailNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Tracks which broker the current customBody belongs to so a broker switch
  // doesn't clobber the just-loaded draft for the new broker.
  const hydratedBrokerRef = useRef<string | null>(broker?.identifier ?? null);

  const consentEmail = isAuth ? profile.email : null;
  const gmail = useGmailConsent(consentEmail);

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
    setGmailNotice(null);
    if (!broker) {
      hydratedBrokerRef.current = null;
      setCustomBody(null);
      return;
    }
    if (hydratedBrokerRef.current === broker.identifier) return;
    setCustomBody(getDraft(broker.identifier));
    hydratedBrokerRef.current = broker.identifier;
  }, [broker?.identifier]);

  useEffect(() => {
    if (!broker) return;
    if (hydratedBrokerRef.current !== broker.identifier) return;
    setDraft(broker.identifier, customBody);
  }, [customBody, broker?.identifier]);

  useEffect(() => {
    if (gmail.error) {
      setGmailNotice({ kind: 'error', text: gmail.error });
      gmail.clearError();
    }
  }, [gmail.error, gmail.clearError]);

  const defaultBody = useMemo(() => {
    if (!broker) return '';
    const lang = profile.preferences.language;
    const translatedContactName =
      t.brokers?.roles[broker.contactPoint.name as keyof typeof t.brokers.roles] || broker.contactPoint.name;
    const paragraphs = [
      t.composer.greeting.replace('{name}', translatedContactName),
      t.composer.body1.replace('{name}', broker.name),
      t.composer.body2,
      t.composer.body3,
      t.composer.body4,
      t.composer.body5,
      t.composer.signOff,
    ].map(p => wrapParagraph(glueOrphans(p, lang), LINE_WIDTH));
    const signature = `${activeFullName || '[Your Name]'}\n${activeEmail}`;
    return `${paragraphs.join('\n\n')}\n\n${signature}`;
  }, [broker, t, activeFullName, activeEmail, profile.preferences.language]);

  if (!broker) {
    return (
      <div className="h-full min-h-[400px] border border-[var(--color-brand-element)] border-dashed rounded-xl flex flex-col items-center justify-center text-center p-8 bg-[var(--color-brand-dark)]/50">
        <div className="w-16 h-16 rounded-full border border-[var(--color-brand-element)] flex items-center justify-center mb-4 text-[var(--color-brand-primary)]/50">
           <Send size={24} />
        </div>
        <h3 className="text-lg font-mono text-[var(--color-brand-primary)]/70 uppercase tracking-widest mb-2">{t.composer.awaitingTarget}</h3>
        <p className="text-sm font-mono text-[var(--color-brand-primary)]/50 max-w-sm mx-auto">{t.composer.selectTargetPrompt}</p>

        <button
          type="button"
          onClick={() => document.getElementById('directory-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="md:hidden mt-8 flex flex-col items-center gap-2 text-[var(--color-brand-glow)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 rounded-md px-3 py-2"
        >
          <span className="text-xs font-mono uppercase tracking-widest">{t.composer.scrollToDirectory}</span>
          <ChevronDown size={28} className="animate-bounce drop-shadow-[0_0_8px_var(--color-brand-glow)]" />
        </button>
      </div>
    );
  }

  const subject = t.composer.subjectLine.replace('{name}', broker.name);

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

  const canUseGmail = isAuth && gmail.available;
  const gmailActive = gmail.status === 'active';

  const handleSendGmail = async () => {
    if (!isAuth || !broker) return;
    setGmailNotice(null);
    setSending(true);
    try {
      const result = await gmail.send({
        senderIdentity: profile.email,
        recipientAddress: broker.email,
        subjectLine: subject,
        bodyContentPlain: bodyToUse,
      });
      setGmailNotice({
        kind: 'success',
        text: `${t.composer.gmailDispatched} ${result.message_id}`,
      });
    } catch (err: any) {
      setGmailNotice({ kind: 'error', text: err?.message || t.composer.gmailFailed });
      gmail.refresh();
    } finally {
      setSending(false);
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

      <div className="p-6 overflow-hidden flex-1 flex flex-col min-h-0">
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

        <div className="space-y-4 font-mono text-sm flex flex-col flex-1 min-h-0">
          <div className="space-y-1 shrink-0">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">{t.composer.to}</span>
             <div className="bg-[var(--color-brand-dark)] p-2 rounded border border-[var(--color-brand-element)]">{broker.email}</div>
          </div>
          <div className="space-y-1 shrink-0">
             <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">{t.composer.subject}</span>
             <div className="bg-[var(--color-brand-dark)] p-2 rounded border border-[var(--color-brand-element)]">{subject}</div>
          </div>
          <div className="space-y-1 flex flex-col flex-1 min-h-0">
             <div className="flex items-center justify-between shrink-0">
               <span className="text-[var(--color-brand-primary)] opacity-60 text-xs">{t.composer.payload}</span>
               {customBody !== null && (
                 <button
                   type="button"
                   onClick={() => setCustomBody(null)}
                   className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-brand-primary)]/60 hover:text-[var(--color-brand-glow)] transition-colors cursor-pointer px-2 py-0.5 rounded border border-transparent hover:border-[var(--color-brand-element)]"
                 >
                   {t.composer.resetTemplate}
                 </button>
               )}
             </div>
             <textarea
               value={bodyToUse}
               onChange={(e) => setCustomBody(e.target.value)}
               className="flex-1 min-h-0 w-full bg-[var(--color-brand-dark)] p-4 rounded border border-[var(--color-brand-element)] whitespace-pre-wrap leading-relaxed opacity-90 overflow-y-auto focus:border-[var(--color-brand-primary)] focus:outline-none transition-colors resize-none font-mono text-sm"
               spellCheck={false}
             />
          </div>
        </div>
      </div>

      {canUseGmail && (
        <div className="border-t border-[var(--color-brand-element)] px-4 py-3 bg-[var(--color-brand-dark)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[var(--color-brand-primary)] opacity-90">
            <Mail size={14} />
            {gmailActive ? (
              <span><span className="text-[var(--color-brand-glow)]">{t.composer.gmailLinked}</span> {profile.email}</span>
            ) : gmail.status === 'suspended' ? (
              <span className="text-amber-400">{t.composer.gmailSuspended}</span>
            ) : (
              <span>{t.composer.gmailNotLinked}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {gmailActive ? (
              <button
                onClick={gmail.disconnect}
                disabled={gmail.busy}
                className="px-3 py-1.5 rounded border border-[var(--color-brand-element)] hover:border-red-400 text-xs uppercase tracking-widest text-red-400 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Unlink size={12} /> {t.composer.gmailRevoke}
              </button>
            ) : (
              <button
                onClick={gmail.connect}
                disabled={gmail.busy}
                className="px-3 py-1.5 rounded border border-[var(--color-brand-primary)] hover:border-[var(--color-brand-glow)] text-xs uppercase tracking-widest text-[var(--color-brand-primary)] hover:text-[var(--color-brand-glow)] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {gmail.busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                {t.composer.gmailConnect}
              </button>
            )}
          </div>
        </div>
      )}

      {gmailNotice && (
        <div className={`border-t px-4 py-2 text-xs font-mono flex items-start gap-2 ${gmailNotice.kind === 'success' ? 'border-[var(--color-brand-primary)]/40 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-glow)]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
          {gmailNotice.kind === 'success' ? <CheckCircle2 size={14} className="mt-0.5" /> : <Unlink size={14} className="mt-0.5" />}
          <span className="break-all">{gmailNotice.text}</span>
        </div>
      )}

      <div className="border-t border-[var(--color-brand-element)] p-4 bg-[var(--color-brand-dark)] flex flex-wrap items-center justify-end gap-3 z-10">
         <button
           onClick={handleCopy}
           className="px-5 py-2.5 rounded bg-[var(--color-brand-surface)] border border-[var(--color-brand-element)] hover:border-[var(--color-brand-primary)] text-sm font-mono uppercase tracking-widest text-[var(--color-brand-primary)] transition-all flex items-center gap-2 cursor-pointer"
         >
           {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
           {copied ? t.composer.copied : t.composer.copyRaw}
         </button>
         {canUseGmail && gmailActive && (
           <button
             onClick={handleSendGmail}
             disabled={sending}
             className="px-6 py-2.5 rounded bg-[var(--color-brand-surface)] border border-[var(--color-brand-primary)] hover:border-[var(--color-brand-glow)] text-sm font-bold font-mono uppercase tracking-widest text-[var(--color-brand-glow)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
           >
             {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
             {sending ? t.composer.gmailSending : t.composer.gmailSend}
           </button>
         )}
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
