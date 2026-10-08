const pendingKey = "pulse:pending-room";
const changeEvent = "pulse:credentials-changed";
const roomKey = (roomId: string) => `pulse:room:${roomId}:admin`;
const participantKey = (roomId: string) => `pulse:room:${roomId}:participant`;
const participantNameKey = (roomId: string) => `pulse:room:${roomId}:participant-name`;
const participantJoinedKey = (roomId: string) => `pulse:room:${roomId}:participant-joined`;

type PendingRoom = { organizerName: string; adminToken: string; roomId?: string };
export const storageError = "Não foi possível salvar seu acesso neste navegador. Permita o armazenamento local e tente novamente.";

export function subscribeCredentials(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function pendingRoomSnapshot(): string | null {
  try { return localStorage.getItem(pendingKey); } catch { return null; }
}

export function parsePendingRoom(raw: string | null): PendingRoom | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value.organizerName === "string" && typeof value.adminToken === "string"
      && /^[a-f0-9]{64}$/.test(value.adminToken)
      && (value.roomId === undefined || typeof value.roomId === "string")) return value;
  } catch { /* An invalid local record is not an access credential. */ }
  return null;
}

export function prepareRoomCreation(organizerName: string): PendingRoom {
  try {
    const previous = parsePendingRoom(localStorage.getItem(pendingKey));
    const pending = previous ?? {
      organizerName,
      adminToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""),
    };
    const serialized = JSON.stringify(pending);
    localStorage.setItem(pendingKey, serialized);
    if (localStorage.getItem(pendingKey) !== serialized) throw new Error(storageError);
    window.dispatchEvent(new Event(changeEvent));
    return pending;
  } catch { throw new Error(storageError); }
}

export function finishRoomCreation(pending: PendingRoom, roomId: string) {
  try {
    // Preserve recovery until the room-specific credential is safely saved.
    localStorage.setItem(pendingKey, JSON.stringify({ ...pending, roomId }));
    localStorage.setItem(roomKey(roomId), pending.adminToken);
    if (localStorage.getItem(roomKey(roomId)) !== pending.adminToken) throw new Error(storageError);
    localStorage.removeItem(pendingKey);
    window.dispatchEvent(new Event(changeEvent));
  } catch { throw new Error(storageError); }
}

export function roomCredentialSnapshot(roomId: string): string | null {
  try {
    const pending = parsePendingRoom(localStorage.getItem(pendingKey));
    return localStorage.getItem(roomKey(roomId)) ?? (pending?.roomId === roomId ? pending.adminToken : null);
  } catch { return null; }
}

export function participantCredentialSnapshot(roomId: string): string | null {
  try {
    const token = localStorage.getItem(participantKey(roomId));
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  } catch { return null; }
}

export function prepareParticipantCredential(roomId: string): string {
  try {
    const existing = participantCredentialSnapshot(roomId);
    if (existing) return existing;
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(participantKey(roomId), token);
    if (localStorage.getItem(participantKey(roomId)) !== token) throw new Error(storageError);
    window.dispatchEvent(new Event(changeEvent));
    return token;
  } catch { throw new Error(storageError); }
}

export function participantNameSnapshot(roomId: string): string {
  try { return localStorage.getItem(participantNameKey(roomId)) ?? ""; } catch { return ""; }
}

export function saveParticipantName(roomId: string, name: string) {
  try {
    localStorage.setItem(participantNameKey(roomId), name);
    localStorage.removeItem(participantJoinedKey(roomId));
    window.dispatchEvent(new Event(changeEvent));
  } catch { throw new Error(storageError); }
}

export function markParticipantJoined(roomId: string) {
  try {
    localStorage.setItem(participantJoinedKey(roomId), "1");
    window.dispatchEvent(new Event(changeEvent));
  } catch { throw new Error(storageError); }
}

export function participantJoinedSnapshot(roomId: string): boolean {
  try { return localStorage.getItem(participantJoinedKey(roomId)) === "1"; } catch { return false; }
}
