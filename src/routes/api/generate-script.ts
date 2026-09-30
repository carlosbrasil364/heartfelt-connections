import { createFileRoute } from "@tanstack/react-router";

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
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
          return Response.json({ error: "OPENAI_API_KEY não configurada no servidor." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as { topic?: string };
          const topic = body.topic?.trim();

          if (!topic) {
            return Response.json({ error: "Informe um tema." }, { status: 400 });
          }

          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-5.6-luna",
              input: [
                {
                  role: "system",
                  content: "Você é roteirista profissional de vídeos dark de 60 segundos em português do Brasil. Crie roteiros fortes e envolventes. Quando o tema for factual, não invente fatos apresentados como verdade. Responda somente JSON válido.",
                },
                {
                  role: "user",
                  content: `Crie um roteiro vertical 9:16 de exatamente 60 segundos sobre: ${topic}.

Retorne exatamente este JSON:
{
  "title": "título curto",
  "hook": "frase de impacto",
  "scenes": [
    {
      "time": "00–12s",
      "title": "GANCHO",
      "narration": "narração natural para esta duração",
      "visual": "descrição do que aparece na cena",
      "onScreen": "texto curto na tela",
      "imagePrompt": "prompt cinematográfico para imagem vertical 9:16"
    },
    {
      "time": "12–27s",
      "title": "MISTÉRIO",
      "narration": "...",
      "visual": "...",
      "onScreen": "...",
      "imagePrompt": "..."
    },
    {
      "time": "27–45s",
      "title": "REVELAÇÃO",
      "narration": "...",
      "visual": "...",
      "onScreen": "...",
      "imagePrompt": "..."
    },
    {
      "time": "45–60s",
      "title": "CLIFFHANGER",
      "narration": "...",
      "visual": "...",
      "onScreen": "...",
      "imagePrompt": "..."
    }
  ]
}

Use frases curtas e ritmo de vídeo curto. Não use markdown.`,
                },
              ],
            }),
          });

          if (!response.ok) {
            console.error("OpenAI error:", await response.text());
            return Response.json({ error: "A IA não conseguiu gerar o roteiro agora." }, { status: 502 });
          }

          const payload = (await response.json()) as {
            output_text?: string;
            output?: Array<{ content?: Array<{ text?: string }> }>;
          };

          const text =
            payload.output_text ??
            payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ??
            "";

          const cleaned = text.replace(/^\s*```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
          const script = JSON.parse(cleaned) as ScriptResponse;

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
