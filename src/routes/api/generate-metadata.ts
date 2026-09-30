import { createFileRoute } from "@tanstack/react-router";

type Metadata = { titles: string[]; descriptions: string[]; hashtags: string[] };

export const Route = createFileRoute("/api/generate-metadata")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "IA não configurada no servidor." }, { status: 503 });

        const body = (await request.json().catch(() => ({}))) as { script?: string };
        const script = body.script?.trim().slice(0, 12000);
        if (!script) return Response.json({ error: "Cole o roteiro do vídeo." }, { status: 400 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            stream: true,
            store: false,
            reasoning: { effort: "low" },
            instructions:
              "Você é especialista em YouTube Shorts, TikTok e Reels de canais dark em português do Brasil. Crie títulos e descrições atraentes, com curiosidade e suspense, sem clickbait enganoso e sem inventar fatos. Responda somente JSON válido, sem markdown.",
            input: `Com base neste roteiro de vídeo Dark 60s, gere exatamente este JSON:
{"titles":["5 títulos com até 70 caracteres"],"descriptions":["3 descrições de 2 a 4 frases, com chamada para ação"],"hashtags":["8 hashtags com #"]}

ROTEIRO:
${script}`,
          }),
        });

        if (!res.ok || !res.body) {
          const status = res.status;
          console.error("Gateway error:", status, await res.text().catch(() => ""));
          const msg =
            status === 429 ? "Muitas solicitações. Tente novamente em instantes."
            : status === 402 ? "Créditos de IA esgotados. Adicione créditos no workspace."
            : "A IA não conseguiu gerar agora.";
          return Response.json({ error: msg }, { status: status === 429 || status === 402 || status === 403 ? status : 502 });
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let failed = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data) as { type?: string; delta?: string };
              if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
              if (evt.type === "response.failed" || evt.type === "error") failed = true;
            } catch { /* ignore */ }
          }
        }

        try {
          if (failed) throw new Error("failed");
          const cleaned = text.replace(/^\s*```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
          const parsed = JSON.parse(cleaned) as Partial<Metadata>;
          const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
          const out: Metadata = { titles: arr(parsed.titles), descriptions: arr(parsed.descriptions), hashtags: arr(parsed.hashtags) };
          if (!out.titles.length) throw new Error("empty");
          return Response.json(out);
        } catch {
          return Response.json({ error: "Não foi possível interpretar a resposta da IA." }, { status: 502 });
        }
      },
    },
  },
});
