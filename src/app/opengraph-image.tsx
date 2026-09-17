import { ImageResponse } from "next/og";

export const alt = "WIDESTATE OS real estate builder software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#0b1220",
          color: "white",
          display: "flex",
          height: "100%",
          padding: "64px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ alignItems: "center", display: "flex", fontSize: 28, fontWeight: 700, gap: 18 }}>
            <div style={{ alignItems: "center", background: "#d4a74f", borderRadius: 8, color: "#0b1220", display: "flex", height: 58, justifyContent: "center", width: 58 }}>W</div>
            WIDESTATE OS
            <span style={{ color: "#94a3b8", fontSize: 20, fontWeight: 400 }}>by Kalman Labs</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
            <div style={{ color: "#d4a74f", fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Real estate builder software</div>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.08, marginTop: 18 }}>CRM, plots, ownership, documents and construction in one system.</div>
          </div>
          <div style={{ color: "#cbd5e1", display: "flex", fontSize: 22, gap: 18 }}>
            <span>Punjab</span><span>•</span><span>Bathinda</span><span>•</span><span>Barnala</span><span>•</span><span>Hyderabad</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
