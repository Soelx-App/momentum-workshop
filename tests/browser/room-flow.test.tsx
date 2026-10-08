import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../../app/page";
import { OrganizerRoom, PublicRoom } from "../../app/salas/[roomId]/room-view";
import { finishRoomCreation, prepareRoomCreation, roomCredentialSnapshot, storageError, participantCredentialSnapshot, prepareParticipantCredential, markParticipantJoined } from "../../app/lib/roomCredentials";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), query: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.create, useQuery: (...args: unknown[]) => mocks.query(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../../app/components/counter-diagnostic", () => ({ CounterDiagnostic: () => null }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.query.mockReturnValue({
    _id: "room-one",
    status: "ok",
    room: { _id: "room-one", organizerName: "Ana", _creationTime: 1, status: "waiting", moodIntervalMs: 60_000, currentCollectionNumber: 0 },
    participantName: "Joana", currentCollectionNumber: 1, currentMood: null,
    participants: [], questions: [], collections: [],
  });
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

  it("recupera a mesma credencial de participante após recarga e a separa por sala", () => {
    const token = prepareParticipantCredential("room-one");
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(prepareParticipantCredential("room-one")).toBe(token);
    expect(participantCredentialSnapshot("room-one")).toBe(token);
    expect(participantCredentialSnapshot("room-two")).toBeNull();
  });

  it("entra na sala e salva a participação para recuperar após recarregar", async () => {
    mocks.create.mockResolvedValue("participant-one");
    render(<PublicRoom roomId="room-one" />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Joana" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar na sala" }));
    expect(await screen.findByRole("heading", { name: "Olá, Joana." })).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ roomId: "room-one", name: "Joana", participantToken: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(participantCredentialSnapshot("room-one")).toBeTruthy();
    cleanup();
    render(<PublicRoom roomId="room-one" />);
    expect(await screen.findByRole("heading", { name: "Olá, Joana." })).toBeTruthy();
    expect(screen.queryByLabelText("Seu nome")).toBeNull();
  });

  it("mantém as perguntas visíveis e oferece voto sem expor quem votou", async () => {
    const token = prepareParticipantCredential("room-one");
    markParticipantJoined("room-one");
    mocks.query.mockReturnValue({
      _id: "room-one", status: "ok", room: { _id: "room-one", organizerName: "Ana", status: "waiting", moodIntervalMs: 60_000, currentCollectionNumber: 0 },
      participantName: "Joana", currentCollectionNumber: 0, currentMood: null,
      questions: [{ _id: "question-one", body: "Como funciona?", authorName: "Bia", status: "open", voteCount: 2, createdAt: 1, hasVoted: false, isMine: false }],
      participants: [], collections: [],
    });
    render(<PublicRoom roomId="room-one" />);
    expect(await screen.findByText("Como funciona?")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("Bia votou")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Votar" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ roomId: "room-one", participantToken: token, questionId: "question-one" }));
  });

  it("permite enviar um mood na coleta atual sem mostrar moods de outras pessoas", async () => {
    const token = prepareParticipantCredential("room-one");
    markParticipantJoined("room-one");
    mocks.query.mockReturnValue({
      _id: "room-one", status: "active", room: { _id: "room-one", organizerName: "Ana", status: "active", moodIntervalMs: 60_000, currentCollectionNumber: 1 },
      participantName: "Joana", currentCollectionNumber: 1, currentMood: null, questions: [], participants: [], collections: [],
    });
    render(<PublicRoom roomId="room-one" />);
    fireEvent.click(await screen.findByRole("button", { name: /Muito feliz/ }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ roomId: "room-one", participantToken: token, value: 5 }));
    expect(screen.queryByText("Estado de Bia")).toBeNull();
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

describe("painel em tempo real", () => {
  it("mostra estados individuais e médias somente no painel do organizador", async () => {
    const pending = prepareRoomCreation("Ana");
    finishRoomCreation(pending, "room-one");
    mocks.query.mockReturnValue({
      status: "ok",
      room: { _id: "room-one", organizerName: "Ana", _creationTime: 1, status: "active", moodIntervalMs: 60_000, currentCollectionNumber: 1 },
      participants: [{ _id: "participant-one", name: "Joana", lastMood: 5, lastMoodAt: 2 }],
      questions: [{ _id: "question-one", body: "Como funciona?", authorName: "Bia", status: "open", voteCount: 2, createdAt: 1 }],
      collections: [{ _id: "collection-one", number: 1, startedAt: 1, endedAt: null, responseCount: 3, average: 8 / 3, responses: [] }],
    });
    render(<OrganizerRoom roomId="room-one" />);
    expect(await screen.findByText("Joana")).toBeTruthy();
    expect(screen.getByText("😄 5 / 5")).toBeTruthy();
    expect(screen.getByLabelText("Média 2.67 de 5")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Marcar respondida" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ roomId: "room-one", adminToken: pending.adminToken, questionId: "question-one" }));
  });
});
