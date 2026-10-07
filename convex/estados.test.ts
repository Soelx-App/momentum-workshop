import { describe, expect, test } from "vitest";
import {
  ESTADOS,
  estadoEfetivo,
  instanteDeReferencia,
  segundosRestantes,
} from "./estados";

const aberta = { status: "aberta" as const };

describe("ESTADOS", () => {
  test("tem os 7 estados na ordem definida", () => {
    expect(ESTADOS.map((e) => e.valor)).toEqual([
      "acompanhando", "feliz", "triste", "duvida", "confuso", "estressado", "tedio",
    ]);
    expect(ESTADOS.map((e) => e.rotulo)).toEqual([
      "Acompanhando", "Feliz", "Triste", "Dúvida", "Confuso", "Estressado", "Tédio",
    ]);
  });
});

describe("estadoEfetivo", () => {
  test("mantém estado ainda não expirado", () => {
    expect(estadoEfetivo({ estado: "feliz", estadoExpiraEm: 1000 }, 999)).toBe("feliz");
  });

  test("volta para acompanhando quando expira", () => {
    expect(estadoEfetivo({ estado: "feliz", estadoExpiraEm: 1000 }, 1000)).toBe("acompanhando");
  });

  test("acompanhando nunca muda", () => {
    expect(estadoEfetivo({ estado: "acompanhando" }, 10_000)).toBe("acompanhando");
  });
});

describe("instanteDeReferencia", () => {
  test("sessão aberta usa o relógio", () => {
    expect(instanteDeReferencia(aberta, 5000)).toBe(5000);
  });

  test("sessão encerrada congela no encerramento", () => {
    const encerrada = { status: "encerrada" as const, encerradaEm: 3000 };
    expect(instanteDeReferencia(encerrada, 9000)).toBe(3000);
  });

  test("estado ativo no encerramento fica congelado; já expirado continua acompanhando", () => {
    const encerrada = { status: "encerrada" as const, encerradaEm: 50 };
    const ref = instanteDeReferencia(encerrada, 1_000_000);
    expect(estadoEfetivo({ estado: "feliz", estadoExpiraEm: 100 }, ref)).toBe("feliz");
    expect(estadoEfetivo({ estado: "feliz", estadoExpiraEm: 40 }, ref)).toBe("acompanhando");
  });
});

describe("segundosRestantes", () => {
  test("arredonda para cima os segundos restantes", () => {
    expect(segundosRestantes({ estado: "feliz", estadoExpiraEm: 60_000 }, aberta, 500)).toBe(60);
  });

  test("não passa de 60 quando o relógio do cliente está atrasado", () => {
    expect(segundosRestantes({ estado: "feliz", estadoExpiraEm: 60_000 }, aberta, -500)).toBe(60);
  });

  test("sem contagem para acompanhando, expirado ou sessão encerrada", () => {
    expect(segundosRestantes({ estado: "acompanhando" }, aberta, 0)).toBeNull();
    expect(segundosRestantes({ estado: "feliz", estadoExpiraEm: 10 }, aberta, 10)).toBeNull();
    const encerrada = { status: "encerrada" as const, encerradaEm: 5 };
    expect(segundosRestantes({ estado: "feliz", estadoExpiraEm: 60_000 }, encerrada, 6)).toBeNull();
  });
});
