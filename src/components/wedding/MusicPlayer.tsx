import { useCallback, useEffect, useRef, useState } from "react";
import { useWeddingContent } from "../../lib/weddingContent";
import { useSiteEditorOptional } from "../../lib/siteEditor";
import { useAdminImageUpload } from "../../lib/useAdminImageUpload";

const AUDIO_UPLOAD_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,audio/*";

export function MusicPlayer() {
  const { content, patchContent } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const isEditing = Boolean(editor?.isEditing);

  const music = content.music || {};
  const songUrl = (music.songUrl || "").trim();
  const enabled = music.enabled !== false;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const { inputRef, busy, err, pickFile, onInputChange, canUpload } = useAdminImageUpload(url =>
    patchContent({ music: { songUrl: url } })
  );

  // Pause + reset playing state if the song URL changes or is removed.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
  }, [songUrl]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !songUrl) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [songUrl]);

  // Gentle one-time nudge so guests notice the button.
  useEffect(() => {
    if (!enabled || !songUrl || isEditing) return;
    const t = setTimeout(() => setShowHint(true), 2500);
    const t2 = setTimeout(() => setShowHint(false), 8000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [enabled, songUrl, isEditing]);

  if (!enabled && !isEditing) return null;
  if (!songUrl && !isEditing) return null;

  const label = (music.title || "Our Song").trim();
  const artist = (music.artist || "").trim();

  return (
    <div className={`music-player${playing ? " music-player--playing" : ""}`}>
      {songUrl ? (
        <audio
          ref={audioRef}
          src={songUrl}
          loop
          preload="none"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      ) : null}

      <button
        type="button"
        className="music-player__btn"
        onClick={toggle}
        disabled={!songUrl}
        aria-pressed={playing}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        title={songUrl ? (playing ? "Pause" : "Play our song") : "No song set yet"}
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
        <span className="music-player__eq" aria-hidden>
          <i /><i /><i />
        </span>
      </button>

      <div className="music-player__meta">
        <span className="music-player__title">{label}</span>
        {artist ? <span className="music-player__artist">{artist}</span> : null}
      </div>

      {showHint && !isEditing ? (
        <span className="music-player__hint" role="status">
          {(music.autoplayHint || "Tap to play our song").trim()}
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
          <button
            type="button"
            className="music-player__edit-btn"
            onClick={() => pickFile()}
            disabled={busy || !canUpload}
            title={canUpload ? "Upload an MP3" : "Unlock the editor with your PIN first"}
          >
            {busy ? "Uploading…" : songUrl ? "Replace MP3" : "Upload MP3"}
          </button>
          {songUrl ? (
            <button
              type="button"
              className="music-player__edit-btn music-player__edit-btn--ghost"
              onClick={() => patchContent({ music: { songUrl: "" } })}
            >
              Remove
            </button>
          ) : null}
          {err ? <span className="music-player__err" role="alert">{err}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
