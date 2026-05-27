import internalUsers from '../data/internalUsers.json';

const normalized = new Set(
  (internalUsers.emails as string[]).map(e => e.trim().toLowerCase())
);

export const isInternalUser = (email?: string | null): boolean => {
  if (!email) return false;
  return normalized.has(email.trim().toLowerCase());
};
