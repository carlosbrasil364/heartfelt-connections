import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["OPENAI_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { error: "OPENAI_API_KEY não configurada no servidor." },
            { status: 503 },
          );
        }

        try {
          const body = (await request.json()) as {
            text?: string;
            voice?: string;
            speed?: number;
          };

          const text = body.text?.trim();
          if (!text) {
            return Response.json(
              { error: "Texto da narração obrigatório." },
              { status: 400 },
            );
          }

          const allowedVoices = new Set([
            "alloy",
            "ash",
            "ballad",
            "coral",
            "echo",
            "fable",
            "nova",
            "onyx",
            "sage",
            "shimmer",
            "verse",
            "marin",
            "cedar",
          ]);
          const voice = allowedVoices.has(body.voice ?? "")
            ? body.voice!
            : "marin";
          const speed = Math.min(
            1.3,
            Math.max(0.75, Number(body.speed) || 0.95),
          );

          const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini-tts",
              voice,
              input: text,
              instructions:
                "Fale em português do Brasil de forma natural e humana. " +
                "É uma narração para um vídeo curto de suspense/documentário. " +
                "Use voz adulta, grave e clara, mas sem exagerar no drama. " +
                "Mantenha ritmo fluido, dicção natural e pausas curtas apenas onde a pontuação indicar. " +
                "Não faça voz de locutor de rádio, não sussurre e não altere palavras ou pronúncias.",
              response_format: "mp3",
              speed,
            }),
          });

          if (!response.ok) {
            console.error(
              "OpenAI TTS error:",
              response.status,
              await response.text(),
            );
            return Response.json(
              { error: "Não foi possível gerar a narração IA." },
              { status: 502 },
            );
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          return Response.json({
            audio: `data:audio/mpeg;base64,${buffer.toString("base64")}`,
          });
        } catch (error) {
          console.error("Generate voice error:", error);
          return Response.json(
            { error: "Erro ao gerar narração IA." },
            { status: 500 },
          );
        }
      },
    },
  },
});
