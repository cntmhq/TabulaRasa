// Small localStorage shims for transient UI state that should survive a full
// page reload (e.g. the OAuth redirect round-trip back from the gomailproxy).
// Profile data lives in store.ts — keep these two concerns separate.

const BROKER_KEY = 'tabulaRasa_selectedBrokerId';
const DRAFT_KEY = 'tabulaRasa_drafts';

export function getStoredBrokerId(): string | null {
  try {
    return localStorage.getItem(BROKER_KEY);
  } catch {
    return null;
  }
}

export function setStoredBrokerId(id: string | null): void {
  try {
    if (id) localStorage.setItem(BROKER_KEY, id);
    else localStorage.removeItem(BROKER_KEY);
  } catch {
    // private mode / quota — best-effort only
  }
}

type DraftMap = Record<string, string>;

function readDrafts(): DraftMap {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as DraftMap) : {};
  } catch {
    return {};
  }
}

function writeDrafts(drafts: DraftMap): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    // ignore
  }
}

export function getDraft(brokerId: string): string | null {
  return readDrafts()[brokerId] ?? null;
}

export function setDraft(brokerId: string, body: string | null): void {
  const drafts = readDrafts();
  if (body === null || body === '') {
    if (brokerId in drafts) {
      delete drafts[brokerId];
      writeDrafts(drafts);
    }
    return;
  }
  if (drafts[brokerId] === body) return;
  drafts[brokerId] = body;
  writeDrafts(drafts);
}
