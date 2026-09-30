import { useState } from "react";

type Result = { titles: string[]; descriptions: string[]; hashtags: string[] };

export function MetadataGenerator({ defaultScript }: { defaultScript: string }) {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    const text = (script || defaultScript).trim();
    if (!text) { setErr("Cole o roteiro do vídeo."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/generate-metadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script: text }) });
      const data = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error || "Erro ao gerar.");
      setResult(data);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro ao gerar."); } finally { setLoading(false); }
  };
  const copy = (t: string) => void navigator.clipboard?.writeText(t);

  return (
    <section className="border-t border-white/10 py-10">
      <h2 className="text-xl font-black tracking-wide">Títulos e descrições com IA</h2>
      <p className="mt-1 text-sm text-white/45">Cole seu roteiro Dark 60s (ou use o roteiro atual) e receba títulos, descrições e hashtags.</p>
      <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder={defaultScript || "Cole aqui o roteiro do seu vídeo..."} rows={6} className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 outline-none focus:border-red-500/50" />
      <button onClick={() => void run()} disabled={loading} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold hover:bg-red-500 disabled:opacity-50">{loading ? "Gerando..." : "Gerar títulos e descrições"}</button>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      {result && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div><h3 className="mb-2 text-xs uppercase tracking-widest text-white/30">Títulos</h3>{result.titles.map((t) => <button key={t} onClick={() => copy(t)} title="Copiar" className="mb-2 block w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left text-sm hover:border-red-500/40">{t}</button>)}</div>
          <div><h3 className="mb-2 text-xs uppercase tracking-widest text-white/30">Descrições</h3>{result.descriptions.map((d) => <button key={d} onClick={() => copy(`${d}\n\n${result.hashtags.join(" ")}`)} title="Copiar" className="mb-2 block w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left text-sm leading-6 text-white/70 hover:border-red-500/40">{d}</button>)}<p className="mt-2 text-xs text-red-300">{result.hashtags.join(" ")}</p></div>
        </div>
      )}
    </section>
  );
}
