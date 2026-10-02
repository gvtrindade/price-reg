"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface DetectedBarcode {
  rawValue?: string;
  format: string;
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function getBarcodeDetector(): BarcodeDetectorConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
}

const ISBN_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const DEFAULT_CAMERA_KEY = "scanner.defaultCameraId";

async function supportedCheck(
  Detector: BarcodeDetectorConstructor,
): Promise<boolean> {
  try {
    const formats = await Detector.getSupportedFormats?.();
    if (formats && !formats.some((f) => ISBN_FORMATS.includes(f))) {
      return false;
    }
  } catch {
    /* proceed optimistically */
  }
  return true;
}

export function BookScanner({
  onDetected,
  onManualFallback,
}: {
  onDetected: (isbn: string) => void;
  onManualFallback: () => void;
}) {
  const t = useTranslations("BookScanner");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "unsupported" | "error"
  >("idle");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(DEFAULT_CAMERA_KEY) || "0"
      : "0",
  );
  const [defaultId, setDefaultId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(DEFAULT_CAMERA_KEY)
      : null,
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let detector: BarcodeDetectorLike | null = null;
    let stopped = false;

    async function start() {
      setStatus("starting");
      const detectorCtor = getBarcodeDetector();
      if (!detectorCtor || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      const Detector: BarcodeDetectorConstructor = detectorCtor;
      if (!(await supportedCheck(Detector))) {
        setStatus("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId },
        });
      } catch {
        setStatus("error");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (d) => d.kind === "videoinput",
        );
        setCameras(videoInputs);
        const activeId = stream
          ?.getVideoTracks()[0]
          ?.getSettings().deviceId;
        if (
          activeId &&
          !videoInputs.some((d) => d.deviceId === deviceId)
        ) {
          setDeviceId(activeId);
        }
      } catch {
        /* camera list unavailable */
      }

      detector = new Detector({ formats: ISBN_FORMATS });
      setStatus("scanning");

      interval = setInterval(async () => {
        const currentVideo = videoRef.current;
        if (!currentVideo || !detector || currentVideo.readyState < 2) return;
        try {
          const codes = await detector.detect(currentVideo);
          const value = codes
            .map((code) => code.rawValue?.replace(/[^0-9]/g, "") ?? "")
            .find((digits) => digits.length >= 8 && digits.length <= 14);
          if (value) {
            navigator.vibrate?.(120);
            onDetected(value);
          }
        } catch {
          /* frame failed, keep scanning */
        }
      }, 350);
    }

    void start();

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [deviceId, onDetected]);

  function saveAsDefault() {
    localStorage.setItem(DEFAULT_CAMERA_KEY, deviceId);
    setDefaultId(deviceId);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className="size-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-white/70"
          aria-hidden
        />
        {status !== "scanning" && status !== "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center text-sm text-white">
            {status === "starting" && <p>{t("starting")}</p>}
            {status === "unsupported" && (
              <>
                <p>{t("unsupported")}</p>
                <Button variant="secondary" size="sm" onClick={onManualFallback}>
                  {t("enterManually")}
                </Button>
              </>
            )}
            {status === "error" && (
              <>
                <p>{t("error")}</p>
                <Button variant="secondary" size="sm" onClick={onManualFallback}>
                  {t("enterManually")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {status !== "unsupported" && (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="camera-select">
            {t("camera")}
          </label>
          <select
            id="camera-select"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="h-8 min-w-0 flex-1 cursor-pointer rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {!cameras.some((c) => c.deviceId === deviceId) && (
              <option value={deviceId}>{t("cameraDefault")}</option>
            )}
            {cameras.map((camera, i) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || t("cameraNumber", { number: i + 1 })}
              </option>
            ))}
          </select>
          {deviceId !== defaultId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saveAsDefault}
            >
              {t("setDefault")}
            </Button>
          )}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
