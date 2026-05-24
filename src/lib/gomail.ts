import { useCallback, useEffect, useMemo, useState } from 'react';

export type GmailConsentStatus = 'unknown' | 'pending_auth' | 'active' | 'suspended';

interface OnboardResponse {
  user_email: string;
  auth_uri: string;
}

interface StatusResponse {
  user_email: string;
  status: GmailConsentStatus;
  updated_at?: string;
}

interface SendResponse {
  status: 'success';
  message_id: string;
  thread_id?: string;
  dispatched_at: string;
}

export interface SendPayload {
  senderIdentity: string;
  recipientAddress: string;
  subjectLine: string;
  bodyContentPlain: string;
  bodyContentHtml?: string;
}

const STORAGE_KEY = 'tabulaRasa_gmailConsent';

function getBaseUrl(): string | null {
  const url = import.meta.env.VITE_GOMAILPROXY_URL;
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\/$/, '');
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

async function fetchAuthUri(base: string, userEmail: string): Promise<string> {
  const res = await fetch(`${base}/api/v1/accounts/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_email: userEmail }),
  });
  const body = await jsonOrThrow<OnboardResponse>(res);
  return body.auth_uri;
}

async function fetchStatus(base: string, userEmail: string): Promise<GmailConsentStatus> {
  const url = new URL(`${base}/api/v1/accounts/status`);
  url.searchParams.set('user_email', userEmail);
  const res = await fetch(url.toString());
  const body = await jsonOrThrow<StatusResponse>(res);
  return body.status;
}

async function sendThroughProxy(base: string, payload: SendPayload): Promise<SendResponse> {
  const res = await fetch(`${base}/api/v1/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': payload.senderIdentity,
    },
    body: JSON.stringify({
      sender_identity: payload.senderIdentity,
      recipient_address: payload.recipientAddress,
      subject_line: payload.subjectLine,
      body_content_plain: payload.bodyContentPlain,
      body_content_html: payload.bodyContentHtml ?? '',
    }),
  });
  return jsonOrThrow<SendResponse>(res);
}

interface CachedConsent {
  email: string;
  status: GmailConsentStatus;
  checkedAt: number;
}

function readCache(email: string): CachedConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedConsent;
    if (parsed.email !== email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable in private modes; ignore.
  }
}

export function useGmailConsent(userEmail: string | null) {
  const base = useMemo(() => getBaseUrl(), []);
  const enabled = Boolean(base && userEmail);

  const [status, setStatus] = useState<GmailConsentStatus>('unknown');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !userEmail || !base) return;
    try {
      const s = await fetchStatus(base, userEmail);
      setStatus(s);
      writeCache({ email: userEmail, status: s, checkedAt: Date.now() });
    } catch (err: any) {
      setError(err.message || 'status check failed');
    }
  }, [base, enabled, userEmail]);

  useEffect(() => {
    if (!enabled || !userEmail) {
      setStatus('unknown');
      return;
    }
    const cached = readCache(userEmail);
    if (cached) setStatus(cached.status);
    refresh();
  }, [enabled, userEmail, refresh]);

  // Listen for the OAuth callback redirect query params: APP_URL?gmail=connected
  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('gmail');
    if (flag) {
      params.delete('gmail');
      params.delete('detail');
      const next = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', next);
      if (flag === 'connected') {
        refresh();
      } else {
        setError(params.get('detail') || `Gmail consent ${flag}`);
      }
    }
  }, [enabled, refresh]);

  const connect = useCallback(async () => {
    if (!base || !userEmail) {
      setError('Gmail proxy not configured');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const authUri = await fetchAuthUri(base, userEmail);
      // Full-page redirect in the same tab. Google takes over the window,
      // the backend's /oauth/callback redirects back to APP_URL?gmail=connected,
      // and the query-param effect below picks that up to refresh status.
      window.location.assign(authUri);
    } catch (err: any) {
      setError(err.message || 'failed to start consent');
      setBusy(false);
    }
  }, [base, userEmail]);

  const disconnect = useCallback(async () => {
    if (!base || !userEmail) return;
    setBusy(true);
    try {
      const url = new URL(`${base}/api/v1/accounts`);
      url.searchParams.set('user_email', userEmail);
      const res = await fetch(url.toString(), { method: 'DELETE' });
      await jsonOrThrow(res);
      setStatus('unknown');
      writeCache({ email: userEmail, status: 'unknown', checkedAt: Date.now() });
    } catch (err: any) {
      setError(err.message || 'failed to revoke');
    } finally {
      setBusy(false);
    }
  }, [base, userEmail]);

  const send = useCallback(async (payload: SendPayload) => {
    if (!base) throw new Error('Gmail proxy not configured');
    return sendThroughProxy(base, payload);
  }, [base]);

  const clearError = useCallback(() => setError(null), []);

  return {
    available: Boolean(base),
    status,
    busy,
    error,
    refresh,
    connect,
    disconnect,
    send,
    clearError,
  };
}
