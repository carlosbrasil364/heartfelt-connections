import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "OPENAI_API_KEY não configurada." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as {
            text?: string;
            voice?: string;
            speed?: number;
          };

          if (!body.text?.trim()) {
            return Response.json({ error: "Texto da narração obrigatório." }, { status: 400 });
          }

          const allowedVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"];
          const voice = allowedVoices.includes(body.voice ?? "") ? body.voice : "marin";
          const speed = Math.min(1.5, Math.max(0.75, Number(body.speed) || 1));

          const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini-tts",
              voice,
              input: body.text.trim(),
              instructions: "Fale em português do Brasil, com voz natural, clara e cinematográfica. Use ritmo de documentário dark, suspense controlado e ênfase nas frases importantes.",
              response_format: "mp3",
              speed,
            }),
          });

          if (!response.ok) {
            console.error("TTS error:", await response.text());
            return Response.json({ error: "Não foi possível gerar a narração IA." }, { status: 502 });
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          return Response.json({ audio: `data:audio/mpeg;base64,${buffer.toString("base64")}` });
        } catch (error) {
          console.error("Generate voice error:", error);
          return Response.json({ error: "Erro ao gerar narração IA." }, { status: 500 });
        }
      },
    },
  },
});
