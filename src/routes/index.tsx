import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
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
  const [imageLoading, setImageLoading] = useState(false);
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceAudio, setVoiceAudio] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);

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

  const generateSceneImage = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;
    setImageLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene.imagePrompt }),
      });
      const data = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.error || "Não foi possível gerar a imagem.");
      setSceneImages((currentImages) => ({ ...currentImages, [index]: data.image! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar imagem.");
    } finally {
      setImageLoading(false);
    }
  };

  const generateAllImages = async () => {
    if (!scenes.length) return;
    setImageLoading(true);
    setError("");
    const results: Record<number, string> = {};
    try {
      for (let index = 0; index < scenes.length; index += 1) {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: scenes[index].imagePrompt }),
        });
        const data = (await response.json()) as { image?: string; error?: string };
        if (!response.ok || !data.image) throw new Error(data.error || `Falha na cena ${index + 1}.`);
        results[index] = data.image;
        setSceneImages({ ...results });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar imagens.");
    } finally {
      setImageLoading(false);
    }
  };

  const generateAiVoice = async () => {
    const data = scenes.length ? scenes : withIcons(fallbackScript(topic));
    const narration = data.map((scene) => scene.narration).join(" ");
    if (!narration.trim()) return;
    setVoiceLoading(true);
    setError("");
    try {
      const voiceMap: Record<string, string> = { "Português (Brasil)": "marin", "Português (Portugal)": "cedar" };
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narration, voice: voiceMap[voice] ?? "marin", speed: Number(speed) }),
      });
      const data = (await response.json()) as { audio?: string; error?: string };
      if (!response.ok || !data.audio) throw new Error(data.error || "Não foi possível gerar a narração IA.");
      setVoiceAudio(data.audio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar narração IA.");
    } finally {
      setVoiceLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!generated || videoLoading) return;
    setVideoLoading(true);
    setVideoProgress(0);
    setError("");

    let canvas: HTMLCanvasElement | null = null;
    let recorder: MediaRecorder | null = null;
    let animationFrame = 0;
    let audioContext: AudioContext | null = null;

    try {
      const data = scenes;
      const width = 720;
      const height = 1280;
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível preparar o vídeo.");

      const imageElements = await Promise.all(
        data.map(async (_, index) => {
          const src = sceneImages[index];
          if (!src) return null;
          const image = new Image();
          image.src = src;
          await new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          });
          return image;
        }),
      );

      const canvasStream = canvas.captureStream(30);
      const tracks = [...canvasStream.getVideoTracks()];
      let audioDestination: MediaStreamAudioDestinationNode | null = null;
      let voiceElement: HTMLAudioElement | null = null;

      if (voiceAudio) {
        audioContext = new AudioContext();
        audioDestination = audioContext.createMediaStreamDestination();
        voiceElement = new Audio(voiceAudio);
        voiceElement.preload = "auto";
        const voiceSource = audioContext.createMediaElementSource(voiceElement);
        const voiceGain = audioContext.createGain();
        voiceGain.gain.value = 0.95;
        voiceSource.connect(voiceGain).connect(audioDestination);
        voiceSource.connect(audioContext.destination);

        const musicGain = audioContext.createGain();
        musicGain.gain.value = 0.045;
        const musicA = audioContext.createOscillator();
        const musicB = audioContext.createOscillator();
        musicA.type = "sine";
        musicB.type = "sine";
        musicA.frequency.value = 110;
        musicB.frequency.value = 164.81;
        musicA.connect(musicGain);
        musicB.connect(musicGain);
        musicGain.connect(audioDestination);
        musicA.start();
        musicB.start();
        setTimeout(() => {
          try { musicA.stop(); musicB.stop(); } catch {}
        }, 60500);
      }

      if (audioDestination) {
        audioDestination.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      }

      const mimeTypes = ["video/mp4;codecs=h264,aac", "video/webm;codecs=vp9,opus", "video/webm"];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("Seu navegador não suporta gravação de vídeo.");

      recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      const startedAt = performance.now();
      const draw = () => {
        const elapsed = (performance.now() - startedAt) / 1000;
        const sceneIndex = Math.min(data.length - 1, Math.floor((elapsed / 60) * data.length));
        const scene = data[sceneIndex];
        const image = imageElements[sceneIndex];

        ctx.fillStyle = "#070708";
        ctx.fillRect(0, 0, width, height);

        if (image && image.naturalWidth) {
          const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
          const iw = image.naturalWidth * scale;
          const ih = image.naturalHeight * scale;
          ctx.drawImage(image, (width - iw) / 2, (height - ih) / 2, iw, ih);
          ctx.fillStyle = "rgba(0,0,0,0.48)";
          ctx.fillRect(0, 0, width, height);
        } else {
          const gradient = ctx.createRadialGradient(width * 0.5, height * 0.35, 20, width * 0.5, height * 0.5, height * 0.7);
          gradient.addColorStop(0, "rgba(150,20,20,0.32)");
          gradient.addColorStop(1, "#050506");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }

        ctx.fillStyle = "#ef4444";
        ctx.font = "700 24px Arial";
        ctx.fillText("DARK60S", 48, 70);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "500 18px Arial";
        ctx.fillText(scene.time, width - 120, 70);

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 48px Arial";
        const words = scene.onScreen.split(" ");
        let line = "";
        let y = height * 0.66;
        for (const word of words) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > width - 96) {
            ctx.fillText(line, 48, y);
            line = word;
            y += 60;
          } else line = test;
        }
        if (line) ctx.fillText(line, 48, y);

        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.font = "400 22px Arial";
        const caption = scene.narration;
        const captionLine = caption.length > 92 ? caption.slice(0, 89) + "..." : caption;
        ctx.fillText(captionLine, 48, height - 100);

        setVideoProgress(Math.min(99, Math.round((elapsed / 60) * 100)));
        if (elapsed < 60) animationFrame = requestAnimationFrame(draw);
      };

      recorder.start(1000);
      draw();

      if (voiceElement && audioContext) {
        await audioContext.resume();
        void voiceElement.play();
      }

      await new Promise((resolve) => setTimeout(resolve, 60500));
      cancelAnimationFrame(animationFrame);
      recorder.stop();
      const rawBlob = await recordingDone;

      let finalBlob = rawBlob;
      let extension = mimeType.includes("mp4") ? "mp4" : "webm";

      if (extension !== "mp4") {
        const ffmpeg = ffmpegRef.current ?? new FFmpeg();
        ffmpegRef.current = ffmpeg;
        if (!ffmpeg.loaded) {
          const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
          await ffmpeg.load({
            coreURL: await toBlobURL(base + "/ffmpeg-core.js", "text/javascript"),
            wasmURL: await toBlobURL(base + "/ffmpeg-core.wasm", "application/wasm"),
          });
        }
        await ffmpeg.writeFile("input.webm", await fetchFile(rawBlob));
        await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "faststart", "output.mp4"]);
        const output = await ffmpeg.readFile("output.mp4");
        finalBlob = new Blob([output], { type: "video/mp4" });
        extension = "mp4";
      }

      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dark60s-video." + extension;
      link.click();
      URL.revokeObjectURL(url);
      setVideoProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o vídeo.");
    } finally {
      cancelAnimationFrame(animationFrame);
      if (audioContext) await audioContext.close().catch(() => undefined);
      setVideoLoading(false);
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
            <div className="flex flex-wrap gap-2"><button onClick={() => void generateVideo()} disabled={videoLoading || !generated} className="flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-black hover:bg-red-600 disabled:opacity-50"><Film size={14} /> {videoLoading ? `Montando ${videoProgress}%` : "🔥 GERAR VÍDEO"}</button><button onClick={() => void generateAiVoice()} disabled={voiceLoading || !generated} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500 disabled:opacity-50"><Mic2 size={14} /> {voiceLoading ? "Gerando voz..." : "Gerar narração IA"}</button><button onClick={generateAllImages} disabled={!generated || imageLoading} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500 disabled:opacity-50"><Image size={14} /> {imageLoading ? "Gerando imagens..." : "Gerar imagens IA"}</button><button onClick={downloadText} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"><FileText size={14} /> Baixar roteiro</button><button onClick={downloadProject} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"><Download size={14} /> Exportar projeto</button></div>
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
            <div className="mt-6 mb-5 overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {sceneImages[activeScene] ? <img src={sceneImages[activeScene]} alt={`Imagem da cena ${activeScene + 1}`} className="aspect-video w-full object-cover" /> : <div className="flex min-h-32 items-center justify-center text-xs text-white/25"><Image size={18} className="mr-2" /> Gere a imagem desta cena</div>}
            </div>
            <button onClick={() => void generateSceneImage(activeScene)} disabled={imageLoading} className="mb-5 flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"><Image size={14} /> {imageLoading ? "Gerando..." : "Gerar imagem desta cena"}</button>
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
            <div className="mt-6 rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-xs leading-5 text-white/45">A voz do navegador continua disponível para teste rápido. A narração IA usa uma voz neural e gera um áudio único para o vídeo de 60 segundos.</div>{voiceAudio && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"><div className="mb-2 text-[10px] uppercase tracking-widest text-white/30">Narração IA</div><audio controls src={voiceAudio} className="w-full" /><a href={voiceAudio} download="dark60s-narracao.mp3" className="mt-2 block text-center text-xs text-red-300 hover:text-red-200">Baixar MP3</a></div>}
            <button onClick={() => { setScenes([]); setSceneImages({}); setVoiceAudio(""); setTitle(""); setHook(""); setActiveScene(0); setGeneratedAt(""); setError(""); stopVoice(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-xs text-white/45 hover:bg-white/5"><RotateCcw size={14} /> Novo projeto</button>
          </aside>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between"><span>DARK60S · Estúdio de vídeos curtos</span><span>{topic ? `Tema: ${topic}` : "Digite um tema para começar"}</span></footer>
      </div>
    </main>
  );
}
