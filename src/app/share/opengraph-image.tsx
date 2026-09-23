import { ImageResponse } from "next/og";

export const alt = "Files shared securely through WIDESTATE OS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ShareOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0b1220",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", flexDirection: "column", textAlign: "center" }}>
          <div style={{ alignItems: "center", background: "#d4a74f", borderRadius: 12, color: "#0b1220", display: "flex", fontSize: 34, fontWeight: 800, height: 76, justifyContent: "center", width: 76 }}>W</div>
          <div style={{ color: "#d4a74f", fontSize: 24, fontWeight: 700, letterSpacing: 3, marginTop: 36 }}>WIDESTATE OS</div>
          <div style={{ fontSize: 62, fontWeight: 700, marginTop: 18 }}>Secure file share</div>
          <div style={{ color: "#cbd5e1", fontSize: 25, marginTop: 22 }}>Open the link to view and download your shared files.</div>
        </div>
      </div>
    ),
    size,
  );
}
