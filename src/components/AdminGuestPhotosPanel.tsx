import { useCallback, useEffect, useState } from "react";
import { getAdminAuthHeader } from "../lib/adminAuthClient";
import {
  fetchAdminGuestPhotos,
  deleteAdminGuestPhotos,
  type AdminGuestMediaItem,
} from "../lib/galleryMediaApi";

type Album = { id: string; title: string };

export function AdminGuestPhotosPanel({ albums }: { albums: Album[] }) {
  const [selectedAlbum, setSelectedAlbum] = useState<string>("all");
  const [photos, setPhotos] = useState<AdminGuestMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");
    setSelected(new Set());
    setConfirmId(null);
    try {
      const auth = await getAdminAuthHeader();
      if (!auth) { setError("Not authenticated."); return; }
      const items = await fetchAdminGuestPhotos(
        auth,
        selectedAlbum === "all" ? undefined : selectedAlbum
      );
      setPhotos(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load photos.");
    } finally {
      setLoading(false);
    }
  }, [selectedAlbum]);

  useEffect(() => { void loadPhotos(); }, [loadPhotos]);

  const toggleSelect = (id: string) => {
    setConfirmId(null);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setConfirmId(null);
    setSelected(prev =>
      prev.size === photos.length ? new Set() : new Set(photos.map(p => p.id))
    );
  };

  const doDelete = async (ids: string[]) => {
    setDeleting(true);
    setError("");
    setConfirmId(null);
    try {
      const auth = await getAdminAuthHeader();
      if (!auth) { setError("Not authenticated."); return; }
      await deleteAdminGuestPhotos(auth, ids);
      const removed = new Set(ids);
      setPhotos(prev => prev.filter(p => !removed.has(p.id)));
      setSelected(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = () => {
    if (!selected.size) return;
    const n = selected.size;
    if (!confirm(`Delete ${n} photo${n > 1 ? "s" : ""}? This cannot be undone.`)) return;
    void doDelete([...selected]);
  };

  const handleDeleteOne = (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    void doDelete([id]);
  };

  const allSelected = photos.length > 0 && selected.size === photos.length;

  return (
    <div className="adm-stack">
      {/* Album filter tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`adm-btn adm-btn--sm${selectedAlbum === "all" ? "" : " adm-btn--ghost"}`}
          onClick={() => setSelectedAlbum("all")}
        >
          All
        </button>
        {albums.map(a => (
          <button
            key={a.id}
            type="button"
            className={`adm-btn adm-btn--sm${selectedAlbum === a.id ? "" : " adm-btn--ghost"}`}
            onClick={() => setSelectedAlbum(a.id)}
          >
            {a.title}
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {photos.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            {allSelected ? "Deselect all" : "Select all"}
          </label>
          {selected.size > 0 && (
            <button
              type="button"
              className="adm-btn adm-btn--sm adm-btn--danger"
              disabled={deleting}
              onClick={handleDeleteSelected}
            >
              Delete {selected.size} selected
            </button>
          )}
        </div>
      )}

      {/* Status messages */}
      {loading && <p className="adm-hint">Loading photos…</p>}
      {error && (
        <p style={{ color: "var(--adm-danger, #c0392b)", fontSize: "13px", margin: 0 }}>{error}</p>
      )}
      {!loading && !error && photos.length === 0 && (
        <p className="adm-hint">No guest photos uploaded yet.</p>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: "8px",
          }}
        >
          {photos.map(photo => {
            const isSelected = selected.has(photo.id);
            const isArmed = confirmId === photo.id;
            return (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "#1a1a1a",
                  outline: isSelected ? "2px solid #3b82f6" : "none",
                  outlineOffset: "2px",
                  flexShrink: 0,
                }}
              >
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt={photo.original_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#555",
                      fontSize: "10px",
                    }}
                  >
                    No preview
                  </div>
                )}

                {/* Checkbox — top-left */}
                <label
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    cursor: "pointer",
                    background: "rgba(0,0,0,0.55)",
                    borderRadius: "4px",
                    padding: "2px 3px",
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Select"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(photo.id)}
                    style={{ cursor: "pointer", margin: 0 }}
                  />
                </label>

                {/* Delete / confirm button — top-right */}
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteOne(photo.id)}
                  title={isArmed ? "Click again to confirm delete" : "Remove photo"}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: isArmed ? "#c0392b" : "rgba(0,0,0,0.55)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "11px",
                    cursor: deleting ? "not-allowed" : "pointer",
                    lineHeight: 1,
                    fontWeight: isArmed ? 700 : 400,
                    transition: "background 0.15s",
                  }}
                >
                  {isArmed ? "Sure?" : "✕"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
