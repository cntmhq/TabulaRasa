import { useEffect, useSyncExternalStore } from 'react';

export type Language = 'en' | 'pl';

const cache: Partial<Record<Language, any>> = {};
const subs = new Set<() => void>();

const loaders: Record<Language, () => Promise<any>> = {
  en: () => import('./en'),
  pl: () => import('./pl'),
};

function normalize(lang: string | undefined): Language {
  return lang === 'en' ? 'en' : 'pl';
}

export async function loadLocale(lang: Language): Promise<any> {
  if (cache[lang]) return cache[lang];
  const mod = await loaders[lang]();
  cache[lang] = mod.default;
  subs.forEach((fn) => fn());
  return cache[lang];
}

export function pickInitialLang(): Language {
  try {
    const raw = localStorage.getItem('engram_userProfile');
    if (raw) {
      const stored = JSON.parse(raw)?.preferences?.language;
      if (stored === 'pl' || stored === 'en') return stored;
    }
  } catch {
    // fall through
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'pl';
}

// Synchronous lookup. Returns the requested locale if loaded; otherwise falls back
// to whichever locale is currently in the cache (en is loaded at bootstrap).
export function getTranslation(lang?: string): any {
  const key = normalize(lang);
  return cache[key] ?? cache.pl ?? cache.en;
}

// Ensures the locale for `lang` is loaded; re-renders the calling component when it lands.
export function useLocaleEnsured(lang: string | undefined): void {
  const key = normalize(lang);
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => cache[key] ?? null,
    () => null,
  );
  useEffect(() => {
    if (!cache[key]) loadLocale(key);
  }, [key]);
}
