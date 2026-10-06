"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";

export default function Home() {
  const count = useQuery(api.counter.get);
  const increment = useMutation(api.counter.increment);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIncrement() {
    setPending(true);
    setError(null);
    try {
      await increment({});
    } catch {
      setError("Não foi possível gravar no Convex. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <h1>Momentum workshop</h1>
      <p>Next.js + Convex. Apenas um exemplo de conexão.</p>
      <p aria-live="polite">
        {count === undefined ? "Conectando ao Convex..." : `Contador no Convex: ${count}`}
      </p>
      <button onClick={handleIncrement} disabled={count === undefined || pending}>
        {pending ? "Gravando..." : "Incrementar"}
      </button>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
