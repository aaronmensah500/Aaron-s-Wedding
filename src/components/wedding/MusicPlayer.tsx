import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { useAdminImageUpload } from "../../lib/useAdminImageUpload";

const AUDIO_UPLOAD_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,audio/*";

type Track = { url?: string; title?: string; artist?: string };

export function MusicPlayer() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing);

  const music = content.music || {};
  const enabled = music.enabled !== false;
  const allTracks: Track[] = Array.isArray(music.tracks) ? music.tracks : [];

  // Only tracks with a real URL are playable for guests.
  const playable = useMemo(() => allTracks.filter(t => (t.url || "").trim()), [allTracks]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const uploadTargetRef = useRef(0);

  const current = playable[Math.min(index, Math.max(0, playable.length - 1))] || null;
  const currentUrl = (current?.url || "").trim();

  const patchTracks = useCallback(
    (next: Track[]) => patchContent({ music: { tracks: next } }),
    [patchContent]
  );

  const { inputRef, busy, err, pickFile, onInputChange, canUpload } = useAdminImageUpload(url => {
    const i = uploadTargetRef.current;
    const next = allTracks.map((t, idx) => (idx === i ? { ...t, url } : t));
    patchTracks(next);
  });

  const pickFor = useCallback(
    (i: number) => {
      uploadTargetRef.current = i;
      pickFile();
    },
    [pickFile]
  );

  // Keep index valid as the playable list changes.
  useEffect(() => {
    if (index > playable.length - 1) setIndex(0);
  }, [playable.length, index]);

  // When the current track URL changes, load it; resume playing if we were playing.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!currentUrl) {
      el.pause();
      setPlaying(false);
      return;
    }
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el || !currentUrl) return;
    void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [currentUrl]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !currentUrl) return;
    if (el.paused) play();
    else {
      el.pause();
      setPlaying(false);
    }
  }, [currentUrl, play]);

  const skip = useCallback(() => {
    if (playable.length < 2) return;
    setPlaying(true); // keep playing through the track change (effect resumes)
    setIndex(i => (i + 1) % playable.length);
  }, [playable.length]);

  const onEnded = useCallback(() => {
    if (playable.length > 1) {
      setPlaying(true);
      setIndex(i => (i + 1) % playable.length);
    } else {
      setPlaying(false);
    }
  }, [playable.length]);

  // Gentle one-time nudge.
  useEffect(() => {
    if (!enabled || playable.length === 0 || isEditing) return;
    const t = setTimeout(() => setShowHint(true), 2500);
    const t2 = setTimeout(() => setShowHint(false), 8000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [enabled, playable.length, isEditing]);

  if (!enabled && !isEditing) return null;
  if (playable.length === 0 && !isEditing) return null;

  const title = (current?.title || "Our Song").trim();
  const artist = (current?.artist || "").trim();
  const multi = playable.length > 1;

  return (
    <div className={`music-player${playing ? " music-player--playing" : ""}`}>
      {currentUrl ? (
        <audio
          ref={audioRef}
          src={currentUrl}
          preload="none"
          onEnded={onEnded}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      ) : null}

      <button
        type="button"
        className="music-player__btn"
        onClick={toggle}
        disabled={!currentUrl}
        aria-pressed={playing}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        title={currentUrl ? (playing ? "Pause" : "Play our song") : "No song set yet"}
      >
        <span className="music-player__icon" aria-hidden>
          {playing ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
      </button>

      <div className="music-player__meta">
        <span className="music-player__title">{title}</span>
        {artist ? <span className="music-player__artist">{artist}</span> : null}
      </div>

      {multi && !isEditing ? (
        <button
          type="button"
          className="music-player__skip"
          onClick={skip}
          aria-label="Next song"
          title="Next song"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 5v14l9-7zM16 5h2.5v14H16z" />
          </svg>
        </button>
      ) : null}

      {showHint && !isEditing ? (
        <span className="music-player__hint" role="status">
          {(music.autoplayHint || "Tap to play our songs").trim()}
        </span>
      ) : null}

      {isEditing ? (
        <div className="music-player__editor">
          <input
            ref={inputRef}
            type="file"
            accept={AUDIO_UPLOAD_ACCEPT}
            style={{ display: "none" }}
            aria-hidden
            onChange={onInputChange}
          />
          {allTracks.map((t, i) => (
            <div key={i} className="music-player__slot">
              <input
                className="music-player__slot-input"
                value={t.title || ""}
                placeholder={`Song ${i + 1} title`}
                onChange={e => patchTracks(allTracks.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
              />
              <button
                type="button"
                className="music-player__edit-btn"
                onClick={() => pickFor(i)}
                disabled={busy || !canUpload}
                title={canUpload ? "Upload an MP3" : "Unlock the editor with your PIN first"}
              >
                {busy && uploadTargetRef.current === i ? "Uploading…" : (t.url ? "Replace" : "Upload MP3")}
              </button>
              {allTracks.length > 1 ? (
                <button
                  type="button"
                  className="music-player__edit-btn music-player__edit-btn--ghost"
                  onClick={() => patchTracks(allTracks.filter((_, idx) => idx !== i))}
                  aria-label={`Remove song ${i + 1}`}
                >
                  ✕
                </button>
              ) : null}
              {t.url ? <span className="music-player__slot-ok" title="Song uploaded" aria-hidden>●</span> : null}
            </div>
          ))}
          <button
            type="button"
            className="music-player__edit-btn music-player__edit-btn--add"
            onClick={() => patchTracks([...allTracks, { url: "", title: "", artist: "" }])}
          >
            + Add song
          </button>
          {err ? <span className="music-player__err" role="alert">{err}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
