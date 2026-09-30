import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clapperboard,
  Clock3,
  Download,
  FileText,
  Film,
  Image,
  LoaderCircle,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Volume2,
  WandSparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Scene = {
  time: string;
  title: string;
  narration: string;
  visual: string;
  onScreen: string;
  imagePrompt: string;
  icon: typeof Sparkles;
};

type AiScene = Omit<Scene, "icon">;
type AiScript = { title: string; hook: string; scenes: AiScene[] };

const sceneBlueprint = [
  { time: "00–12s", title: "GANCHO", icon: Sparkles },
  { time: "12–27s", title: "MISTÉRIO", icon: Image },
  { time: "27–45s", title: "REVELAÇÃO", icon: Film },
  { time: "45–60s", title: "CLIFFHANGER", icon: Clock3 },
];

function fallbackScript(topic: string): AiScript {
  const subject = topic.trim() || "um mistério que ninguém consegue explicar";
  return {
    title: subject,
    hook: `E se a história sobre ${subject} não fosse exatamente como contaram?`,
    scenes: [
      { ...sceneBlueprint[0], narration: `Você já ouviu falar de ${subject}? A história parece comum, mas existe um detalhe que quase ninguém conhece.`, visual: `Abertura cinematográfica sobre ${subject}, movimento lento e atmosfera sombria.`, onScreen: subject, imagePrompt: `cinematic dark documentary about ${subject}, dramatic lighting, mysterious atmosphere, vertical 9:16` },
      { ...sceneBlueprint[1], narration: `Por muito tempo, ${subject} ficou cercado de perguntas. Pequenos detalhes começaram a levantar uma dúvida: o que realmente aconteceu?`, visual: "Cortes rápidos de pistas, documentos, sombras e detalhes em close.", onScreen: "O que realmente aconteceu?", imagePrompt: `mysterious clues and documents about ${subject}, dark documentary, red accents, vertical 9:16` },
      { ...sceneBlueprint[2], narration: "Quando juntamos as pistas, uma coisa chama atenção: a explicação mais óbvia não conta toda a história.", visual: "As pistas se conectam na tela enquanto a câmera aproxima do detalhe principal.", onScreen: "A explicação não conta tudo.", imagePrompt: `dramatic revelation about ${subject}, connected clues, cinematic shadows, vertical 9:16` },
      { ...sceneBlueprint[3], narration: "Mas a parte mais estranha vem agora. Uma última pista deixa uma pergunta sem resposta: será que ainda falta descobrir o principal?", visual: "Tela escurece, surge uma última pista e termina em corte seco.", onScreen: "E se ainda faltar descobrir o principal?", imagePrompt: `final unanswered clue about ${subject}, suspenseful dark cinematic frame, red light, vertical 9:16` },
    ],
  };
}

function withIcons(script: AiScript): Scene[] {
  return script.scenes.map((scene, index) => ({
    ...scene,
    icon: sceneBlueprint[index]?.icon ?? Film,
  }));
}

