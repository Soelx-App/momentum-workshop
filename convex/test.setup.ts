/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

export const modules = import.meta.glob(["./**/*.ts", "./**/*.js", "!./**/*.*.*"]);

export function novoTeste() {
  return convexTest(schema, modules);
}

export type TesteConvex = ReturnType<typeof novoTeste>;

export async function criarSessao(t: TesteConvex, nome = "Aula", organizadorNome = "Ana") {
  return await t.mutation(api.sessoes.criar, { nome, organizadorNome });
}

export async function entrar(t: TesteConvex, codigo: string, nome: string) {
  const { token } = await t.mutation(api.participantes.entrar, { codigo, nome });
  return token;
}
