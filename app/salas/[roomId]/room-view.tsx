"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { roomCredentialSnapshot, subscribeCredentials } from "../../lib/roomCredentials";

const subscribeOrigin = () => () => {};

function RoomMessage({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="room-main"><section className="card"><span className="eyebrow">PULSE</span>
    <h1>{title}</h1>{children}<Link className="text-link" href="/">Voltar ao início →</Link>
  </section></main>;
}

export function PublicRoom({ roomId }: { roomId: string }) {
  const room = useQuery(api.rooms.getPublic, { roomId });
  if (room === undefined) return <RoomMessage title="Carregando sala..."><p role="status">Conectando ao encontro.</p></RoomMessage>;
  if (!room) return <RoomMessage title="Sala não encontrada"><p>Confira se o link foi copiado por completo.</p></RoomMessage>;
  return <main className="room-main"><section className="card">
    <span className="badge">ACESSO DE PARTICIPANTE</span><h1>Você chegou à sala.</h1>
    <p className="lead">O espaço do encontro está pronto.</p>
    <p>A entrada de participantes estará disponível em breve.</p>
    <div className="room-id"><span>Identificação da sala</span><code>{room._id}</code></div>
    <Link className="text-link" href="/">Voltar ao início →</Link>
  </section></main>;
}

export function OrganizerRoom({ roomId }: { roomId: string }) {
  const credential = useSyncExternalStore(subscribeCredentials, () => roomCredentialSnapshot(roomId), () => undefined);
  const origin = useSyncExternalStore(subscribeOrigin, () => window.location.origin, () => "");
  const access = useQuery(api.rooms.getAdmin, credential === undefined ? "skip" : { roomId, ...(credential ? { adminToken: credential } : {}) });
  const [copyMessage, setCopyMessage] = useState("");
  const [copyPending, setCopyPending] = useState(false);
  const participantLink = origin ? `${origin}/salas/${roomId}` : "";

  async function copyLink() {
    setCopyPending(true);
    try { await navigator.clipboard.writeText(participantLink); setCopyMessage("Link copiado! Agora é só compartilhar."); }
    catch { setCopyMessage("Não foi possível copiar automaticamente. Selecione o link acima e copie manualmente."); }
    finally { setCopyPending(false); }
  }

  if (access === undefined) return <RoomMessage title="Carregando sala..."><p role="status">Recuperando seu acesso de organização.</p></RoomMessage>;
  if (access.status === "not_found") return <RoomMessage title="Sala não encontrada"><p>Confira se o endereço está completo.</p></RoomMessage>;
  if (access.status === "denied") return <RoomMessage title="Acesso administrativo negado"><p>Abra esta página no navegador em que você criou a sala. O link de participantes não dá acesso à organização.</p></RoomMessage>;

  return <main className="room-main">
    <div className="room-heading"><span className="badge">ACESSO DE ORGANIZADOR</span><h1>Sua sala está pronta, {access.room.organizerName}.</h1>
      <p className="lead">Convide as pessoas para o seu encontro.</p></div>
    <section className="card" aria-labelledby="share-title">
      <span className="step">02 / COMPARTILHAR</span><h2 id="share-title">Um link para os participantes</h2>
      <p>Compartilhe este endereço com quem vai participar da sala.</p>
      <label htmlFor="participant-link">Link de acesso</label>
      <input id="participant-link" type="text" readOnly value={participantLink} onFocus={(event) => event.currentTarget.select()} />
      <div className="share-actions">
        <button className="button primary" onClick={copyLink} disabled={!participantLink || copyPending}>{copyPending ? "Copiando..." : "Copiar link"}</button>
        <Link className="text-link" href={`/salas/${roomId}`} target="_blank" rel="noopener noreferrer">Abrir acesso de participante ↗</Link>
      </div>
      <p className="copy-message" role="status" aria-live="polite">{copyMessage}</p>
      <div className="room-id"><span>Identificação da sala</span><code>{access.room._id}</code></div>
    </section>
    <p className="access-note">Seu acesso de organização fica neste navegador. Use o link acima para convidar participantes.</p>
    <Link className="text-link" href="/">Criar outra sala →</Link>
  </main>;
}
