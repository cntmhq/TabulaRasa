import { useCallback, useEffect, useState } from 'react';
import { SchemaPerson } from '../types';

const STORAGE_KEY = 'engram_userProfile';

const generateGuestProfile = (): SchemaPerson => ({
  "@context": "https://schema.org",
  "@type": "Person",
  identifier: `guest_${Math.random().toString(36).substring(2, 9)}`,
  givenName: "",
  familyName: "",
  email: "",
  authProvider: "guest",
  authState: {
    isAuthenticated: false,
  },
  preferences: {
    autoFillSignature: false,
    manualSignature: "",
    language: "pl"
  }
});

export const useStore = () => {
  const [profile, setProfile] = useState<SchemaPerson>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SchemaPerson;
      }
    } catch (e) {
      console.warn("Could not read local profile, generating guest");
    }
    return generateGuestProfile();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error("Quota exceeded or localStorage unavailable", e);
    }
  }, [profile]);

  const updateProfile = useCallback((updates: Partial<SchemaPerson>) => {
    setProfile(current => ({ ...current, ...updates }));
  }, []);

  const updatePreferences = useCallback((preferences: Partial<SchemaPerson["preferences"]>) => {
    setProfile(current => ({
      ...current,
      preferences: { ...current.preferences, ...preferences }
    }));
  }, []);

  const signOut = useCallback(() => {
    setProfile(generateGuestProfile());
  }, []);

  return { profile, updateProfile, updatePreferences, signOut };
};
