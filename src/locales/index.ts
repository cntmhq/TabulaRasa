import en from './en';
import pl from './pl';

export const translations = {
  en,
  pl
};

export type Language = 'en' | 'pl';

export function getTranslation(lang?: string) {
  return translations[(lang as Language)] || translations.en;
}
