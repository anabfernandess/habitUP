<div align="center">

# 🎮 HabitUP

### Transforme hábitos em progresso. Progresso em XP. E XP em conquistas.

**HabitUP** é um habit tracker gamificado criado para tornar a construção de hábitos mais divertida, visual e desafiadora.

Aqui, marcar uma tarefa como concluída é só o começo.

O objetivo é fazer com que o usuário queira voltar não apenas para **manter o hábito**, mas também para **subir de nível, aumentar seu streak, desbloquear conquistas e conquistar novas skins para seu avatar**.

<br>

[![Acessar HabitUP](https://img.shields.io/badge/🎮_ACESSAR_HABITUP-7C3AED?style=for-the-badge)](https://habit-up-eta.vercel.app/)

![Status](https://img.shields.io/badge/status-online-success?style=flat-square)
![Mobile First](https://img.shields.io/badge/mobile--first-✓-blueviolet?style=flat-square)
![Gamification](https://img.shields.io/badge/gamification-XP_&_Rewards-orange?style=flat-square)
![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E?style=flat-square)

</div>

---

## 💡 A ideia

Criar hábitos é fácil.

**Continuar é a parte difícil.**

O HabitUP nasceu da ideia de transformar essa constância em algo mais próximo de um jogo.

Em vez de oferecer apenas uma checklist onde o usuário marca:

> ✅ "fiz meu hábito hoje"

o aplicativo cria uma segunda motivação:

> 🎯 "o que eu vou desbloquear se continuar?"

Cada hábito concluído gera **XP**.

O XP aumenta o **nível** do usuário.

A consistência gera **streaks**.

E determinados marcos desbloqueiam **roupas, acessórios, fundos e efeitos especiais para o avatar**.

Assim, o desafio deixa de ser apenas cumprir um hábito.

Ele também passa a ser:

**🔥 manter a sequência
⭐ ganhar XP
🏆 desbloquear conquistas
👕 conquistar skins
🎨 personalizar o avatar
📈 alcançar o próximo nível**

A proposta é usar a **gamificação como incentivo à constância**.

---

# 🎯 Como funciona?

```text
Criar um hábito
       ↓
Cumprir o hábito
       ↓
Ganhar XP
       ↓
Aumentar o streak
       ↓
Subir de nível
       ↓
Desbloquear conquistas
       ↓
Liberar skins e acessórios
       ↓
Personalizar o avatar
       ↓
Continuar evoluindo 🚀
```

---

## ✨ Principais funcionalidades

### ✅ Hábitos

Crie e acompanhe hábitos diretamente pelo aplicativo.

Cada usuário possui seus próprios dados e progresso.

---

### ⚡ Sistema de XP

Cada hábito concluído vale:

**+20 XP**

O XP é usado para calcular automaticamente o nível do usuário.

```text
100 XP → próximo nível
```

Quanto maior a constância, maior a evolução.

---

### 🔥 Streaks

O HabitUP acompanha sequências de dias consecutivos.

Manter um hábito ativo por vários dias pode desbloquear recompensas exclusivas.

Exemplos:

* 🔥 3 dias de streak
* 🔥 7 dias de streak
* 🔥 30 dias consecutivos

---

### 🏆 Conquistas

As recompensas não são apenas badges decorativas.

Elas fazem parte da experiência do aplicativo.

Ao atingir determinados objetivos, o usuário desbloqueia novos itens para personalização.

| Desafio                 | Recompensa                 |
| ----------------------- | -------------------------- |
| ✅ Primeira conclusão    | 👕 Camiseta Primeiro Passo |
| 🎯 10 conclusões        | 🧢 Boné                    |
| 🔥 3 dias de streak     | 🎀 Bandana                 |
| 🔥 7 dias de streak     | 🧥 Jaqueta                 |
| 🎧 50 conclusões        | 🎧 Fones                   |
| ⭐ Nível 5               | 🥋 Conjunto Explorador     |
| 🌌 Nível 10             | 🖼️ Fundo especial         |
| 🔥 30 dias consecutivos | ✨ Aura de Mestre           |

> Algumas conquistas dependem de consistência real. A **Aura de Mestre**, por exemplo, exige 30 dias consecutivos de atividade.

---

## 👾 Avatar próprio

O usuário possui um pequeno avatar criado diretamente em **SVG**.

Ele pode ser personalizado conforme novas conquistas são desbloqueadas.

Entre os itens disponíveis estão:

```text
👕 Roupas
🧢 Chapéus
🎀 Acessórios
🎧 Fones
🧥 Jaquetas
🌌 Fundos
✨ Efeitos especiais
```

A ideia é fazer com que o avatar seja uma representação visual do progresso do usuário.

**Quanto mais consistência, mais possibilidades de personalização.**

---

# 🧠 Gamificação

A lógica central do HabitUP é simples:

> **O hábito é o objetivo. A recompensa ajuda a manter o caminho interessante.**

O aplicativo trabalha com diferentes formas de feedback:

* XP
* níveis
* streaks
* desbloqueios
* conquistas
* skins
* personalização
* evolução visual
* animações de recompensa

Isso cria pequenas metas dentro da meta principal.

O usuário não precisa pensar apenas:

> "Preciso continuar meu hábito."

Ele também pode pensar:

> "Faltam só mais dois dias para desbloquear aquela skin."

E é justamente esse comportamento que o HabitUP procura estimular.

---

# 🛠️ Tecnologias

<div align="center">

<img src="https://skillicons.dev/icons?i=react,ts,vite,supabase,postgres,vitest,vercel,git,github" />

</div>

<br>

### Frontend

* ⚛️ **React 19**
* 🔷 **TypeScript**
* ⚡ **Vite**
* 🧭 **React Router**
* 🎨 CSS responsivo
* 🖼️ SVG para o sistema de avatar

### Backend & Banco

* 🟢 **Supabase**
* 🐘 **PostgreSQL**
* 🔐 Supabase Auth
* 🛡️ Row Level Security — RLS
* ⚙️ PostgreSQL RPCs
* 🔒 Funções `SECURITY DEFINER`

### Testes

* 🧪 **Vitest**
* 🧪 **React Testing Library**
* 🌐 **jsdom**

### Deploy

* ▲ **Vercel**
* 🟢 **Supabase**

---

# 🔐 Segurança

O HabitUP foi estruturado para que informações importantes da gamificação não sejam controladas diretamente pelo frontend.

O navegador **não decide quanto XP o usuário possui**.

Também não é responsável por conceder conquistas ou validar streaks.

Essas regras são processadas no banco.

### Algumas proteções implementadas

* autenticação individual por usuário;
* Row Level Security nas tabelas;
* isolamento dos dados por `user_id`;
* GRANTs mínimos;
* funções PostgreSQL controladas;
* validação com `auth.uid()`;
* escrita protegida em estatísticas;
* proteção contra conclusão duplicada;
* proteção contra alteração direta de XP;
* validação de itens desbloqueados;
* controle de recompensas pelo backend;
* `search_path` definido nas funções sensíveis;
* advisory lock para operações simultâneas.

### Fonte de verdade

```text
Frontend
   ↓
RPC
   ↓
PostgreSQL
   ↓
Recalcula XP
   ↓
Recalcula nível
   ↓
Recalcula streak
   ↓
Valida conquistas
   ↓
Retorna o novo estado
```

O frontend fica responsável principalmente pela **experiência do usuário e apresentação dos dados**.

O banco é responsável pela **integridade da progressão**.

---

# 🗄️ Estrutura de dados

O backend utiliza principalmente:

```text
profiles
│
├── dados do usuário
├── timezone
└── configuração do avatar

habits
│
└── hábitos criados pelo usuário

completions
│
└── histórico de conclusões

user_stats
│
├── XP
├── nível
├── total de conclusões
└── melhor streak

user_rewards
│
└── conquistas desbloqueadas
```

---

# 🧮 Regras de progressão

### XP

Cada conclusão:

```text
+20 XP
```

### Nível

```text
nível = floor(XP total / 100) + 1
```

Exemplo:

```text
0 XP   → nível 1
100 XP → nível 2
200 XP → nível 3
300 XP → nível 4
400 XP → nível 5
```

---

# 🔥 Controle de streak

O sistema mantém:

* sequência atual;
* melhor sequência já alcançada;
* histórico de conclusões;
* validação pela data do usuário.

Ao desfazer uma conclusão válida do dia atual, estatísticas e conquistas relacionadas são recalculadas.

Se uma recompensa deixar de cumprir seu requisito, ela também pode ser removida do inventário e do avatar.

---

# 🧪 Testes

O projeto possui testes em diferentes camadas.

### Testes locais

```bash
npm test
```

São testados cenários como:

* XP;
* níveis;
* streaks;
* desbloqueios;
* criação de hábitos;
* conclusão;
* desfazer conclusão;
* refazer sem duplicar XP;
* revogação de conquistas;
* persistência;
* regras do modo demonstrativo.

### Build

```bash
npm run build
```

Executa:

```text
TypeScript typecheck
        +
Build otimizado do Vite
```

---

## 🛡️ Testes de segurança do banco

O projeto também possui verificações específicas para a camada Supabase/PostgreSQL.

```text
supabase/integration/verify.sql
```

O script verifica cenários como:

* isolamento entre usuários;
* RLS;
* permissões das roles;
* escrita direta bloqueada;
* RPCs;
* XP;
* streak;
* conquistas;
* desbloqueios;
* tentativa de equipar item não conquistado;
* desfazer conclusão;
* recompensas revogadas;
* Aura de 30 dias.

Quando todas as verificações são aprovadas:

```text
HABITUP VERIFY OK
```

---

# 🚀 Rodando localmente

Clone o projeto e instale as dependências:

```bash
npm install
```

Inicie o ambiente:

```bash
npm run dev
```

---

## ⚙️ Configuração do Supabase

Crie:

```text
.env
```

Baseado no:

```text
.env.example
```

E configure:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

> ⚠️ O `.env` não deve ser versionado.

Depois reinicie:

```bash
npm run dev
```

---

# 🧩 Estrutura simplificada

```text
HabitUP/
│
├── src/
│   ├── avatar/
│   │   └── AvatarPreview.tsx
│   │
│   ├── hooks/
│   │
│   ├── lib/
│   │   ├── appService.ts
│   │   ├── compute.ts
│   │   ├── date.ts
│   │   ├── gamification.ts
│   │   ├── items.ts
│   │   └── supabase.ts
│   │
│   ├── pages/
│   │   ├── Login
│   │   ├── Today
│   │   ├── Habits
│   │   ├── Avatar
│   │   └── Profile
│   │
│   ├── server/
│   │   ├── demoAdapter.ts
│   │   └── supabaseAdapter.ts
│   │
│   └── App.tsx
│
├── supabase/
│   ├── migrations/
│   └── integration/
│
└── README.md
```

---

# 💻 Modo demonstrativo

Sem as variáveis do Supabase, o HabitUP também consegue funcionar em modo demonstrativo.

Nesse modo:

```text
hábitos
XP
inventário
sessão
```

ficam armazenados localmente através de `localStorage`.

Os dados do modo demo são separados dos dados reais:

```text
habitup:demo:*
```

---

# 🌐 Aplicação publicada

O HabitUP já está disponível online.

<div align="center">

### 👇 Teste o projeto

[![Abrir HabitUP](https://img.shields.io/badge/ABRIR_HABITUP-🎮-7C3AED?style=for-the-badge)](https://habit-up-eta.vercel.app/)

**Crie uma conta, escolha seus hábitos e comece a ganhar XP.**

https://habit-up-eta.vercel.app/

</div>

---

# 🔮 Próximas evoluções

Algumas ideias previstas para continuar evoluindo o projeto:

* 🔔 notificações;
* 📊 estatísticas avançadas;
* 📅 visualização de histórico;
* 🏆 novas conquistas;
* 👕 novas skins;
* ✨ novos efeitos;
* 🎯 novos desafios;
* 📱 evolução da experiência mobile;
* 🎮 expansão do sistema de gamificação.

---

# 💜 Por que criei o HabitUP?

O HabitUP começou como um projeto para unir duas coisas:

**desenvolvimento de software + gamificação.**

Mais do que desenvolver um CRUD de hábitos, a proposta foi construir uma aplicação com:

* autenticação;
* banco de dados;
* regras de negócio;
* segurança;
* persistência;
* testes;
* gamificação;
* experiência de usuário;
* deploy real.

O resultado é um projeto onde frontend e backend trabalham juntos para transformar uma ação simples — **cumprir um hábito** — em uma experiência de progressão.

---

<div align="center">

### 🎮 HabitUP

**Crie. Cumpra. Evolua. Desbloqueie.**

⭐ Se curtiu o projeto, deixe uma estrela no repositório!

</div>
