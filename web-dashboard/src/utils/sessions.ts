import type { SavedSession, SimulationSnapshot } from '../types';

const SAVED_SESSIONS_KEY = 'smart-classroom-saved-sessions';
const LAST_SESSION_KEY = 'smart-classroom-last-session';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function listSavedSessions(): SavedSession[] {
  const sessions = safeParse<SavedSession[]>(localStorage.getItem(SAVED_SESSIONS_KEY), []);
  return sessions.sort((a, b) => (
    new Date(b.snapshot.savedAt).getTime() - new Date(a.snapshot.savedAt).getTime()
  ));
}

export function saveNamedSession(name: string, snapshot: SimulationSnapshot): SavedSession {
  const sessions = listSavedSessions();
  const session: SavedSession = {
    id: crypto.randomUUID(),
    name,
    snapshot,
  };

  sessions.unshift(session);
  localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(sessions));
  return session;
}

export function loadSavedSession(id: string): SavedSession | null {
  return listSavedSessions().find((session) => session.id === id) ?? null;
}

export function deleteSavedSession(id: string) {
  const sessions = listSavedSessions().filter((session) => session.id !== id);
  localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(sessions));
}

export function saveLastSession(snapshot: SimulationSnapshot) {
  localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(snapshot));
}

export function loadLastSession(): SimulationSnapshot | null {
  return safeParse<SimulationSnapshot | null>(localStorage.getItem(LAST_SESSION_KEY), null);
}
