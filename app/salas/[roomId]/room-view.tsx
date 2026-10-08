"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  markParticipantJoined,
  participantCredentialSnapshot,
  participantJoinedSnapshot,
  participantNameSnapshot,
  prepareParticipantCredential,
  roomCredentialSnapshot,
  saveParticipantName,
  subscribeCredentials,
} from "../../lib/roomCredentials";

const subscribeOrigin = () => () => {};

function RoomMessage({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="room-main"><section className="card"><span className="eyebrow">PULSE</span>
    <h1>{title}</h1>{children}<Link className="text-link" href="/">Voltar ao início →</Link>
  </section></main>;
}

export function PublicRoom({ roomId }: { roomId: string }) {
  const room = useQuery(api.rooms.getPublic, { roomId });
  const participantToken = useSyncExternalStore(subscribeCredentials, () => participantCredentialSnapshot(roomId), () => undefined);
  const joined = useSyncExternalStore(subscribeCredentials, () => participantJoinedSnapshot(roomId), () => false);
  if (room === undefined || participantToken === undefined) return <RoomMessage title="Carregando sala..."><p role="status">Conectando ao encontro.</p></RoomMessage>;
  if (!room) return <RoomMessage title="Sala não encontrada"><p>Confira se o link foi copiado por completo.</p></RoomMessage>;
  if (!participantToken || !joined) return <ParticipantJoin roomId={roomId} defaultName={participantNameSnapshot(roomId)} ended={room.status === "ended"} />;
  return <ParticipantRoom roomId={roomId} participantToken={participantToken} />;
}

function ParticipantJoin({ roomId, defaultName, ended }: { roomId: string; defaultName: string; ended: boolean }) {
  const join = useMutation(api.rooms.join);
  const [name, setName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const roomKey = roomId as Id<"rooms">;

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setError("Informe seu nome para entrar na sala."); return; }
    if (ended) { setError("Esta sessão foi encerrada."); return; }
    setPending(true);
    setError("");
    try {
      const token = prepareParticipantCredential(roomId);
      saveParticipantName(roomId, cleanName);
      await join({ roomId: roomKey, name: cleanName, participantToken: token });
      markParticipantJoined(roomId);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Não foi possível entrar na sala. Tente novamente.");
    } finally { setPending(false); }
  }

  return <main className="room-main"><div className="room-heading"><span className="badge">ACESSO DE PARTICIPANTE</span>
    <h1>Entre na sala</h1><p className="lead">Use seu nome para participar. Ele aparecerá junto das perguntas que você enviar.</p></div>
    <section className="card"><form onSubmit={handleJoin}>
      <label htmlFor="participant-name">Seu nome</label>
      <input id="participant-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} disabled={pending || ended} required />
      <p className="field-help">Seus votos e respostas são recuperados neste navegador. Só o organizador vê os estados individuais.</p>
      <button className="button primary" type="submit" disabled={pending || ended}>{ended ? "Sessão encerrada" : pending ? "Entrando..." : "Entrar na sala"}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </form></section>
  </main>;
}

