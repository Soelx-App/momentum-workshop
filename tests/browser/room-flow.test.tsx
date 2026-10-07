import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../../app/page";
import { OrganizerRoom } from "../../app/salas/[roomId]/room-view";
import { finishRoomCreation, prepareRoomCreation, roomCredentialSnapshot, storageError } from "../../app/lib/roomCredentials";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), query: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.create, useQuery: (...args: unknown[]) => mocks.query(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../../app/components/counter-diagnostic", () => ({ CounterDiagnostic: () => null }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.query.mockReturnValue({ status: "ok", room: { _id: "room-one", organizerName: "Ana", _creationTime: 1 } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("criação e recuperação no navegador", () => {
  it("armazena a chave antes de enviar e reutiliza após falha ou atualização", () => {
    const first = prepareRoomCreation("Ana");
    expect(first.adminToken).toMatch(/^[a-f0-9]{64}$/);
    expect(prepareRoomCreation("Bia")).toEqual(first);
    finishRoomCreation(first, "room-one");
    expect(roomCredentialSnapshot("room-one")).toBe(first.adminToken);
    expect(roomCredentialSnapshot("room-two")).toBeNull();
    expect(localStorage.getItem("pulse:pending-room")).toBeNull();
    expect(prepareRoomCreation("Bia").adminToken).not.toBe(first.adminToken);
  });

  it("não cria uma sala quando o armazenamento é bloqueado", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Bloqueado", "SecurityError"); });
    render(<Home />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar sala/ }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", storageError);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("preserva a recuperação se o armazenamento falha depois da criação", () => {
    const pending = prepareRoomCreation("Ana");
    const originalSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key.includes(":admin")) throw new DOMException("Sem espaço", "QuotaExceededError");
      return originalSet.call(this, key, value);
    });
    expect(() => finishRoomCreation(pending, "room-one")).toThrow(storageError);
    expect(roomCredentialSnapshot("room-one")).toBe(pending.adminToken);
    expect(prepareRoomCreation("Ana").adminToken).toBe(pending.adminToken);
  });

  it("nome com espaços vazios não chama o backend", async () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Criar sala/ }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Informe seu nome para criar a sala.");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("após erro de rede, tenta novamente com a mesma chave sem perder o acesso", async () => {
    mocks.create.mockRejectedValueOnce(new Error("Rede indisponível")).mockResolvedValueOnce("room-one");
    render(<Home />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "  Ana  " } });
    fireEvent.click(screen.getByRole("button", { name: /Criar sala/ }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Não foi possível criar a sala. Confira sua conexão e tente novamente.");
    const first = mocks.create.mock.calls[0][0];
    fireEvent.click(screen.getByRole("button", { name: /Recuperar criação/ }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/salas/room-one/organizador"));
    expect(mocks.create.mock.calls[1][0]).toEqual(first);
    expect(first.organizerName).toBe("Ana");
    expect(roomCredentialSnapshot("room-one")).toBe(first.adminToken);
  });

  it("bloqueia envios repetidos enquanto aguarda o backend", async () => {
    let resolve!: (roomId: string) => void;
    mocks.create.mockImplementationOnce(() => new Promise<string>((done) => { resolve = done; }));
    render(<Home />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    const form = screen.getByLabelText("Seu nome").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Criando sala/ })).toHaveProperty("disabled", true);
    resolve("room-one");
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });
});

describe("compartilhamento", () => {
  it("copia somente o link público, sem a chave administrativa", async () => {
    const pending = prepareRoomCreation("Ana");
    finishRoomCreation(pending, "room-one");
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<OrganizerRoom roomId="room-one" />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Link copiado!"));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/salas/room-one`);
    expect(screen.getByLabelText("Link de acesso")).toHaveProperty("value", `${window.location.origin}/salas/room-one`);
    expect(writeText.mock.calls[0][0]).not.toContain(pending.adminToken);
  });

  it.each(["indisponível", "recusada"])("oferece cópia manual quando a área de transferência está %s", async (mode) => {
    vi.stubGlobal("navigator", mode === "indisponível" ? {} : { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Permissão recusada")) } });
    render(<OrganizerRoom roomId="room-one" />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("copie manualmente"));
    expect(screen.getByLabelText("Link de acesso")).toHaveProperty("value", `${window.location.origin}/salas/room-one`);
  });
});
