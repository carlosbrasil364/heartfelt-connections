import { createFileRoute } from "@tanstack/react-router";
import { GATEWAY, gatewayErrorMessage, gatewayHeaders, passStatus } from "@/lib/gateway.server";

export const Route = createFileRoute("/api/generate-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "IA não configurada no servidor." }, { status: 503 });

        try {
          const body = (await request.json()) as { text?: string };
          const text = body.text?.trim();
          if (!text) return Response.json({ error: "Texto da narração obrigatório." }, { status: 400 });

          const response = await fetch(`${GATEWAY}/audio/speech`, {
            method: "POST",
            headers: gatewayHeaders(apiKey),
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-tts-preview",
              contents: [{ role: "user", parts: [{ text: `Narre em português do Brasil, com voz grave, clara e cinematográfica, ritmo de documentário dark e suspense controlado: ${text}` }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
              },
            }),
          });

          if (!response.ok) {
            console.error("TTS error:", response.status, await response.text());
            return Response.json({ error: gatewayErrorMessage(response.status, "Não foi possível gerar a narração IA.") }, { status: passStatus(response.status) });
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          const mime = response.headers.get("content-type")?.split(";")[0] || "audio/wav";
          return Response.json({ audio: `data:${mime};base64,${buffer.toString("base64")}` });
        } catch (error) {
          console.error("Generate voice error:", error);
          return Response.json({ error: "Erro ao gerar narração IA." }, { status: 500 });
        }
      },
    },
  },
});
