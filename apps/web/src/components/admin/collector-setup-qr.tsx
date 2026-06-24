"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import {
  buildCollectorAuthQrPayload,
  normalizeMobileApiUrl,
} from "@/lib/collector-auth-qr";

type CollectorSetupQrProps = {
  apiUrl: string;
  token: string;
  collectorName?: string;
  size?: number;
  showActions?: boolean;
};

export function CollectorSetupQr({
  apiUrl,
  token,
  collectorName,
  size = 280,
  showActions = true,
}: CollectorSetupQrProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;

    async function render() {
      const normalizedUrl = normalizeMobileApiUrl(apiUrl);
      if (!normalizedUrl || !token.trim()) {
        if (active) {
          setDataUrl("");
          setError("API URL and token are required to generate a QR code.");
        }
        return;
      }

      try {
        const value = buildCollectorAuthQrPayload(normalizedUrl, token);
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        if (active) {
          setDataUrl(url);
          setError("");
        }
      } catch (caught) {
        if (active) {
          setDataUrl("");
          setError(caught instanceof Error ? caught.message : "Unable to render QR code");
        }
      }
    }

    render();

    return () => {
      active = false;
    };
  }, [apiUrl, token, size]);

  async function downloadPng() {
    if (!dataUrl) return;

    setDownloading(true);
    try {
      const slug = collectorName
        ? collectorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        : "collector";
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `ndtech-collector-setup-${slug}.png`;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return <div className="text-sm text-slate-500">Generating QR code…</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <img
          src={dataUrl}
          alt={
            collectorName
              ? `Flutter setup QR for ${collectorName}`
              : "Collector app setup QR code"
          }
          width={size}
          height={size}
        />
      </div>

      {collectorName ? (
        <p className="text-center text-sm font-medium text-slate-800">{collectorName}</p>
      ) : null}

      <p className="max-w-sm text-center text-xs text-slate-500">
        Open the NDTECH Collector app → Settings → Scan setup QR. This fills the API URL
        and auth token automatically.
      </p>

      {showActions ? (
        <button
          type="button"
          onClick={downloadPng}
          disabled={downloading}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {downloading ? "Downloading…" : "Download QR (PNG)"}
        </button>
      ) : null}
    </div>
  );
}
