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

const CODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const DEFAULT_CAMERA_KEY = "scanner.defaultCameraId";
const CAMERA_START_TIMEOUT = 10_000;
const MAX_DECODE_WIDTH = 960;

async function supportedCheck(
  Detector: BarcodeDetectorConstructor,
): Promise<boolean> {
  try {
    const formats = await Detector.getSupportedFormats?.();
    if (formats && !formats.some((f) => CODE_FORMATS.includes(f))) {
      return false;
    }
  } catch {
    /* proceed optimistically */
  }
  return true;
}

/**
 * BarcodeDetector is not available in every browser (e.g. Safari on iOS).
 * Fall back to ZXing decoding video frames drawn onto a canvas.
 */
async function createZXingDetector(): Promise<BarcodeDetectorLike> {
  const {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    HTMLCanvasElementLuminanceSource,
    HybridBinarizer,
    MultiFormatReader,
  } = await import("@zxing/library");

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new MultiFormatReader();
  reader.setHints(hints);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return {
    detect: async (source) => {
      const video = source as HTMLVideoElement;
      const { videoWidth, videoHeight } = video;
      if (!context || !videoWidth || !videoHeight) return [];

      // Decoding a full-resolution iPhone camera frame can block Safari's main
      // thread. A smaller frame is sufficient for EAN/UPC barcodes.
      const scale = Math.min(1, MAX_DECODE_WIDTH / videoWidth);
      canvas.width = Math.round(videoWidth * scale);
      canvas.height = Math.round(videoHeight * scale);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const luminance = new HTMLCanvasElementLuminanceSource(canvas);
      const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
      try {
        const result = reader.decodeWithState(bitmap);
        return [
          {
            rawValue: result.getText(),
            format: BarcodeFormat[result.getBarcodeFormat()].toLowerCase(),
          },
        ];
      } catch {
        return [];
      } finally {
        reader.reset();
      }
    },
  };
}

async function createDetector(): Promise<BarcodeDetectorLike> {
  const Detector = getBarcodeDetector();
  if (Detector && (await supportedCheck(Detector))) {
    return new Detector({ formats: CODE_FORMATS });
  }
  try {
    return await createZXingDetector();
  } catch (error) {
    throw new Error(
      `zxing-load-failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getCameraStream(deviceId: string): Promise<MediaStream> {
  const resolution = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
  const candidates: MediaTrackConstraints[] = [
    ...(deviceId && deviceId !== "0"
      ? [{ deviceId: { exact: deviceId }, ...resolution }]
      : []),
    { facingMode: { ideal: "environment" }, ...resolution },
    {},
  ];
  let lastError: unknown;
  for (const video of candidates) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video });
      // This hint improves autofocus where supported, but Safari can leave the
      // promise pending. Camera startup must never depend on it.
      void stream
        .getVideoTracks()[0]
        ?.applyConstraints({
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        })
        .catch(() => undefined);
      return stream;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function playVideo(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onVideoError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error("video-playback-failed"));
    };
    const onVideoError = () => onError(new Error("video-playback-failed"));

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onVideoError);
    const timeout = setTimeout(
      () => onError(new Error("camera-start-timeout")),
      CAMERA_START_TIMEOUT,
    );

    video.srcObject = stream;
    video.muted = true;
    if (video.readyState >= 2) {
      onReady();
      return;
    }
    video.play().then(onReady).catch(onError);
  });
}

export function ProductScanner({
  onDetected,
  onManualFallback,
}: {
  onDetected: (code: string) => void;
  onManualFallback: () => void;
}) {
  const t = useTranslations("ProductScanner");
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "unsupported" | "error"
  >("idle");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
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
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const videoElement = videoRef.current;
    let stream: MediaStream | null = null;
    let scanTimeout: ReturnType<typeof setTimeout> | null = null;
    let detector: BarcodeDetectorLike | null = null;
    let detecting = false;
    let stopped = false;

    async function updateCameraList() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (stopped) return;
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoInputs);
        const activeId = stream?.getVideoTracks()[0]?.getSettings().deviceId;
        if (
          activeId &&
          activeId !== deviceId &&
          (deviceId === "0" ||
            !videoInputs.some((device) => device.deviceId === deviceId))
        ) {
          setDeviceId(activeId);
        }
      } catch {
        /* camera list unavailable */
      }
    }

    async function scan() {
      if (stopped) return;
      const currentVideo = videoRef.current;
      if (
        currentVideo &&
        detector &&
        !detecting &&
        currentVideo.readyState >= 2
      ) {
        detecting = true;
        try {
          const codes = await detector.detect(currentVideo);
          const value = codes
            .map((code) => code.rawValue?.replace(/[^0-9]/g, "") ?? "")
            .find((digits) => digits.length >= 8 && digits.length <= 14);
          if (value && !stopped) {
            stopped = true;
            navigator.vibrate?.(120);
            onDetectedRef.current(value);
            return;
          }
        } catch {
          /* frame failed, keep scanning */
        } finally {
          detecting = false;
        }
      }
      scanTimeout = setTimeout(scan, 250);
    }

    async function start() {
      setStatus("starting");
      setDebugInfo(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setDebugInfo(
          `no-camera-api (secure=${String(window.isSecureContext)})`,
        );
        setStatus("unsupported");
        return;
      }
      try {
        detector = await createDetector();
      } catch (error) {
        if (stopped) return;
        setDebugInfo(error instanceof Error ? error.message : String(error));
        setStatus("unsupported");
        return;
      }
      if (stopped) return;
      try {
        stream = await getCameraStream(deviceId);
      } catch (error) {
        if (stopped) return;
        setDebugInfo(
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
        );
        setStatus("error");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!videoElement) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      try {
        await playVideo(videoElement, stream);
      } catch (error) {
        if (stopped) return;
        stream.getTracks().forEach((track) => track.stop());
        setDebugInfo(error instanceof Error ? error.message : String(error));
        setStatus("error");
        return;
      }
      if (stopped) return;

      // enumerateDevices() is informational and can be slow on iOS. It must
      // not prevent the live preview and decoder from starting.
      void updateCameraList();
      setStatus("scanning");
      scanTimeout = setTimeout(scan, 250);
    }

    void start();

    return () => {
      stopped = true;
      if (scanTimeout) clearTimeout(scanTimeout);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
    };
  }, [deviceId]);

  function saveAsDefault() {
    localStorage.setItem(DEFAULT_CAMERA_KEY, deviceId);
    setDefaultId(deviceId);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="size-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-white/70"
          aria-hidden
        />
        {status !== "scanning" && status !== "idle" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center text-sm text-white">
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
            {debugInfo && (
              <p className="max-w-full text-xs break-all text-white/50">
                {debugInfo}
              </p>
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