function ParticipantRoom({ roomId, participantToken }: { roomId: string; participantToken: string }) {
  const roomKey = roomId as Id<"rooms">;
  const data = useQuery(api.questions.forParticipant, { roomId: roomKey, participantToken });
  const ask = useMutation(api.questions.ask);
  const vote = useMutation(api.questions.vote);
  const submitMood = useMutation(api.moods.submit);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    try {
      await ask({ roomId: roomKey, participantToken, body: question });
      setQuestion("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível enviar a pergunta."); }
    finally { setPending(false); }
  }

  async function toggleVote(questionId: Id<"questions">) {
    setError("");
    try { await vote({ roomId: roomKey, participantToken, questionId }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível atualizar o voto."); }
  }

  if (!data) return <RoomMessage title="Carregando sua sala..."><p role="status">Recuperando sua participação.</p></RoomMessage>;
  const openQuestions = data.questions.filter((item) => item.status === "open");
  const answeredQuestions = data.questions.filter((item) => item.status === "answered");
  const ended = data.status === "ended";
  const activeMood = data.status === "active";
  return <main className="room-main room-main-wide">
    <div className="room-heading"><span className="badge">SALA DE PARTICIPANTE</span><h1>Olá, {data.participantName}.</h1>
      <p className="lead">Envie dúvidas e acompanhe as perguntas da sala.</p></div>
    {ended && <p className="notice" role="status">A sessão foi encerrada. O histórico continua disponível para consulta.</p>}
    <section className="card" aria-labelledby="question-compose-title">
      <h2 id="question-compose-title">Enviar uma pergunta</h2>
      <form onSubmit={submitQuestion}>
        <label htmlFor="question-body">Sua dúvida</label>
        <textarea id="question-body" value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} disabled={pending || ended} required />
        <button className="button primary" type="submit" disabled={pending || ended || !question.trim()}>{pending ? "Enviando..." : "Enviar pergunta"}</button>
      </form>
    </section>
    {!activeMood && !ended && <p className="notice" role="status">A coleta de estados estará disponível quando o organizador iniciar a sessão.</p>}
    {activeMood && <section className="card mood-card" aria-labelledby="mood-title">
      <span className="step">ESTADO ATUAL · COLETA {data.currentCollectionNumber}</span><h2 id="mood-title">Como você está se sentindo?</h2>
      {data.currentMood === null ? <div className="mood-options">
        {["🤬 Muito bravo ou insatisfeito", "😠 Bravo", "🙁 Neutro, um pouco insatisfeito", "😐 Neutro, um pouco satisfeito", "🙂 Feliz", "😄 Muito feliz"].map((label, value) =>
          <button key={value} className="mood-option" onClick={async () => {
            try { await submitMood({ roomId: roomKey, participantToken, value }); }
            catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível salvar seu estado."); }
          }} aria-label={label}><span aria-hidden="true">{label.split(" ")[0]}</span><span>{label.slice(label.indexOf(" ") + 1)}</span></button>,
        )}
      </div> : <p role="status" className="notice">Seu estado foi registrado nesta coleta e não pode ser alterado.</p>}
    </section>}
    {error && <p role="alert" className="error">{error}</p>}
    <section className="card question-list" aria-labelledby="open-questions-title">
      <div className="section-heading"><div><span className="step">AO VIVO</span><h2 id="open-questions-title">Perguntas da sala</h2></div><span className="count">{openQuestions.length}</span></div>
      {openQuestions.length === 0 ? <p className="empty-state">Ainda não há perguntas. Quando alguém enviar uma, ela aparecerá aqui.</p> : <ul>
        {openQuestions.map((item) => <li className="question-item" key={item._id}>
          <div className="question-copy"><p>{item.body}</p><span>Por {item.authorName}</span></div>
          <div className="vote-control"><span aria-label={`${item.voteCount} votos`}>{item.voteCount}</span>
            <button className={item.hasVoted ? "button vote-button selected" : "button vote-button"} onClick={() => void toggleVote(item._id)} disabled={ended || item.isMine} aria-pressed={item.hasVoted}>
              {item.isMine ? "Sua pergunta" : item.hasVoted ? "Retirar voto" : "Votar"}
            </button>
          </div>
        </li>)}
      </ul>}
    </section>
    {answeredQuestions.length > 0 && <section className="card question-list" aria-labelledby="answered-questions-title">
      <span className="step">HISTÓRICO</span><h2 id="answered-questions-title">Dúvidas respondidas</h2>
      <ul>{answeredQuestions.map((item) => <li className="question-item" key={item._id}>
        <div className="question-copy"><p>{item.body}</p><span>Por {item.authorName}</span></div><span className="answered-count">{item.voteCount} votos · Respondida</span>
      </li>)}</ul>
    </section>}
  </main>;
}

