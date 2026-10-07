# Pulse — design do MVP

Data: 2026-10-07 · Time: Alpha · Branch: `feat/pulse` (base `alpha`)

## Objetivo

O organizador cria uma sessão sem cadastro e compartilha um código ou link. Os participantes enviam perguntas, votam nas perguntas de outras pessoas e informam seu estado. Todos acompanham perguntas e estados ao vivo. O organizador marca perguntas como respondidas e encerra a sessão.

**Critério de entrega:** outra equipe, sem ajuda e usando o Preview do PR ou a produção Alpha, cria uma sessão, entra como participante (pelo código e pelo link), envia uma pergunta, vota e retira o voto, troca de estado, marca uma pergunta como respondida e encerra a sessão.

Terminologia: sala e sessão são o mesmo conceito, e código é o código público de entrada.

## Regras de negócio decididas

| Tema | Regra |
|---|---|
| Papéis | A página inicial oferece Organizador (cria uma sessão nova) e Participante (entra com código e nome). Escolher Organizador nunca dá administração sobre uma sessão existente. |
| Organizador | Não é participante: não pergunta, não vota e não aparece na lista de estados. Só existe um organizador por sessão. |
| Nomes | Organizador: 1–40 caracteres. Sessão: 1–80. Participante: 1–40. Nomes repetidos são aceitos. O nome nunca identifica nem autoriza ninguém. |
| Estados | São 7: Acompanhando (padrão), Feliz, Triste, Dúvida, Confuso, Estressado e Tédio. Cada participante tem um único estado atual, que pode trocar a qualquer momento. Qualquer estado diferente de Acompanhando volta sozinho para Acompanhando 60 s depois de escolhido. Não há histórico de estados. |
| Visibilidade dos estados | Todos os membros da sessão (participantes e organizador) veem nomes e estados atuais. |
| Perguntas | Texto com 1–280 caracteres depois do trim. Não há edição, exclusão, moderação ou anonimato. |
| Votos | Cada participante dá no máximo 1 voto por pergunta. Não é possível votar na própria pergunta nem em pergunta respondida. Clicar de novo retira o voto. |
| Ranking | Perguntas abertas, por votos em ordem decrescente. No empate, a mais antiga aparece primeiro. |
| Respondida | Só o organizador da sessão pode marcar. A pergunta sai da lista ativa de todos e aparece na seção "Respondidas" (somente leitura, visível a todos). Não há reabertura. O registro nunca é apagado. |
| Retorno | Cada participante e o organizador recebem um token secreto salvo no navegador, e quem volta no mesmo navegador é reconhecido. O organizador também tem um link de administração secreto para recuperar o acesso em outro aparelho. |
| Encerramento | O organizador encerra manualmente, ou o sistema encerra depois de 2 h sem atividade. A sessão encerrada fica somente leitura: ninguém entra, pergunta, vota nem troca de estado, mas o conteúdo continua visível. Não há reabertura. |
| Atividade | Conta como atividade criar a sessão, entrar, perguntar, votar ou retirar voto, trocar estado e marcar respondida. |

**Fora do escopo:** contas, múltiplos organizadores, perguntas anônimas, comentários, edição/exclusão/moderação, enquetes, mão digital, QR Code, telão, gráficos ou histórico de sentimentos, alertas, exportações, resumos automáticos, reabertura de perguntas ou sessões e rate limiting.

**Volume suposto:** até ~100 participantes por sessão, usando celular ou desktop.

## Arquitetura

Next.js 16 (App Router) + Convex 1.46, que já estão no repositório. O tempo real vem das queries reativas do Convex, que fazem reconexão automática. Não há dependências de runtime novas.

A identidade usa tokens próprios em vez de Convex Auth. Convex Auth exigiria chaves JWT em cada deployment, inclusive nos Previews por branch, e não resolveria o link de administração.

- O servidor gera os tokens com `crypto.getRandomValues` (32 bytes, base64url).
- Eles ficam em texto puro no banco, e **nenhuma query os devolve**.
- Toda mutation resolve o token no servidor. Um ID enviado pelo cliente nunca é aceito como prova de identidade.

