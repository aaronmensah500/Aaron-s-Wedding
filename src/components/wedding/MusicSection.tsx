import { useCallback, useEffect, useRef, useState } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { announceMusicPlay, onOtherMusicPlay } from "../../lib/musicBus";
import { SectionHead } from "../editable/SectionTitle";
import { Monogram } from "./Monogram";
import { IMAGE_UPLOAD_ACCEPT, useAdminImageUpload } from "../../lib/useAdminImageUpload";

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

  const bgUpload = useAdminImageUpload(url => patchContent({ music: { bgImageUrl: url } }));

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const safeIndex = Math.min(index, Math.max(0, playable.length - 1));
  const track = playable[safeIndex] || null;
  const url = (track?.url || "").trim();

  const patchTracks = useCallback(
    (next: Track[]) => patchContent({ music: { tracks: next } }),
    [patchContent]
  );

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    announceMusicPlay(SECTION_ID);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [url]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (audio.paused) play();
    else pause();
  }, [url, play, pause]);

  const select = useCallback((i: number) => {
    setIndex(i);
    setPlaying(true);
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
      void audio.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);


  if (playable.length === 0 && !isEditing) return null;

  const title = (track?.title || "Our Song").trim();
  const artist = (track?.artist || "").trim();
  const pct = dur > 0 ? (cur / dur) * 100 : 0;
  const multi = playable.length > 1;

  const bgUrl = (music.bgImageUrl || "").trim();
  const bgStyle = bgUrl
    ? {
        // Scrim keeps the ivory type and the vinyl legible over the photograph.
        backgroundImage: `linear-gradient(180deg, rgba(42,10,14,0.84) 0%, rgba(42,10,14,0.72) 45%, rgba(42,10,14,0.9) 100%), url(${bgUrl})`,
      }
    : undefined;

  return (
    <section
      id="music"
      className={`section section--dark music-section${bgUrl ? " music-section--photo" : ""}`}
    >
      {bgUrl ? <div className="music-section__bg" style={bgStyle} aria-hidden /> : null}

      {isEditing ? (
        <div className="music-section__bg-actions" role="toolbar" aria-label="Music background">
          <span className="music-section__bg-label">Section background</span>
          <input
            ref={bgUpload.inputRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            style={{ display: "none" }}
            aria-hidden
            onChange={bgUpload.onInputChange}
          />
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            disabled={bgUpload.busy || !bgUpload.canUpload}
            onClick={() => bgUpload.pickFile()}
            title={bgUpload.canUpload ? "Upload a photo" : "Unlock the editor with your PIN first"}
          >
            {bgUpload.busy ? "Uploading…" : bgUrl ? "Replace photo" : "Upload photo"}
          </button>
          {bgUrl ? (
            <button
              type="button"
              className="adm-btn adm-btn--sm adm-btn--ghost"
              onClick={() => patchContent({ music: { bgImageUrl: "" } })}
            >
              Remove
            </button>
          ) : null}
          {bgUpload.err ? <span className="music-section__bg-err">{bgUpload.err}</span> : null}
        </div>
      ) : null}

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
        preload="metadata"
        onTimeUpdate={e => setCur((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={e => setDur((e.target as HTMLAudioElement).duration)}
        onEnded={() => (multi ? next() : setPlaying(false))}
        onPause={() => setPlaying(false)}
      />

      {playable.length === 0 && isEditing ? (
        <p className="music-section__empty">
          No songs uploaded yet — use the floating player (bottom-right) to upload your MP3s.
        </p>
      ) : (
        // `reveal` stays on a stable className so the IntersectionObserver's
        // `.in` class is never stripped by a React re-render (e.g. on play).
        <div className="music-stage reveal">
          <div className={`music-stage__body${playing ? " music-stage--playing" : ""}`}>
            {/* Spinning vinyl record — turns while a song plays */}
            <div className="music-stage__disc" aria-hidden>
              <div className="music-stage__disc-label">
                <Monogram variant="mark" className="music-stage__disc-monogram" />
              </div>
              <span className="music-stage__disc-hole" />
            </div>

            <div className="music-stage__eyebrow">{playing ? "Now playing" : "Press play"}</div>
            <h3 className="music-stage__title">{title}</h3>
            {artist ? <p className="music-stage__artist">{artist}</p> : null}

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
