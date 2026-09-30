import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return Response.json({ error: "OPENAI_API_KEY não configurada." }, { status: 503 });

        try {
          const body = (await request.json()) as { prompt?: string };
          if (!body.prompt?.trim()) return Response.json({ error: "Prompt obrigatório." }, { status: 400 });

          const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-image-2",
              prompt: `${body.prompt}. Cinematic dark documentary style, realistic, high detail, dramatic lighting, vertical composition suitable for a 9:16 short video.`,
              size: "1024x1536",
              quality: "medium",
              output_format: "png",
            }),
          });

          if (!response.ok) {
            console.error("Image generation error:", await response.text());
            return Response.json({ error: "Não foi possível gerar a imagem." }, { status: 502 });
          }

          const data = (await response.json()) as { data?: Array<{ b64_json?: string }> };
          const image = data.data?.[0]?.b64_json;
          if (!image) return Response.json({ error: "A API não retornou a imagem." }, { status: 502 });

          return Response.json({ image: `data:image/png;base64,${image}` });
        } catch (error) {
          console.error("Generate image error:", error);
          return Response.json({ error: "Erro ao gerar imagem." }, { status: 500 });
        }
      },
    },
  },
});
