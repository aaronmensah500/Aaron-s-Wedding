import { useCallback, useRef, useState } from "react";
import { readUnlockedAdminPin, useSiteEditorOptional } from "./siteEditor";

const legacyUploadToken = import.meta.env.PUBLIC_ADMIN_UPLOAD_TOKEN?.trim();

export function canAdminUpload(): boolean {
  if (legacyUploadToken) return true;
  return readUnlockedAdminPin() !== null;
}

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/*";

function uploadAuthHeader(): string | null {
  if (legacyUploadToken) return `Bearer ${legacyUploadToken}`;
  const pin = readUnlockedAdminPin();
  if (pin === null) return null;
  return `Bearer ${pin}`;
}

export function useAdminImageUpload(onChange: (url: string) => void) {
  const editor = useSiteEditorOptional();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const canUpload = Boolean(legacyUploadToken) || Boolean(editor?.hasSession);

  const handleFile = useCallback(
    async (file: File) => {
      const authorization = uploadAuthHeader();
      if (!authorization) {
        setErr("Unlock the editor with your PIN to upload photos.");
        return;
      }
      setErr("");
      setBusy(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { Authorization: authorization },
          body,
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
        if (!res.ok) {
          setErr(json?.error?.message ?? `Upload failed (${res.status})`);
          return;
        }
        onChange(json.url ?? "");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setBusy(false);
      }
    },
    [onChange]
  );

  const pickFile = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return {
    inputRef,
    busy,
    err,
    setErr,
    pickFile,
    onInputChange,
    handleFile,
    canUpload,
  };
}