export function OrganizerRoom({ roomId }: { roomId: string }) {
  const roomKey = roomId as Id<"rooms">;
  const credential = useSyncExternalStore(subscribeCredentials, () => roomCredentialSnapshot(roomId), () => undefined);
  const origin = useSyncExternalStore(subscribeOrigin, () => window.location.origin, () => "");
  const access = useQuery(api.rooms.getAdmin, credential === undefined ? "skip" : { roomId, ...(credential ? { adminToken: credential } : {}) });
  const dashboard = useQuery(api.rooms.getDashboard, access?.status === "ok" && credential ? { roomId: roomKey, adminToken: credential } : "skip");
  const markAnswered = useMutation(api.questions.markAnswered);
  const start = useMutation(api.rooms.start);
  const end = useMutation(api.rooms.end);
  const setMoodInterval = useMutation(api.rooms.setMoodInterval);
  const advanceMoodCollection = useMutation(api.rooms.advanceMoodCollection);
  const [copyMessage, setCopyMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const participantLink = origin ? `${origin}/salas/${roomId}` : "";
  async function copyLink() {
    try { await navigator.clipboard.writeText(participantLink); setCopyMessage("Link copiado! Agora é só compartilhar."); }
    catch { setCopyMessage("Não foi possível copiar automaticamente. Selecione o link acima e copie manualmente."); }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setPending(true); setActionMessage("");
    try { await action(); setActionMessage(success); }
    catch (failure) { setActionMessage(failure instanceof Error ? failure.message : "Não foi possível concluir a ação."); }
    finally { setPending(false); }
  }

  if (access === undefined) return <RoomMessage title="Carregando sala..."><p role="status">Recuperando seu acesso de organização.</p></RoomMessage>;
  if (access.status === "not_found") return <RoomMessage title="Sala não encontrada"><p>Confira se o endereço está completo.</p></RoomMessage>;
  if (access.status === "denied") return <RoomMessage title="Acesso administrativo negado"><p>Abra esta página no navegador em que você criou a sala. O link de participantes não dá acesso à organização.</p></RoomMessage>;

  const room = access.room;
  const active = room.status === "active";
  const ended = room.status === "ended";
  const intervalValue = intervalSeconds ?? room.moodIntervalMs / 1000;
  const openQuestions = dashboard?.questions.filter((item) => item.status === "open") ?? [];
  const answeredQuestions = dashboard?.questions.filter((item) => item.status === "answered") ?? [];
  const participantCount = dashboard?.participants.length ?? 0;
  return <main className="room-main room-main-wide">
    <div className="room-heading"><span className="badge">PAINEL DO ORGANIZADOR</span><h1>Sua sala, {room.organizerName}.</h1>
      <p className="lead">Acompanhe as perguntas e os estados da turma em tempo real.</p></div>
    <section className="card share-card" aria-labelledby="share-title">
      <div className="section-heading"><div><span className="step">COMPARTILHAR</span><h2 id="share-title">Convide participantes</h2></div><span className="count">{participantCount}</span></div>
      <p>Link de acesso para participantes</p><div className="share-actions">
        <input aria-label="Link de acesso" type="text" readOnly value={participantLink} onFocus={(event) => event.currentTarget.select()} />
        <button className="button secondary" onClick={copyLink}>Copiar link</button>
      </div><p className="copy-message" role="status" aria-live="polite">{copyMessage}</p>
    </section>
    <section className="card session-controls" aria-labelledby="session-title">
      <div className="section-heading"><div><span className="step">SESSÃO</span><h2 id="session-title">Controle do encontro</h2></div><span className={`state-pill ${ended ? "ended" : active ? "active" : "waiting"}`}>{ended ? "Encerrada" : active ? "Ao vivo" : "Aguardando início"}</span></div>
      <div className="control-row">
        {!active && !ended && <button className="button primary" disabled={pending} onClick={() => void runAction(() => start({ roomId: roomKey, adminToken: credential! }), "Sessão iniciada.")}>Iniciar sessão</button>}
        {active && <>
          <button className="button secondary" disabled={pending} onClick={() => void runAction(() => advanceMoodCollection({ roomId: roomKey, adminToken: credential! }), "Nova coleta aberta.")}>Abrir próxima coleta</button>
          <button className="button danger" disabled={pending} onClick={() => void runAction(() => end({ roomId: roomKey, adminToken: credential! }), "Sessão encerrada.")}>Encerrar sessão</button>
        </>}
        {actionMessage && <span role="status" className="field-help">{actionMessage}</span>}
      </div>
      {!ended && <form className="interval-form" onSubmit={(event) => {
        event.preventDefault();
        void runAction(async () => {
          await setMoodInterval({ roomId: roomKey, adminToken: credential!, intervalMs: intervalValue * 1000 });
          setIntervalSeconds(intervalValue);
        }, "Intervalo atualizado; o prazo reiniciou.");
      }}>
        <label htmlFor="mood-interval">Intervalo das coletas (segundos)</label>
        <div className="interval-actions"><input id="mood-interval" type="number" min={15} max={3600} step={1} value={intervalValue} onChange={(event) => setIntervalSeconds(Number(event.target.value))} />
          <button className="button secondary" type="submit" disabled={pending}>Salvar intervalo</button></div>
        <p className="field-help">De 15 segundos a 60 minutos. Padrão: 60 segundos.</p>
      </form>}
    </section>
    <section className="dashboard-grid">
      <section className="card question-list" aria-labelledby="organizer-questions-title">
        <div className="section-heading"><div><span className="step">PERGUNTAS AO VIVO</span><h2 id="organizer-questions-title">Em aberto</h2></div><span className="count">{openQuestions.length}</span></div>
        {!dashboard ? <p role="status">Carregando painel...</p> : openQuestions.length === 0 ? <p className="empty-state">As perguntas enviadas aparecerão aqui.</p> : <ul>
          {openQuestions.map((item) => <li className="question-item" key={item._id}><div className="question-copy"><p>{item.body}</p><span>Por {item.authorName}</span></div>
            <div className="vote-control"><span>{item.voteCount} votos</span><button className="button secondary" disabled={ended} onClick={() => void runAction(() => markAnswered({ roomId: roomKey, adminToken: credential!, questionId: item._id }), "Pergunta marcada como respondida.")}>Marcar respondida</button></div>
          </li>)}
        </ul>}
        {answeredQuestions.length > 0 && <div className="answered-list"><h3>Respondidas</h3><ul>{answeredQuestions.map((item) => <li key={item._id}><span>{item.body}</span><span>{item.voteCount} votos</span></li>)}</ul></div>}
      </section>
      <section className="card participant-list" aria-labelledby="participants-title">
        <div className="section-heading"><div><span className="step">ESTADOS PRIVADOS</span><h2 id="participants-title">Participantes</h2></div><span className="count">{participantCount}</span></div>
        {!dashboard ? <p role="status">Carregando participantes...</p> : participantCount === 0 ? <p className="empty-state">As pessoas aparecerão aqui quando entrarem.</p> : <ul>
          {dashboard.participants.map((person) => <li className="participant-item" key={person._id}><span>{person.name}</span><span className="mood-result">{person.lastMood === null ? "Sem estado informado" : `${["🤬", "😠", "🙁", "😐", "🙂", "😄"][person.lastMood]} ${person.lastMood} / 5`}</span></li>)}
        </ul>}
        <p className="field-help">Os estados individuais ficam visíveis apenas para você.</p>
      </section>
    </section>
    <section className="card history-card" aria-labelledby="mood-history-title">
      <span className="step">HISTÓRICO</span><h2 id="mood-history-title">Média de estado por coleta</h2>
      {!dashboard ? <p role="status">Carregando histórico...</p> : dashboard.collections.length === 0 ? <p className="empty-state">O histórico começa quando a sessão é iniciada.</p> : <ol className="collection-list">
        {dashboard.collections.map((collection) => <li key={collection._id}>
          <div className="collection-heading"><strong>Coleta {collection.number}</strong><span>{collection.responseCount} respostas</span></div>
          {collection.average === null ? <p className="empty-state">Sem respostas nesta coleta</p> : <div className="average-track" aria-label={`Média ${collection.average.toFixed(2)} de 5`}><span style={{ width: `${Math.max(2, collection.average / 5 * 100)}%` }} /><strong>{collection.average.toFixed(2)} / 5</strong></div>}
          {collection.responses.length > 0 && <details><summary>Ver respostas desta coleta</summary><ul>{collection.responses.map((response, index) => <li key={`${response.submittedAt}-${index}`}>{response.participantName}: {response.value} / 5</li>)}</ul></details>}
        </li>)}
      </ol>}
    </section>
    <p className="access-note">A sala preserva as respostas e o histórico após o encerramento.</p>
  </main>;
}