O código de entrada tem 6 caracteres do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sem 0/O/1/I. O servidor gera um código novo até encontrar um que não esteja em uso. Na entrada, o código é normalizado com trim e maiúsculas.

## Modelo de dados (`convex/schema.ts`)

A tabela `counters` e o contador de exemplo são removidos.

```ts
sessoes: defineTable({
  nome: v.string(),
  organizadorNome: v.string(),
  codigo: v.string(),
  adminToken: v.string(),
  status: v.union(v.literal("aberta"), v.literal("encerrada")),
  ultimaAtividadeEm: v.number(),
  encerradaEm: v.optional(v.number()),
})
  .index("by_codigo", ["codigo"])
  .index("by_admin_token", ["adminToken"])
  .index("by_status_atividade", ["status", "ultimaAtividadeEm"]),

participantes: defineTable({
  sessaoId: v.id("sessoes"),
  nome: v.string(),
  token: v.string(),
  estado: estadoValidator, // "acompanhando" | "feliz" | "triste" | "duvida" | "confuso" | "estressado" | "tedio"
  estadoExpiraEm: v.optional(v.number()),
})
  .index("by_sessao", ["sessaoId"])
  .index("by_token", ["token"]),

perguntas: defineTable({
  sessaoId: v.id("sessoes"),
  autorId: v.id("participantes"),
  texto: v.string(),
  status: v.union(v.literal("aberta"), v.literal("respondida")),
  votos: v.number(),
  respondidaEm: v.optional(v.number()),
}).index("by_sessao_status", ["sessaoId", "status"]),

votos: defineTable({
  sessaoId: v.id("sessoes"),
  perguntaId: v.id("perguntas"),
  participanteId: v.id("participantes"),
})
  .index("by_pergunta_participante", ["perguntaId", "participanteId"])
  .index("by_participante", ["participanteId"]),
```

- `perguntas.votos` é um contador mantido na mesma mutation que insere ou remove o registro em `votos`. Como as mutations do Convex são transacionais, os dois nunca divergem.
- A ordenação do ranking é feita em memória na query.

## Backend

**Arquivos:**
- `convex/lib/acesso.ts`: helpers para resolver tokens, exigir sessão aberta, registrar atividade e gerar tokens e código.
- `convex/estados.ts`: validator e lista dos 7 estados, compartilhados com o frontend.
- `convex/sessoes.ts`, `convex/participantes.ts`, `convex/perguntas.ts` e `convex/crons.ts`.

### Mutations públicas

Todas declaram `args` e `returns` com `v.*` e falham com `ConvexError` e uma mensagem em português adequada para exibir ao usuário.

| Função | Autorização | Comportamento |
|---|---|---|
| `sessoes.criar({nome, organizadorNome})` | nenhuma | Valida os tamanhos, gera o código e o `adminToken` e retorna `{codigo, adminToken}`. |
| `sessoes.encerrar({adminToken})` | organizador | Define `status: "encerrada"` e `encerradaEm`. Se a sessão já estiver encerrada, não faz nada. |
| `participantes.entrar({codigo, nome})` | nenhuma | Falha se o código não existir ("Sessão não encontrada") ou se a sessão estiver encerrada. Cria o participante em Acompanhando e retorna `{token}`. |
| `participantes.definirEstado({token, estado})` | participante | Exige sessão aberta. Com estado ≠ acompanhando, grava `estadoExpiraEm = agora + 60_000` e agenda `expirarEstado`. Com acompanhando, remove `estadoExpiraEm`. |
| `perguntas.enviar({token, texto})` | participante | Exige sessão aberta e 1–280 caracteres depois do trim. Cria a pergunta com `votos: 0`. |
| `perguntas.alternarVoto({token, perguntaId})` | participante | Exige sessão aberta. A pergunta tem de ser da mesma sessão, estar aberta e ser de outro autor. Se o voto existe, remove e decrementa o contador; se não, insere e incrementa. |
| `perguntas.marcarRespondida({adminToken, perguntaId})` | organizador | Exige sessão aberta, a pergunta tem de ser da sessão do token e estar aberta. Grava `status: "respondida"` e `respondidaEm`. |

