import { prisma } from "@/server/db";
import { createFileShareToken, decodeFileBundleToken } from "@/server/file-share";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shared files",
};

function publicDownloadHref(fileId: string, expiresAtSeconds: number) {
  const token = createFileShareToken(fileId, expiresAtSeconds);
  const params = new URLSearchParams({ expires: String(token.expires), signature: token.signature });
  return `/api/v1/public/files/${fileId}/download?${params.toString()}`;
}

function ShareShell({ title, message }: { title: string; message: string }) {
  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: 520, width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 20px 44px rgba(15,23,42,0.12)", padding: 28, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>{title}</div>
        <p style={{ marginTop: 8, color: "#475569", fontSize: 14, lineHeight: 1.5 }}>{message}</p>
      </div>
    </main>
  );
}

export default async function SharedFilesPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const token = (await searchParams).d;
  const bundle = token ? decodeFileBundleToken(token) : null;
  if (!bundle) {
    return <ShareShell title="Link expired or invalid" message="This shared link is no longer valid. Ask the sender to share the files again." />;
  }

  const files = await prisma.fileAsset.findMany({
    where: { id: { in: bundle.ids }, deletedAt: null },
    select: { id: true, fileName: true, mimeType: true, documentType: true, documentNo: true, sizeBytes: true },
  });

  if (!files.length) {
    return <ShareShell title="Files unavailable" message="The shared files were not found or have been removed." />;
  }

  // Preserve the sender's selection order.
  const ordered = bundle.ids.map((id) => files.find((file) => file.id === id)).filter((file): file is (typeof files)[number] => Boolean(file));

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: "24px 16px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 20px 44px rgba(15,23,42,0.12)", padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#0f172a" }}>Shared files</div>
          <p style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            {ordered.length} file{ordered.length === 1 ? "" : "s"} shared with you. Tap a file to download.
          </p>
          <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "grid", gap: 12 }}>
            {ordered.map((file) => (
              <li key={file.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14, wordBreak: "break-word" }}>{file.fileName}</div>
                  <div style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>
                    {(file.documentType?.replaceAll("_", " ") ?? "Document")}
                    {file.documentNo ? ` · ${file.documentNo}` : ""}
                  </div>
                </div>
                <a
                  href={publicDownloadHref(file.id, bundle.expires)}
                  style={{ background: "#0f172a", color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 16 }}>Shared securely via WIDESTATE OS</p>
      </div>
    </main>
  );
}
