export const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export function gatewayHeaders(apiKey: string) {
  return { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" };
}

export function gatewayErrorMessage(status: number, fallback: string) {
  if (status === 429) return "Muitas solicitações. Tente novamente em instantes.";
  if (status === 402) return "Créditos de IA esgotados. Adicione créditos no workspace.";
  return fallback;
}

export function passStatus(status: number) {
  return status === 429 || status === 402 || status === 403 ? status : 502;
}

/** Streams a Responses call and returns the full text. */
export async function streamResponseText(apiKey: string, instructions: string, input: string) {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: gatewayHeaders(apiKey),
    body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" }, instructions, input }),
  });
  if (!res.ok || !res.body) {
    console.error("Gateway error:", res.status, await res.text().catch(() => ""));
    return { ok: false as const, status: res.status };
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
  if (failed) return { ok: false as const, status: 502 };
  return { ok: true as const, text: text.replace(/^\s*```json\s*/i, "").replace(/\s*```\s*$/i, "").trim() };
}
