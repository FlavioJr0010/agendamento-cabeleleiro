import { afterEach, describe, expect, it, vi } from "vitest";
import { criarEnvioResend } from "./processar-lembretes";

afterEach(() => vi.unstubAllGlobals());
describe("envio de lembretes", () => {
  it("envia texto com a chave de idempotência da notificação", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"id":"email-id"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await criarEnvioResend(
      "chave-teste",
      "Salão <agenda@example.com>",
    )({
      id: "notif-1",
      email: "cliente@example.com",
      assunto: "Lembrete",
      corpo: "Seu horário é amanhã.",
    });
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opcoes.headers["Idempotency-Key"]).toBe("notif-1");
    expect(JSON.parse(opcoes.body)).toEqual({
      from: "Salão <agenda@example.com>",
      to: ["cliente@example.com"],
      subject: "Lembrete",
      text: "Seu horário é amanhã.",
    });
  });
  it("não considera rejeição do provedor como envio concluído", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("limite", { status: 429 })),
    );
    await expect(
      criarEnvioResend(
        "chave",
        "remetente",
      )({
        id: "notif-2",
        email: "cliente@example.com",
        assunto: "Lembrete",
        corpo: "Teste",
      }),
    ).rejects.toThrow("HTTP 429");
  });
});
