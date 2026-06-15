import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * In-app camera using getUserMedia. Captures a JPEG blob and returns it via onCapture.
 */
export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void | Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotBlob, setSnapshotBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        toast.error("Caméra inaccessible. Autorise l'accès et réessaie.");
        onClose();
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facingMode, onClose]);

  if (!open) return null;

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (b) => {
        if (!b) return;
        setSnapshotBlob(b);
        setSnapshot(URL.createObjectURL(b));
      },
      "image/jpeg",
      0.92,
    );
  };

  const confirm = async () => {
    if (!snapshotBlob) return;
    setLoading(true);
    try {
      await onCapture(snapshotBlob);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
        <div className="text-sm font-mono uppercase tracking-widest">/ caméra</div>
        <button
          onClick={() => {
            setSnapshot(null);
            setSnapshotBlob(null);
            setFacingMode((f) => (f === "environment" ? "user" : "environment"));
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          title="Changer de caméra"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {snapshot ? (
          <img src={snapshot} alt="Capture" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline muted className="max-h-full max-w-full object-contain" />
        )}
      </div>

      <div className="p-6 pb-10 flex items-center justify-center gap-6">
        {snapshot ? (
          <>
            <button
              onClick={() => {
                setSnapshot(null);
                setSnapshotBlob(null);
              }}
              className="px-5 py-3 rounded-full bg-white/10 text-white font-bold flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" /> Reprendre
            </button>
            <button
              onClick={confirm}
              disabled={loading}
              className="px-6 py-3 rounded-full bg-[#ff7a6c] text-white font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Utiliser cette photo
            </button>
          </>
        ) : (
          <button
            onClick={snap}
            aria-label="Capturer"
            className="h-20 w-20 rounded-full bg-white border-4 border-[#ff7a6c] flex items-center justify-center hover:scale-105 transition"
          >
            <Camera className="h-8 w-8 text-[#ff7a6c]" />
          </button>
        )}
      </div>
    </div>
  );
}
