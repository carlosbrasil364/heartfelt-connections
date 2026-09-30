import { createFileRoute } from "@tanstack/react-router";
import { GATEWAY, gatewayErrorMessage, gatewayHeaders, passStatus } from "@/lib/gateway.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "IA não configurada no servidor." }, { status: 503 });

        try {
          const body = (await request.json()) as { prompt?: string };
          if (!body.prompt?.trim()) return Response.json({ error: "Prompt obrigatório." }, { status: 400 });

          const response = await fetch(`${GATEWAY}/images/generations`, {
            method: "POST",
            headers: gatewayHeaders(apiKey),
            body: JSON.stringify({
              model: "openai/gpt-image-2.5-sunburst",
              prompt: `${body.prompt}. Cinematic dark documentary style, realistic, high detail, dramatic lighting, vertical composition suitable for a 9:16 short video.`,
              size: "1024x1536",
              n: 1,
            }),
          });

          if (!response.ok) {
            console.error("Image generation error:", response.status, await response.text());
            return Response.json({ error: gatewayErrorMessage(response.status, "Não foi possível gerar a imagem.") }, { status: passStatus(response.status) });
          }

          const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
          const item = data.data?.[0];
          const image = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url;
          if (!image) return Response.json({ error: "A IA não retornou a imagem." }, { status: 502 });
          return Response.json({ image });
        } catch (error) {
          console.error("Generate image error:", error);
          return Response.json({ error: "Erro ao gerar imagem." }, { status: 500 });
        }
      },
    },
  },
});
