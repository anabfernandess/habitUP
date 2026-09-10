# HabitUP

App web **mobile-first** de rastreamento de hábitos gamificado: cada hábito concluído vale **XP** e desbloqueia **itens cosméticos** para um pequeno **avatar próprio** (feito em SVG). Interface em **pt-BR**, com tema escuro e animações que respeitam `prefers-reduced-motion`.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + React Router (HashRouter)
- **Backend (opcional):** Supabase (Auth + Postgres + RLS)
- **Testes:** Vitest + React Testing Library + jsdom
- **Fallback:** modo demonstrativo com dados em `localStorage` (sem backend)

## Como rodar

```bash
npm install
npm run dev
```

Build e testes:

```bash
npm run build    # typecheck (tsc -b) + build otimizado
npm test         # suíte completa (unitários + componentes)
npm run preview  # serve a build para conferência
```

Sem nenhuma variável de ambiente o app abre no **modo demonstrativo** (banner visível na tela): sessão, hábitos, XP e inventário ficam no `localStorage`, separados dos dados reais (`habitup:demo:*`).

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, aplique a migração `supabase/migrations/20260909_habitu_init.sql` (tabelas, **GRANTs mínimos**, RLS, triggers e funções RPC seguras). A migração é idempotente.
3. (Recomendado) Rode a verificação `supabase/integration/verify.sql` no SQL Editor após a migração (explica e valida RLS, isolamento por usuário, desfazer-só-hoje, equipar item bloqueado e Aura 30). Veja a seção **Testes**.
4. Em **Dashboard → Project Settings → API**, copie a URL e a anon key.
5. Copie `.env.example` para `.env` e preencha:
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
   ```
6. Reinicie o `npm run dev` (arquivo `.env` nunca deve ir para o versionamento).

Com as variáveis presentes, o app usa **autenticação real** (e-mail/senha), persistência no Postgres e regras RLS por usuário.

## Estrutura do projeto

```
src/
├── lib/
│   ├── supabase.ts          # client (somente se VITE_* configurados)
│   ├── service.ts           # interface AppService (fonte única de regras)
│   ├── appService.ts        # singleton -> DemoService ou SupabaseService
│   ├── gamification.ts      # XP, níveis e catálogo de recompensas
│   ├── date.ts              # chaves de data/fuso, streaks
│   ├── items.ts             # catálogo de peças do avatar (slots, desbloqueio)
│   └── compute.ts           # computação de desbloqueios/papeis
├── server/
│   ├── demoAdapter.ts       # implementação em localStorage
│   ├── demoAdapter.test.ts  # testes do modo demo (sem banco)
│   ├── supabaseAdapter.ts   # implementação via client Supabase
│   ├── supabaseAdapter.test.ts  # testes com mock do client (sem banco)
│   ├── migration.test.ts    # contrato de segurança da migração (estático)
│   └── supabase.integration.test.ts # requer banco real (opt-in via env)
├── hooks/                   # useAuth, useData (bundle + celebrações)
├── avatar/AvatarPreview.tsx # renderização SVG em camadas
├── pages/                   # Login, Today, Habits, Avatar, Profile
└── App.tsx                  # rotas, shell e layout mobile (BottomNav)
supabase/migrations/20260909_habitu_init.sql   # schema + GRANTs + RLS + RPCs
supabase/integration/verify.sql               # verificação manual no SQL Editor
```

## Regras de gamificação

- **XP:** cada conclusão vale **20 XP**.
- **Nível:** `nível = ⌊XP total / 100⌋ + 1` (100 XP por nível).
- **Streak:** sequência atual conta até ontem (o dia de hoje pendente não quebra a raia). O recorde `best_streak` é recalculado a partir do **histórico válido**: desfazer uma conclusão recalcula o recorde; perder um dia por inércia não apaga um recorde legítimo.
- **Recompensas:** desbloqueadas por conclusões totais ou streak recorde — deixam de ser exibidas como equipáveis e são **revogadas no banco** se o requisito não for mais satisfeito (ex.: desfazer a conclusão que as sustentava). A peça revogada é removida do avatar automaticamente.

| ID              | Requisito                              | Item                       |
|-----------------|----------------------------------------|----------------------------|
| `shirt_first_step` | 1 conclusão                          | Camiseta Primeiro Passo    |
| `cap_10`        | 10 conclusões                          | Boné Nível 10*             |
| `headphones_50` | 50 conclusões                          | Fones                            |
| `jacket_streak7`| 7 dias de streak                       | Jaqueta Streak 7           |
| `headband_streak3` | 3 dias de streak                    | Bandana Streak 3           |
| `aura_30`       | 30 dias consecutivos                   | Aura 30                    |
| `outfit_level5` | 20 conclusões (= nível 5 no SQL espelho via `v_level >= 5`) | Conjunto Explorador |
| `bg_level10`    | 45 conclusões (= nível 10 no SQL via `v_level >= 10`) | Fundo Level 10     |

*O nome em tela usa o requisito real (ex.: boné exige 10 conclusões no total). A Aura de Mestre exige **30 dias consecutivos** de atividade (streak), não 30 conclusões.

**No backend**, XP nunca é calculado no front: `complete_habit` (com unicidade `UNIQUE (habit_id, completed_date)`) e `undo_completion` são funções `SECURITY DEFINER`, e `sync_user_data` recalcula níveis/XP/recompensas a partir das conclusões — o front só exibe. Só é possível desfazer a conclusão do **dia atual no fuso do usuário** (validado no banco). Conclusões simultâneas são serializadas por advisory lock para que as estatísticas fiquem corretas. Escrita direta em `completions`, `user_stats` e `user_rewards` é bloqueada (sem política de escrita + sem GRANT de escrita); `profiles` tem trigger que impede equipar peças não possuídas e normaliza o `timezone`.

## Testes

Os testes são separados por camada para deixar claro o que roda localmente e o que precisa do banco.

- **Modo demo (sem banco):** `src/server/demoAdapter.test.ts`, `src/lib/*.test.ts`, `src/App.test.tsx` — rodam com `npm test` (Vitest + jsdom). Cobrem XP/desbloqueios, streak, **desfazer só hoje**, **desfazer/refazer sem duplicar XP**, **desfazer recalcula o recorde e revoga a conquista**, perder um dia sem apagar recorde e conclusões simultâneas.
- **Mocks (sem banco):** `src/server/supabaseAdapter.test.ts` — mockam o client Supabase e provam que o app só grava via RPC (`complete_habit`/`undo_completion`), que `user_stats`/`user_rewards`/`completions` nunca recebem escrita direta e que as consultas são sempre filtradas por `user_id`.
- **Contrato de segurança (sem banco):** `src/server/migration.test.ts` — valida o SQL da migração: RLS ativo nas 5 tabelas, policies somente-próprio, GRANTs mínimos (somente `SELECT` em estatísticas/recompensas/conclusões), funções `SECURITY DEFINER` com `search_path` fixo, `sync_user_data` validando `auth.uid()`, desfazer apenas hoje, advisory lock e trigger anti-item-bloqueado.
- **Integração real (exige Supabase):** `src/server/supabase.integration.test.ts` e `supabase/integration/verify.sql`.

Rode os testes locais:

```bash
npm test
npm run build
```

### Testes no Supabase real (opcional)

Eu **não** tinha acesso a um banco neste ambiente, então os testes que tocam o Postgres/Supabase estão prontos, mas **opt-in**:

1. Execute a migração no SQL Editor.
2. Suaíte automatizada (cria usuários/hábitos transitórios — use um projeto descartável):
   ```
   SUPABASE_TEST_URL=https://SEU-PROJETO.supabase.co SUPABASE_TEST_ANON_KEY=anon-key npm test
   ```
   Exige login sem confirmação de e-mail (defina **Confirm email = off** em Authentication), senão a suíte avisa. Testa: isolamento entre dois usuários, concluir/desfazer/concluir sem duplicar XP, bloqueio de escrita direta em XP, bloqueio de equipar item não possuído, e 2 conclusões simultâneas terminando com estatísticas corretas.
3. Verificação por SQL: cole `supabase/integration/verify.sql` no SQL Editor. Ele usa `set role authenticated` + `request.jwt.claims` para simular dois usuários reais e lança erro (`raise exception`) se qualquer asserção falhar — cobre além do item acima: desfazer conclusão de dia anterior bloqueado, revogação de recompensa/avatar, e Aura 30 só com 30 dias consecutivos.

## Testes executados (neste ambiente)

Ambiente: Windows + Node v26.7.0 · Vitest 5 (jsdom) · React Testing Library.

- Unitários: `src/lib/date.test.ts`, `src/lib/gamification.test.ts`, `src/lib/compute.test.ts`.
- Modo demo: `src/server/demoAdapter.test.ts` (CRUD, concluir/desfazer, streak, isolamento de regras).
- Mocks do adapter: `src/server/supabaseAdapter.test.ts`.
- Contrato da migração: `src/server/migration.test.ts`.
- Componente: `src/App.test.tsx` (login → ciclo completo → persistência → avatar).

## Limitações e funcionalidades simuladas

- **Notificações push** e **insights/estatísticas avançadas** não estão implementadas — a UI reserva espaço no Perfil ("Em breve").
- **Modo demonstrativo:** simula a origem do `user_id` e o `onAuthChange`; dados isolados no `localStorage`, **não** são transferidos para o Supabase. Os dados locais existentes são preservados.
- **Supabase real:** a reconciliação de recompensas ocorre **dentro do próprio RPC** (`sync_user_data` roda síncrono em `complete_habit`/`undo_completion`) — o item aparece imediatamente após a operação. A recarga de dados depende do banco (sem cache offline).
- **Avatar cosmético:** é renderização SVG local (sem assets externos). No fallback demo, `localStorage` não sincroniza entre abas (evento `storage` mantém a sessão, mas conflitos rápidos entre abas podem divergir) — no Supabase o isolamento/consistência é garantido por RLS + RPC atômico com advisory lock.
- **Desfazer:** limitado à conclusão de **hoje** (fuso do usuário), no demo e no banco. Não há retroativamente desfazer dias anteriores de propósito.