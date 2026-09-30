import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clapperboard,
  Clock3,
  Film,
  Image,
  Mic2,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Scene = {
  time: string;
  title: string;
  text: string;
  icon: typeof Sparkles;
};

const defaultScenes: Scene[] = [
  { time: "00–12s", title: "GANCHO", text: "Você sabia que existe uma história que quase ninguém conhece?", icon: Sparkles },
  { time: "12–27s", title: "MISTÉRIO", text: "Uma pista esquecida muda completamente o que parecia ser verdade.", icon: Image },
  { time: "27–45s", title: "REVELAÇÃO", text: "Agora, cada detalhe começa a fazer sentido — e o final se aproxima.", icon: Film },
  { time: "45–60s", title: "CLIFFHANGER", text: "Mas existe um último detalhe. E ele pode mudar tudo.", icon: Clock3 },
];

function generateScenes(topic: string): Scene[] {
  const subject = topic.trim() || "um mistério que ninguém consegue explicar";

  return [
    {
      time: "00–12s",
      title: "GANCHO",
      text: `Você já ouviu falar de ${subject}? A história parece comum, mas existe um detalhe que quase ninguém conhece.`,
      icon: Sparkles,
    },
    {
      time: "12–27s",
      title: "MISTÉRIO",
      text: `Por muito tempo, ${subject} ficou cercado de perguntas. Pequenos detalhes começaram a levantar uma dúvida: o que realmente aconteceu?`,
      icon: Image,
    },
    {
      time: "27–45s",
      title: "REVELAÇÃO",
      text: "Quando juntamos as pistas, uma coisa chama atenção: a explicação mais óbvia não conta toda a história.",
      icon: Film,
    },
    {
      time: "45–60s",
      title: "CLIFFHANGER",
      text: "Mas a parte mais estranha vem agora. Uma última pista deixa uma pergunta sem resposta: será que ainda falta descobrir o principal?",
      icon: Clock3,
    },
  ];
}

function Index() {
  const [topic, setTopic] = useState("");
  const [scriptScenes, setScriptScenes] = useState<Scene[]>(defaultScenes);

  const generated = scriptScenes !== defaultScenes;

  const status = useMemo(
    () => (generated ? "Roteiro pronto para edição" : "Pronto para criar"),
    [generated],
  );

  const handleGenerate = () => {
    setScriptScenes(generateScenes(topic));
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#070708] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(185,28,28,0.18),transparent_35%),radial-gradient(circle_at_85%_25%,rgba(120,20,20,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-950/40">
              <Clapperboard size={21} />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight">DARK<span className="text-red-500">60</span>S</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">Short video studio</div>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50">
            {status}
          </div>
        </header>

        <section className="grid gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">
              <WandSparkles size={14} />
              CRIADOR DE VÍDEOS DARK
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Transforme uma ideia em um vídeo de{" "}
              <span className="text-red-500">60 segundos.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Gere um roteiro curto, organize cenas, narração e ritmo para conteúdo vertical 9:16.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleGenerate();
                  }}
                  placeholder="Ex.: O mistério do navio desaparecido"
                  className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none placeholder:text-white/25 focus:border-red-500/50"
                />
                <button
                  onClick={handleGenerate}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold transition hover:bg-red-500"
                >
                  <Sparkles size={17} />
                  Gerar roteiro
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 px-1 text-[11px] text-white/35">
                <Mic2 size={13} />
                Narração + cenas + estrutura de 60s
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-3 shadow-2xl shadow-red-950/20">
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0d0f] p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(220,38,38,0.18),transparent_35%)]" />
                <div className="relative flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                  <span>DARK60S</span>
                  <span>9:16</span>
                </div>
                <div className="relative">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-red-500">
                    {topic.trim() || "A verdade escondida"}
                  </div>
                  <div className="text-3xl font-black leading-none">
                    {generated ? "E se tudo que você sabe estiver errado?" : "E se tudo que você sabe estiver errado?"}
                  </div>
                  <div className="mt-4 h-1 w-16 rounded-full bg-red-600" />
                </div>
                <div className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/50">
                  <Play size={14} fill="currentColor" />
                  <span>00:37 / 01:00</span>
                  <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full w-3/5 bg-red-600" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">Editor</div>
              <h2 className="mt-2 text-2xl font-bold">Estrutura do vídeo</h2>
            </div>
            <div className="hidden text-xs text-white/30 sm:block">60 segundos · 4 cenas</div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {scriptScenes.map((scene) => {
              const Icon = scene.icon;
              return (
                <article key={scene.time} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-red-500/30 hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-500">{scene.time}</span>
                    <Icon size={16} className="text-white/30" />
                  </div>
                  <h3 className="mt-5 text-sm font-black tracking-wide">{scene.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">{scene.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <span>DARK60S · Estúdio de vídeos curtos</span>
          <span>{topic ? `Tema: ${topic}` : "Digite um tema para começar"}</span>
        </footer>
      </div>
    </main>
  );
}
