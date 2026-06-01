import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const localStorageRoot = process.env.LOCAL_STORAGE_ROOT ?? join(process.cwd(), "storage");

export const objectStorage = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "ap-south-1",
  forcePathStyle: Boolean(endpoint),
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export function storageKey(parts: string[]) {
  return parts.map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-")).join("/");
}

export async function createUploadUrl(input: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  if (process.env.FILE_STORAGE_DRIVER === "local") {
    return `/api/v1/storage/upload?key=${encodeURIComponent(input.key)}`;
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
  });

  return getSignedUrl(objectStorage, command, {
    expiresIn: input.expiresInSeconds ?? 900,
  });
}

export async function createDownloadUrl(input: {
  key: string;
  fileName?: string;
  expiresInSeconds?: number;
}) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentDisposition: input.fileName ? `attachment; filename="${input.fileName}"` : undefined,
  });

  return getSignedUrl(objectStorage, command, {
    expiresIn: input.expiresInSeconds ?? 300,
  });
}

export async function putObject(key: string, bytes: Buffer, contentType: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  await objectStorage.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
  }));
}

export function isLocalStorageKey(key: string) {
  return process.env.FILE_STORAGE_DRIVER === "local" || key.startsWith("local/");
}

export function localStoragePath(key: string) {
  return join(localStorageRoot, key.replace(/^local\//, ""));
}

export async function putLocalObject(key: string, bytes: Buffer) {
  const filePath = localStoragePath(key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return filePath;
}

export async function getLocalObject(key: string) {
  return readFile(localStoragePath(key));
}

export function generatedDocumentStorageKey(tenantId: string, documentId: string) {
  if (process.env.FILE_STORAGE_DRIVER === "local" || process.env.NODE_ENV !== "production") {
    return `local/generated/${tenantId}/${documentId}.pdf`;
  }
  return storageKey([tenantId, "generated", `${documentId}.pdf`]);
}

export async function putGeneratedObject(key: string, bytes: Buffer, contentType: string) {
  if (isLocalStorageKey(key)) {
    await putLocalObject(key, bytes);
    return;
  }
  await putObject(key, bytes, contentType);
}