Toda mutation bem-sucedida chama `registrarAtividade(sessao)`, que só grava `ultimaAtividadeEm` se o valor tiver mais de 60 s. Isso reduz conflitos de escrita no documento da sessão.

### Funções internas

- **`participantes.expirarEstado({participanteId, expiraEm})`**: só volta para Acompanhando (e remove `estadoExpiraEm`) se o participante ainda tiver `estadoExpiraEm === expiraEm`. Assim, se a pessoa escolher outro estado depois, o agendamento antigo não o apaga.
- **`sessoes.encerrarInativas({})`**: o cron `crons.interval` a chama a cada 10 min. Pelo índice `by_status_atividade`, ela busca as sessões abertas com `ultimaAtividadeEm < agora − 2h` e as encerra. O encerramento automático pode atrasar até ~10 min além das 2 h.

### Query `sessoes.visao({codigo, token?, adminToken?})`

O retorno é uma união discriminada:

- **`null`:** o código não existe.
- **`{acesso: "publico", sessao}`:** sem token válido para *esta* sessão. `sessao = {nome, organizadorNome, codigo, status}`.
- **`{acesso: "participante" | "organizador", sessao, eu?, abertas, respondidas, participantes}`**, em que:
  - `eu`, só para participante, é `{id, nome, estado, estadoExpiraEm?}`.
  - `abertas` é `[{id, texto, autorNome, votos, criadaEm, minha, votei}]`, já no ranking. Para o organizador, `minha` e `votei` são `false`.
  - `respondidas` é `[{id, texto, autorNome, votos, respondidaEm}]`, ordenada por `respondidaEm` decrescente.
  - `participantes` é `[{id, nome, estado, estadoExpiraEm?}]`, ordenada por entrada.

Um token de outra sessão é tratado como ausente, e nenhum campo de token aparece em nenhum retorno.

**Estado efetivo:** as queries não reagem à passagem do tempo. Por isso, o cliente exibe Acompanhando quando `estadoExpiraEm <= Date.now()`, recalculando com um timer de 1 s, e o agendador corrige o banco em seguida.

## Frontend

As páginas usam componentes cliente com `useQuery` e `useMutation` e CSS próprio em `app/globals.css`, mobile-first. Antes de implementar, consultar `node_modules/next/dist/docs/` para rotas dinâmicas e `useParams` no Next 16.

**Armazenamento local** (todo acesso com try/catch; sem armazenamento, o app funciona, mas não reconhece quem retorna):
- `pulse:participante:CODIGO` guarda o token do participante.
- `pulse:admin:CODIGO` guarda o `adminToken`.

### `/` — Início

- Dois cartões, Organizador e Participante, cada um com seu formulário.
- **Criar sessão:** salva o `adminToken` e navega para `/s/CODIGO/organizador`.
- **Entrar:** normaliza o código, salva o token e navega para `/s/CODIGO`.
- Os erros aparecem perto do formulário.

### `/s/[codigo]` — Sala do participante (link compartilhável)

- **Código inexistente:** mostra "Sessão não encontrada" e um link para o início.
- **Acesso público:** mostra o nome da sessão e um formulário só com o nome. Se a sessão estiver encerrada, aparece um aviso no lugar do formulário.
- **Participante:**
  - Cabeçalho com o nome da sessão e o código.
  - **Meu estado:** 7 botões com emoji. O estado ativo fica destacado, com a contagem "volta para Acompanhando em Ns".
  - **Formulário de pergunta** com contador de caracteres.
  - **Perguntas abertas** no ranking, com botão de voto que alterna (`aria-pressed`). A própria pergunta aparece marcada como "Sua pergunta", sem botão.
  - **Participantes**, com nome e estado efetivo.
  - **Respondidas**, recolhida (`<details>`).
  - Com a sessão encerrada, uma faixa avisa o encerramento e os controles ficam desativados.

### `/s/[codigo]/organizador` — Painel

