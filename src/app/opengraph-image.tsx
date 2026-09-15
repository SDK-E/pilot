import { ImageResponse } from "next/og";

export const alt = "Pilot — one AI workspace for chat, work, and code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 56,
          fontWeight: 600,
        }}
      >
        Pilot
        <span style={{ color: "#a3e635", marginLeft: 4 }}>.</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          fontSize: 32,
          color: "#a1a1aa",
        }}
      >
        Chat, work, and code — one AI workspace.
      </div>
    </div>,
    { ...size },
  );
}
