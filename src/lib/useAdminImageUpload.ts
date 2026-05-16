import { useCallback, useRef, useState } from "react";
import { getAdminAuthHeader } from "./adminAuthClient";
import { useSiteEditorOptional } from "./siteEditor";

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/*";

export function canAdminUpload(): boolean {
  return true;
}

export function useAdminImageUpload(onChange: (url: string) => void) {
  const editor = useSiteEditorOptional();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const canUpload = Boolean(editor?.hasSession);

  const handleFile = useCallback(
    async (file: File) => {
      const authorization = await getAdminAuthHeader();
      if (!authorization) {
        setErr(
          editor?.emailAuthEnabled
            ? "Sign in with your editor email to upload photos."
            : "Unlock the editor to upload photos."
        );
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
    [onChange, editor?.emailAuthEnabled]
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