- **Token:** se houver `#t=TOKEN` na URL, a página salva o token e limpa o fragmento com `history.replaceState`. Sem fragmento, usa o token salvo.
- **Sem acesso de organizador:** mostra "Você não tem acesso de organizador a esta sessão" e um link para `/s/CODIGO`.
- **Painel:**
  - Código em destaque e botão "Copiar link dos participantes".
  - Seção "Link de administração", com botão de copiar e o aviso "não compartilhe".
  - **Estados:** resumo de contagens por estado efetivo e lista de nomes com estados.
  - **Perguntas abertas** no ranking, com "Marcar respondida".
  - **Respondidas.**
  - **"Encerrar sessão"**, com confirmação inline e sem `window.confirm`.
- Layout em duas colunas no desktop.

**Feedback:** os botões ficam desabilitados durante a mutation, e os erros aparecem perto da ação com `role="alert"`.

## Testes

- **Ferramentas:** devDependencies `vitest`, `convex-test` e `@edge-runtime/vm`. O script `pnpm test` (`vitest run`) é incluído em `pnpm check`. O desenvolvimento segue TDD.
- **Acesso:** o código não dá admin; `adminToken` de outra sessão é rejeitado; token inválido é rejeitado; `visao` sem token não expõe perguntas nem participantes; nenhum retorno contém tokens.
- **Votos:** 1 por pessoa por pergunta; um segundo clique remove; o voto na própria pergunta e o voto em pergunta respondida são rejeitados; o contador fica igual ao número de registros; o ranking ordena por votos e, no empate, pela mais antiga.
- **Respondidas:** a pergunta sai das abertas e entra nas respondidas; só o organizador da sessão pode marcar.
- **Estados:** a entrada começa em Acompanhando; com tempo simulado, o estado volta a Acompanhando após 60 s; um agendamento antigo não apaga um estado mais novo.
- **Encerramento:** a mutation manual funciona; o cron encerra a sessão depois de 2 h sem atividade e preserva a sessão ativa; a sessão encerrada rejeita entrada, pergunta, voto e troca de estado.

**Validação manual** (com `pnpm dev`, reaproveitado se já estiver rodando):
1. Criar a sessão como organizador.
2. Entrar com dois participantes em janelas anônimas, um pelo código e outro pelo link.
3. Perguntar, votar e retirar voto, conferindo o ranking ao vivo nas três janelas.
4. Trocar o estado e confirmar a volta para Acompanhando após ~1 min.
5. Marcar uma pergunta como respondida e encerrar a sessão.
6. Recarregar as páginas e recuperar o acesso pelo link de admin em outra janela.
7. Deixar o servidor ativo e informar a URL.

## Entrega

- **PR:** de `feat/pulse` para `alpha`, testado no Vercel Preview. Commits e push só com autorização.
- **README:** ganha a seção "Pulse — roteiro de teste" com o roteiro do critério de entrega.
- **Verificação:** `pnpm check` passa antes da entrega. `convex deploy` nunca é usado como teste.

## Atualização — requisitos consolidados (07/10/2026)

Estas regras complementam ou substituem as seções anteriores:

- **Interface:** usar **shadcn/ui + Tailwind CSS v4** (componentes Radix copiados para `components/ui/`). Isso substitui "CSS próprio em `globals.css`" e "sem dependências de runtime novas".
- **Encerramento e estados:**
  - Encerrar a sessão interrompe as mudanças automáticas de estado. `expirarEstado` não altera participantes de sessões encerradas.
  - Na interface, o estado efetivo fica congelado no instante `encerradaEm`. Expirações já vencidas nesse instante aparecem como Acompanhando, e não há contagem regressiva.
- **Nova participação:** sem token válido, uma nova entrada cria outra participação, mesmo com nome igual. O nome não recupera identidade.
- **Nomes:** valores compostos só de espaços são rejeitados na interface e no servidor.
- **Respondida após encerramento:** é rejeitada.
- **Atividade:** a expiração automática de estado não conta como atividade.
- **Tabela `counters`:** o código do contador é removido. A definição da tabela fica no schema, marcada como legado, para que o push do schema não falhe em deployments que já têm documentos nela (por exemplo, a produção Alpha).
