import { describe, expect, test } from "vitest";
import { LIMITES, normalizarCodigo, textoValido } from "./regras";

describe("textoValido", () => {
  test("apara espaços nas pontas", () => {
    expect(textoValido("  Aula de hoje  ", 80)).toBe("Aula de hoje");
  });

  test("rejeita vazio e só espaços", () => {
    expect(textoValido("", 40)).toBeNull();
    expect(textoValido("    ", 40)).toBeNull();
  });

  test("aceita o limite exato e rejeita um a mais", () => {
    expect(textoValido("a".repeat(LIMITES.pergunta), LIMITES.pergunta)).toHaveLength(280);
    expect(textoValido("a".repeat(LIMITES.pergunta + 1), LIMITES.pergunta)).toBeNull();
    expect(textoValido(`  ${"a".repeat(40)}  `, LIMITES.nomeParticipante)).toHaveLength(40);
  });
});

describe("normalizarCodigo", () => {
  test("remove espaços e usa maiúsculas", () => {
    expect(normalizarCodigo("  ab3cde ")).toBe("AB3CDE");
  });
});
