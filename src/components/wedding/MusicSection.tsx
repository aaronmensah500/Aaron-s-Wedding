import { useCallback, useEffect, useRef, useState } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { announceMusicPlay, onOtherMusicPlay } from "../../lib/musicBus";
import { SectionHead } from "../editable/SectionTitle";

const SECTION_ID = "music-section";

type Track = { url?: string; title?: string; artist?: string };

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MusicSection() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing);

  const music = content.music || {};
  const allTracks: Track[] = Array.isArray(music.tracks) ? music.tracks : [];
  const playable = allTracks.filter(t => (t.url || "").trim());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [reactive, setReactive] = useState(true); // false → CSS fallback bars

  const safeIndex = Math.min(index, Math.max(0, playable.length - 1));
  const track = playable[safeIndex] || null;
  const url = (track?.url || "").trim();

  const patchTracks = useCallback(
    (next: Track[]) => patchContent({ music: { tracks: next } }),
    [patchContent]
  );

  const stopDraw = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);

    const render = () => {
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const bars = 48;
      const step = Math.floor(bins / bars);
      const gap = 2;
      const barW = (w - gap * (bars - 1)) / bars;
      let sum = 0;

      for (let i = 0; i < bars; i++) {
        let v = 0;
        for (let j = 0; j < step; j++) v += data[i * step + j] || 0;
        v = v / step / 255; // 0..1
        sum += v;
        const barH = Math.max(2, v * h);
        const x = i * (barW + gap);
        const y = (h - barH) / 2;
        const grad = ctx2d.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, "#D9B26B");
        grad.addColorStop(1, "#6B0F18");
        ctx2d.fillStyle = grad;
        const r = Math.min(barW / 2, 3);
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barW, barH, r);
        ctx2d.fill();
      }

      // If the stream is cross-origin & tainted, data stays all-zero — fall back to CSS bars.
      if (sum === 0) {
        setReactive(false);
        stopDraw();
        return;
      }
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  }, [stopDraw]);

  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (ctxRef.current) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
    } catch {
      setReactive(false); // Web Audio unavailable → CSS fallback
    }
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    announceMusicPlay(SECTION_ID);
    ensureGraph();
    void ctxRef.current?.resume();
    void audio.play().then(() => {
      setPlaying(true);
      if (reactive && analyserRef.current) {
        stopDraw();
        draw();
      }
    }).catch(() => setPlaying(false));
  }, [url, ensureGraph, reactive, draw, stopDraw]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    stopDraw();
  }, [stopDraw]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (audio.paused) play();
    else pause();
  }, [url, play, pause]);

  const select = useCallback((i: number) => {
    setIndex(i);
    setPlaying(true); // effect below resumes on src change
  }, []);

  const next = useCallback(() => {
    if (playable.length < 2) return;
    setIndex(i => (i + 1) % playable.length);
    setPlaying(true);
  }, [playable.length]);

  const prev = useCallback(() => {
    if (playable.length < 2) return;
    setIndex(i => (i - 1 + playable.length) % playable.length);
    setPlaying(true);
  }, [playable.length]);

  // Pause when the floating player starts.
  useEffect(() => onOtherMusicPlay(SECTION_ID, pause), [pause]);

  // When src changes, load and (if we were playing) resume.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCur(0);
    setDur(0);
    if (!url) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (playing) {
      void audio.play().then(() => {
        if (reactive && analyserRef.current) { stopDraw(); draw(); }
      }).catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => () => stopDraw(), [stopDraw]);

  if (playable.length === 0 && !isEditing) return null;

  const title = (track?.title || "Our Song").trim();
  const artist = (track?.artist || "").trim();
  const pct = dur > 0 ? (cur / dur) * 100 : 0;
  const multi = playable.length > 1;

  return (
    <section id="music" className="section section--dark music-section">
      <SectionHead
        eyebrow={music.eyebrowLabel}
        eyebrowLabel={music.eyebrowLabel}
        titleLine1={music.titleLine1}
        titleEm={music.titleEm}
        titleLine2={music.titleLine2}
        lede={music.lede}
        onPatch={p => patchContent({ music: p })}
      />

      <audio
        ref={audioRef}
        src={url || undefined}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={e => setCur((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={e => setDur((e.target as HTMLAudioElement).duration)}
        onEnded={() => (multi ? next() : (setPlaying(false), stopDraw()))}
        onPause={() => setPlaying(false)}
      />

      {playable.length === 0 && isEditing ? (
        <p className="music-section__empty">
          No songs uploaded yet — use the floating player (bottom-right) to upload your MP3s.
        </p>
      ) : (
        <div className={`music-stage reveal${playing ? " music-stage--playing" : ""}`}>
          <div className="music-stage__disc" aria-hidden>
            <div className="music-stage__disc-label">
              <span>A</span>
              <i>&amp;</i>
              <span>P</span>
            </div>
          </div>

          <div className="music-stage__body">
            <div className="music-stage__eyebrow">{playing ? "Now playing" : "Press play"}</div>
            <h3 className="music-stage__title">{title}</h3>
            {artist ? <p className="music-stage__artist">{artist}</p> : null}

            <div className="music-viz" aria-hidden>
              <canvas ref={canvasRef} width={480} height={64} className="music-viz__canvas" style={{ display: reactive ? "block" : "none" }} />
              {!reactive ? (
                <div className={`music-viz__bars${playing ? " is-playing" : ""}`}>
                  {Array.from({ length: 40 }).map((_, i) => (
                    <i key={i} style={{ animationDelay: `${(i % 10) * -0.13}s` }} />
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className="music-progress"
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(dur)}
              aria-valuenow={Math.round(cur)}
              tabIndex={0}
              onClick={e => {
                const audio = audioRef.current;
                if (!audio || !dur) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                audio.currentTime = ratio * dur;
                setCur(audio.currentTime);
              }}
            >
              <div className="music-progress__fill" style={{ width: `${pct}%` }} />
              <div className="music-progress__knob" style={{ left: `${pct}%` }} />
            </div>
            <div className="music-stage__times">
              <span>{fmt(cur)}</span>
              <span>{fmt(dur)}</span>
            </div>

            <div className="music-stage__controls">
              {multi ? (
                <button type="button" className="music-ctrl" onClick={prev} aria-label="Previous song">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5h2.5v14H8zM18 5v14l-9-7z" /></svg>
                </button>
              ) : null}
              <button type="button" className="music-ctrl music-ctrl--play" onClick={toggle} disabled={!url} aria-label={playing ? "Pause" : "Play"}>
                {playing ? (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              {multi ? (
                <button type="button" className="music-ctrl" onClick={next} aria-label="Next song">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 5v14l9-7zM16 5h2.5v14H16z" /></svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {playable.length > 0 ? (
        <div className="music-section__list reveal-stagger">
          {playable.map((t, i) => {
            const active = i === safeIndex;
            return (
              <button
                key={i}
                type="button"
                className={`music-chip${active ? " music-chip--active" : ""}`}
                onClick={() => select(i)}
                aria-pressed={active}
              >
                <span className="music-chip__idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="music-chip__title">{(t.title || "Untitled").trim()}</span>
                {active && playing ? (
                  <span className="music-chip__eq" aria-hidden><i /><i /><i /></span>
                ) : (
                  <span className="music-chip__play" aria-hidden>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
