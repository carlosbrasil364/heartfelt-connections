import { createFileRoute } from "@tanstack/react-router";
import { gatewayErrorMessage, passStatus, streamResponseText } from "@/lib/gateway.server";

type Scene = {
  time: string;
  title: string;
  narration: string;
  visual: string;
  onScreen: string;
  imagePrompt: string;
};

type ScriptResponse = {
  title: string;
  hook: string;
  scenes: Scene[];
};

export const Route = createFileRoute("/api/generate-script")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];

        if (!apiKey) {
          return Response.json({ error: "IA não configurada no servidor." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as { topic?: string };
          const topic = body.topic?.trim();

          if (!topic) {
            return Response.json({ error: "Informe um tema." }, { status: 400 });
          }

          const result = await streamResponseText(
            apiKey,
            "Você é roteirista profissional de vídeos dark de 60 segundos em português do Brasil. Crie roteiros fortes e envolventes. Quando o tema for factual, não invente fatos apresentados como verdade. Responda somente JSON válido.",
            `Crie um roteiro vertical 9:16 de exatamente 60 segundos sobre: ${topic}.

Retorne exatamente este JSON, com 4 cenas nesta ordem (00–12s GANCHO, 12–27s MISTÉRIO, 27–45s REVELAÇÃO, 45–60s CLIFFHANGER):
{"title":"título curto","hook":"frase de impacto","scenes":[{"time":"00–12s","title":"GANCHO","narration":"narração natural para esta duração","visual":"descrição do que aparece na cena","onScreen":"texto curto na tela","imagePrompt":"prompt cinematográfico para imagem vertical 9:16"}]}

Use frases curtas e ritmo de vídeo curto. Não use markdown.`,
          );

          if (!result.ok) {
            return Response.json({ error: gatewayErrorMessage(result.status, "A IA não conseguiu gerar o roteiro agora.") }, { status: passStatus(result.status) });
          }

          const script = JSON.parse(result.text) as ScriptResponse;

          if (!script.title || !script.hook || !Array.isArray(script.scenes) || script.scenes.length !== 4) {
            throw new Error("Formato de roteiro inválido.");
          }

          return Response.json(script);
        } catch (error) {
          console.error("Generate script error:", error);
          return Response.json({ error: "Não foi possível interpretar o roteiro gerado." }, { status: 500 });
        }
      },
    },
  },
});