function Index() {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeScene, setActiveScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState("Português (Brasil)");
  const [speed, setSpeed] = useState("1");
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generated = scenes.length > 0;
  const current = scenes[activeScene] ?? withIcons(fallbackScript(topic))[0];
  const status = loading ? "Criando com IA..." : generated ? "Roteiro pronto para edição" : "Pronto para criar";

  const progress = useMemo(
    () => (generated ? Math.round(((activeScene + 1) / scenes.length) * 100) : 0),
    [activeScene, generated, scenes.length],
  );

  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = (await response.json()) as AiScript & { error?: string };

      if (!response.ok) {
        if (response.status === 503) {
          const fallback = fallbackScript(topic);
          setTitle(fallback.title);
          setHook(fallback.hook);
          setScenes(withIcons(fallback));
          setError("IA ainda não configurada. O editor usou o modo local. Configure OPENAI_API_KEY para ativar a geração por IA.");
          return;
        }
        throw new Error(data.error || "Não foi possível gerar o roteiro.");
      }

      setTitle(data.title);
      setHook(data.hook);
      setScenes(withIcons(data));
      setActiveScene(0);
      setGeneratedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      const fallback = fallbackScript(topic);
      setTitle(fallback.title);
      setHook(fallback.hook);
      setScenes(withIcons(fallback));
      setError(err instanceof Error ? `${err.message} Modo local ativado.` : "Modo local ativado.");
    } finally {
      setLoading(false);
    }
  };

  const speakCurrent = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.narration);
    utterance.lang = voice === "Português (Portugal)" ? "pt-PT" : "pt-BR";
    utterance.rate = Number(speed);
    utterance.onend = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  };

  const downloadText = () => {
    const data = scenes.length ? scenes : withIcons(fallbackScript(topic));
    const text = [
      `DARK60S — ${title || topic.trim() || "Novo vídeo"}`,
      `GANCHO: ${hook}`,
      "Formato: vertical 9:16 | Duração: 60 segundos",
      "",
      ...data.map((scene) => [`${scene.time} — ${scene.title}`, `NARRAÇÃO: ${scene.narration}`, `TEXTO: ${scene.onScreen}`, `VISUAL: ${scene.visual}`, `PROMPT: ${scene.imagePrompt}`, ""].join("\n")),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dark60s-roteiro.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadProject = () => {
    const data = scenes.length ? scenes : withIcons(fallbackScript(topic));
    const project = { app: "DARK60S", format: "9:16", durationSeconds: 60, topic: topic.trim() || "Novo vídeo", title, hook, voice, speed: Number(speed), scenes: data, createdAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dark60s-projeto.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#070708] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(185,28,28,0.18),transparent_35%),radial-gradient(circle_at_85%_25%,rgba(120,20,20,0.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-950/40"><Clapperboard size={21} /></div>
            <div><div className="text-lg font-black tracking-tight">DARK<span className="text-red-500">60</span>S</div><div className="text-[10px] uppercase tracking-[0.25em] text-white/40">Short video studio</div></div>
          </div>
          <div className="flex items-center gap-2">
            {generatedAt && <span className="hidden text-xs text-white/30 sm:inline">Gerado às {generatedAt}</span>}
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50">{status}</div>
          </div>
        </header>

        <section className="grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300"><WandSparkles size={14} /> CRIADOR DE VÍDEOS DARK</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Transforme uma ideia em um vídeo de <span className="text-red-500">60 segundos.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg">Agora com geração de roteiro por IA, cenas, prompts visuais, narração, timeline e exportação.</p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input value={topic} onChange={(event) => setTopic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleGenerate(); }} placeholder="Ex.: O mistério do navio desaparecido" className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none placeholder:text-white/25 focus:border-red-500/50" />
                <button disabled={loading} onClick={() => void handleGenerate()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
                  {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />} {loading ? "Gerando..." : "Gerar com IA"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 px-1 text-[11px] text-white/35"><Mic2 size={13} /> Roteiro + cenas + prompts + narração + timeline</div>
              {error && <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-200/70">{error}</div>}
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-3 shadow-2xl shadow-red-950/20">
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0d0f] p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(220,38,38,0.18),transparent_35%)]" />
                <div className="relative flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/45"><span>DARK60S</span><span>9:16</span></div>
                <div className="relative">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-red-500">{title || topic.trim() || "A verdade escondida"}</div>
                  <div className="text-3xl font-black leading-none">{current.onScreen}</div>
                  <div className="mt-4 h-1 w-16 rounded-full bg-red-600" />
                </div>
                <div className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/50">
                  <button onClick={playing ? stopVoice : speakCurrent} className="rounded-full bg-red-600 p-2 text-white hover:bg-red-500" aria-label="Ouvir narração">{playing ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}</button>
                  <span>{current.time} / 01:00</span>
                  <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-red-600" style={{ width: `${generated ? progress : 0}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><div className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">Editor</div><h2 className="mt-2 text-2xl font-bold">{title || "Timeline de 60 segundos"}</h2>{hook && <p className="mt-2 max-w-2xl text-sm text-white/45">{hook}</p>}</div>
            <div className="flex gap-2"><button onClick={downloadText} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"><FileText size={14} /> Baixar roteiro</button><button onClick={downloadProject} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"><Download size={14} /> Exportar projeto</button></div>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${generated ? progress : 0}%` }} /></div>
          <div className="grid gap-3 md:grid-cols-4">
            {(generated ? scenes : withIcons(fallbackScript(topic))).map((scene, index) => {
              const Icon = scene.icon;
              return <button key={scene.time} onClick={() => { setActiveScene(index); setPlaying(false); }} className={`text-left rounded-2xl border p-5 transition ${activeScene === index ? "border-red-500/60 bg-red-500/[0.08]" : "border-white/10 bg-white/[0.035] hover:border-red-500/30"}`}><div className="flex items-center justify-between"><span className="text-xs font-bold text-red-500">{scene.time}</span><Icon size={16} className="text-white/30" /></div><h3 className="mt-5 text-sm font-black tracking-wide">{scene.title}</h3><p className="mt-2 text-sm leading-6 text-white/45">{scene.narration}</p></button>;
            })}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/10 py-10 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">Cena {activeScene + 1}</div><h2 className="mt-2 text-xl font-bold">{current.title} · {current.time}</h2></div><button onClick={playing ? stopVoice : speakCurrent} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500">{playing ? <Pause size={14} /> : <Volume2 size={14} />} {playing ? "Parar" : "Ouvir"}</button></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-widest text-white/30">Narração</div><p className="mt-2 text-sm leading-6 text-white/70">{current.narration}</p></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-widest text-white/30">Texto na tela</div><p className="mt-2 text-sm font-semibold text-white/80">{current.onScreen}</p></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-widest text-white/30">Visual</div><p className="mt-2 text-sm leading-6 text-white/60">{current.visual}</p></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-widest text-white/30">Prompt de imagem</div><p className="mt-2 text-sm leading-6 text-white/50">{current.imagePrompt}</p></div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center gap-2 text-sm font-bold"><Settings2 size={16} /> Configurações</div>
            <label className="mt-6 block text-xs text-white/40">Voz</label>
            <select value={voice} onChange={(event) => setVoice(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none"><option>Português (Brasil)</option><option>Português (Portugal)</option></select>
            <label className="mt-5 block text-xs text-white/40">Velocidade da narração</label>
            <select value={speed} onChange={(event) => setSpeed(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none"><option value="0.85">0,85x</option><option value="1">1,0x</option><option value="1.15">1,15x</option><option value="1.3">1,3x</option></select>
            <div className="mt-6 rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-xs leading-5 text-white/45">A voz atual usa o recurso do navegador. Na próxima etapa vamos conectar TTS profissional e gerar o áudio do projeto.</div>
            <button onClick={() => { setScenes([]); setTitle(""); setHook(""); setActiveScene(0); setGeneratedAt(""); setError(""); stopVoice(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-xs text-white/45 hover:bg-white/5"><RotateCcw size={14} /> Novo projeto</button>
          </aside>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between"><span>DARK60S · Estúdio de vídeos curtos</span><span>{topic ? `Tema: ${topic}` : "Digite um tema para começar"}</span></footer>
      </div>
    </main>
  );
}
