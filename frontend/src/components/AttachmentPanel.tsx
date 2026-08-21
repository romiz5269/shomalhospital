"use client";

import { useEffect, useRef, useState } from "react";
import { api, AttachmentMeta } from "@/lib/api";
import { Btn } from "@/components/ui";
import { Paperclip } from "lucide-react";
import { isAdmin } from "@/lib/roles";

export function AttachmentPanel({ entityType, entityId }: { entityType: "asset" | "pm_visit"; entityId: number | null }) {
  const [files, setFiles] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [admin, setAdmin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.me().then((u) => setAdmin(isAdmin(u.role))).catch(() => setAdmin(false));
  }, []);

  const load = () => {
    if (!admin || !entityId) {
      setFiles([]);
      return;
    }
    api.attachments.list(entityType, entityId).then(setFiles).catch(() => setFiles([]));
  };

  useEffect(() => {
    load();
  }, [entityType, entityId, admin]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entityId) return;
    setUploading(true);
    setError("");
    try {
      await api.attachments.upload(entityType, entityId, file);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در آپلود");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!admin) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-[#0a1628]">پیوست‌ها</p>
      {!entityId ? (
        <p className="text-xs text-[#6b8299] font-bold">
          بعد از «ذخیره» می‌توانید فایل (عکس، PDF، …) پیوست کنید.
        </p>
      ) : (
        <>
          <input ref={inputRef} type="file" className="hidden" onChange={onUpload} disabled={uploading} />
          <Btn
            type="button"
            variant="ghost"
            className="text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip size={14} className="ml-1" />
            {uploading ? "در حال آپلود..." : "+ افزودن فایل"}
          </Btn>
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          {files.length === 0 ? (
            <p className="text-xs text-[#6b8299]">پیوستی نیست</p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-xs bg-[#f8fafc] p-2 rounded-xl border border-[#c8d9ee]">
                  <button
                    type="button"
                    className="text-[#003b8e] font-bold truncate text-right"
                    onClick={() => api.attachments.download(f.id, f.original_name).catch((e) => setError(e.message))}
                  >
                    {f.original_name}
                  </button>
                  <button
                    type="button"
                    className="text-red-600 font-bold shrink-0"
                    onClick={() => api.attachments.delete(f.id).then(load).catch((e) => setError(e.message))}
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
