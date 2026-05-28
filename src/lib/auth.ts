import { useCallback, useEffect, useRef, useState } from 'react';
import { SchemaPerson } from '../types';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export const useGoogleAuth = (onLoginSuccess: (profileUpdates: Partial<SchemaPerson>) => void) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<any>(null);

  // Hold the latest onLoginSuccess in a ref so the bootstrap effect doesn't
  // re-run (which previously re-appended <script> tags on every render).
  const callbackRef = useRef(onLoginSuccess);
  useEffect(() => {
    callbackRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Client ID not configured.");
      console.warn("VITE_GOOGLE_CLIENT_ID is missing from environment variables.");
      return;
    }

    const initClient = () => {
      if (!window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            setError(tokenResponse.error);
            return;
          }
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
            });
            if (!userInfoRes.ok) throw new Error('Failed to fetch user info');
            const data = await userInfoRes.json();
            callbackRef.current({
              identifier: data.sub,
              givenName: data.given_name,
              familyName: data.family_name || "",
              email: data.email,
              image: data.picture,
              authProvider: "google",
              authState: {
                isAuthenticated: true,
                tokenExpiry: Date.now() + (tokenResponse.expires_in * 1000)
              },
              preferences: {
                autoFillSignature: true
              }
            });
          } catch (err: any) {
            console.error("Failed to fetch Google profile", err);
            setError(err.message || "Failed to fetch profile.");
          }
        },
      });
      setIsReady(true);
    };

    // GIS already on the page? skip the network round-trip.
    if (window.google?.accounts?.oauth2) {
      initClient();
      return;
    }

    // Reuse an in-flight script tag instead of appending a duplicate.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', initClient, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', initClient, { once: true });
    document.head.appendChild(script);
  }, []);

  const signIn = useCallback(() => {
    if (!isReady || !tokenClientRef.current) return;
    tokenClientRef.current.requestAccessToken();
  }, [isReady]);

  return { isReady, signIn, error };
};
