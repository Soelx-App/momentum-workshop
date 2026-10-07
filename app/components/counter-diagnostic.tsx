"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export function CounterDiagnostic() {
  const count = useQuery(api.counter.get);
  const increment = useMutation(api.counter.increment);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIncrement() {
    setPending(true);
    setError(null);
    try { await increment({}); }
    catch { setError("Não foi possível gravar no Convex. Tente novamente."); }
    finally { setPending(false); }
  }

  return <details className="diagnostic">
    <summary>Diagnóstico da conexão</summary>
    <p aria-live="polite">{count === undefined ? "Conectando ao Convex..." : `Contador no Convex: ${count}`}</p>
    <button className="button secondary" onClick={handleIncrement} disabled={count === undefined || pending}>{pending ? "Gravando..." : "Incrementar"}</button>
    {error && <p role="alert">{error}</p>}
  </details>;
}
