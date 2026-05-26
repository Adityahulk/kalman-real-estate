import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const localStorageRoot = join(process.cwd(), "storage");

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

export function isLocalStorageKey(key: string) {
  return key.startsWith("local/");
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
