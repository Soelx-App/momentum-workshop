import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type Visao = NonNullable<FunctionReturnType<typeof api.sessoes.visao>>;
export type VisaoMembro = Extract<Visao, { acesso: "participante" | "organizador" }>;
export type VisaoParticipante = Extract<Visao, { acesso: "participante" }>;
export type SessaoVisao = Visao["sessao"];
export type PerguntaAberta = VisaoMembro["abertas"][number];
export type PerguntaRespondida = VisaoMembro["respondidas"][number];
export type ParticipanteVisao = VisaoMembro["participantes"][number];
