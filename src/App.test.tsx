import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const SESSION = "habitup:demo:session";

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

describe("HabitUP (smoke com o modo demonstrativo)", () => {
  it("sem sessão mostra a tela de login e o modo demonstrativo entra no app", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("HabitUP")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /Entrar no modo demonstrativo/i }),
    );

    expect(await screen.findByText(/Olá, Viajante/i)).toBeTruthy();
    // navegação inferior presente
    expect(screen.getByRole("link", { name: "Hoje" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hábitos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Avatar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Perfil" })).toBeTruthy();
  });

  it("ciclo completo: criar hábito, concluir, ganhar XP, desfazer e acessar o Avatar", async () => {
    localStorage.setItem(SESSION, "1");
    const user = userEvent.setup();
    render(<App />);

    // Hoje: vazio
    expect(await screen.findByText(/Nenhum hábito ainda/i)).toBeTruthy();

    // Criar hábito partindo do empty state
    await user.click(
      screen.getByRole("button", { name: /Criar meu primeiro hábito/i }),
    );
    const nameInput = await screen.findByLabelText("Nome");
    await user.type(nameInput, "Beber água");
    await user.click(screen.getByRole("button", { name: /Criar hábito/i }));

    expect(await screen.findByText("Hábito criado!")).toBeTruthy();
    expect(await screen.findByText("Beber água")).toBeTruthy();

    // Voltar para Hoje e concluir
    await user.click(screen.getByRole("link", { name: "Hoje" }));
    const complete = await screen.findByRole("button", {
      name: /Concluir Beber água/i,
    });
    await user.click(complete);

    expect(
      (await screen.findAllByText("+20 XP")).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByText("1/1")).toBeTruthy();
    expect((await screen.findByText(/20 \/ 100 XP/)).textContent).toContain("20");

    // a primeira conclusão desbloqueia a camiseta "Primeiro Passo" (celebração)
    expect(await screen.findByText("Item desbloqueado!")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Adiar" }));

    // Desfazer corrige XP
    await user.click(
      await screen.findByRole("button", { name: /Desfazer conclusão/i }),
    );
    expect(await screen.findByText("Conclusão desfeita. XP ajustado.")).toBeTruthy();
    expect(await screen.findByText("0/1")).toBeTruthy();

    // Avatar acessível com inventário
    await user.click(screen.getByRole("link", { name: "Avatar" }));
    expect((await screen.findByText("Inventário")).textContent).toBe("Inventário");
  });

  it("mantém os dados após sair e entrar de novo", async () => {
    localStorage.setItem(SESSION, "1");
    const user = userEvent.setup();
    const first = render(<App />);

    // Cria um hábito
    await user.click(
      await first.findByRole("button", { name: /Criar meu primeiro hábito/i }),
    );
    await user.type(await first.findByLabelText("Nome"), "Persistente");
    await user.click(first.getByRole("button", { name: /Criar hábito/i }));
    await first.findByText("Persistente");

    first.unmount();

    // Sessão continua aberta; nova instância recarrega do localStorage.
    // Na tela Hoje, o hábito criado antes ainda aparece.
    const second = render(<App />);
    await second.findByText("Persistente");
    expect(second.queryByText("Persistente")).toBeTruthy();
    second.unmount();
  });

  it("avatar mostra inventário, item equipado e bloqueado com requisito", async () => {
    localStorage.setItem(SESSION, "1");
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("link", { name: "Avatar" }));
    await waitFor(() => expect(screen.getByText("Inventário")).toBeTruthy());

    expect(screen.getAllByText("Equipado").length).toBeGreaterThan(0);

    // itens bloqueados mostram o requisito (ex.: boné exige 10 conclusões)
    await user.click(screen.getByRole("button", { name: /Cabelo e chapéus/i }));
    expect(screen.getByText(/10 hábitos concluídos no total/i)).toBeTruthy();
  });
});