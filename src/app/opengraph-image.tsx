import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LCON — Leafclutch Online Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#1e1b4b",
            letterSpacing: "-2px",
          }}
        >
          LCON
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#4f46e5",
          }}
        >
          Leafclutch Online Network
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#6b7280",
            marginTop: 8,
          }}
        >
          Secure staff portal for Leafclutch team members
        </div>
      </div>
    ),
    size,
  );
}
