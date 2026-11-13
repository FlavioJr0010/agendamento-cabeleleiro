import { podeAcessarThread } from "@/db/consultas/mensagens";
import { auth } from "@/lib/auth";
import { inscrever } from "@/lib/tempo-real";

/** Server-Sent Events: avisa o navegador quando chega mensagem numa conversa que ele pode ver. */
export async function GET(req: Request) {
  const sessao = await auth.api.getSession({ headers: req.headers });
  if (!sessao) return new Response("Não autorizado", { status: 401 });
  const usuario = { id: sessao.user.id, papel: sessao.user.papel as string };

  const codificador = new TextEncoder();
  let encerrar = () => {};

  const fluxo = new ReadableStream({
    start(controle) {
      const enviar = (texto: string) => {
        try {
          controle.enqueue(codificador.encode(texto));
        } catch {
          encerrar();
        }
      };
      enviar("retry: 5000\n: conectado\n\n");

      const cancelar = inscrever(async ({ threadId }) => {
        if (await podeAcessarThread(usuario, threadId)) {
          enviar(`event: mensagem\ndata: ${JSON.stringify({ threadId })}\n\n`);
        }
      });
      const ping = setInterval(() => enviar(": ping\n\n"), 25_000);

      encerrar = () => {
        cancelar();
        clearInterval(ping);
        try {
          controle.close();
        } catch {
          /* já fechado */
        }
      };
      req.signal.addEventListener("abort", encerrar);
    },
    cancel() {
      encerrar();
    },
  });

  return new Response(fluxo, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
