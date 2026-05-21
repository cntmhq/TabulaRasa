import { useEffect, useState } from 'react';
import { SchemaPerson } from '../types';

export const useGoogleAuth = (onLoginSuccess: (profileUpdates: Partial<SchemaPerson>) => void) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      setError("Google Client ID not configured.");
      console.warn("VITE_GOOGLE_CLIENT_ID is missing from environment variables.");
      return;
    }

    const loadScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google?.accounts?.oauth2) {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error !== undefined) {
                setError(tokenResponse.error);
                return;
              }
              
              try {
                // Fetch the user info using the access token
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${tokenResponse.access_token}`
                  }
                });
                
                if (!userInfoRes.ok) throw new Error('Failed to fetch user info');
                
                const data = await userInfoRes.json();
                
                onLoginSuccess({
                  identifier: data.sub,
                  givenName: data.given_name,
                  familyName: data.family_name || "",
                  email: data.email,
                  image: data.picture,
                  authProvider: "google",
                  authState: {
                    isAuthenticated: true,
                    // Token client returns access_token that expires in ~3600 seconds
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
          setTokenClient(client);
          setIsReady(true);
        }
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, [onLoginSuccess]);

  const signIn = () => {
    if (!isReady || !tokenClient) return;
    tokenClient.requestAccessToken();
  };

  return { isReady, signIn, error };
};
