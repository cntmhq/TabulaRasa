/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOMAILPROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Minimal surface of Google Identity Services we actually call. Loaded at
// runtime from https://accounts.google.com/gsi/client.
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken(): void;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient;
      };
    };
  };
}
