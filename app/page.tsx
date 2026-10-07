"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { api } from "../convex/_generated/api";
import { CounterDiagnostic } from "./components/counter-diagnostic";
import { finishRoomCreation, parsePendingRoom, pendingRoomSnapshot, prepareRoomCreation, subscribeCredentials } from "./lib/roomCredentials";

export default function Home() {
  const create = useMutation(api.rooms.create);
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribeCredentials, pendingRoomSnapshot, () => null);
  const saved = parsePendingRoom(snapshot);
  const [name, setName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const organizerName = (name ?? saved?.organizerName ?? "").trim();
    if (!organizerName) { setError("Informe seu nome para criar a sala."); return; }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const request = prepareRoomCreation(organizerName);
      let roomId: string;
      try { roomId = await create({ organizerName: request.organizerName, adminToken: request.adminToken }); }
      catch { setError("Não foi possível criar a sala. Confira sua conexão e tente novamente."); return; }
      finishRoomCreation(request, roomId);
      router.push(`/salas/${roomId}/organizador`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível salvar seu acesso. Tente novamente.");
    } finally { submitting.current = false; setPending(false); }
  }

  return <main>
    <div className="home-grid">
      <section className="intro">
        <span className="eyebrow">COMECE UMA NOVA SALA</span>
        <h1>O próximo encontro começa aqui.</h1>
        <p className="lead">Crie sua sala e compartilhe o acesso com quem vai participar.</p>
        <p className="intro-note">Só precisamos do seu nome. Sem criar uma conta.</p>
      </section>
      <section className="card" aria-labelledby="create-title">
        <span className="step">01 / CRIAR</span><h2 id="create-title">Sua sala no Pulse</h2>
        <p>Você organiza. Compartilhe um link para convidar os participantes.</p>
        <form onSubmit={handleCreate}>
          <label htmlFor="organizer-name">Seu nome</label>
          <input id="organizer-name" name="organizerName" autoComplete="name" placeholder="Como podemos chamar você?"
            value={name ?? saved?.organizerName ?? ""} onChange={(event) => setName(event.target.value)}
            required disabled={pending} aria-describedby="name-help" aria-invalid={!!error} />
          <p className="field-help" id="name-help">Seu acesso de organização fica salvo neste navegador.</p>
          {saved && <p className="notice">Há uma criação pendente de {saved.organizerName}. Tente novamente para recuperar essa sala.</p>}
          <button className="button primary full-width" type="submit" disabled={pending}>
            {pending ? "Criando sala..." : saved ? "Recuperar criação" : "Criar sala"}<span aria-hidden="true">→</span>
          </button>
          {error && <p className="error" role="alert">{error}</p>}
          {pending && <p className="field-help" role="status">Aguardando confirmação. Se demorar, confira sua conexão.</p>}
        </form>
      </section>
    </div>
    <CounterDiagnostic />
  </main>;
}
