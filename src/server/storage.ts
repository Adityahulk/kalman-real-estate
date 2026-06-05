import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { FileStorageProvider } from "@prisma/client";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const localStorageRoot = resolve(process.env.LOCAL_STORAGE_ROOT ?? resolve(process.cwd(), "storage"));
const s3TimeoutMs = Number(process.env.S3_TIMEOUT_MS ?? 2_500);

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

type StorageDriver = "local" | "s3" | "s3_with_local_fallback";

type UploadTarget = {
  provider: FileStorageProvider;
  storageKey: string;
  url: string;
};

export type UploadTargets = {
  primary: UploadTarget;
  fallback?: UploadTarget;
  preferredProvider: FileStorageProvider;
  warning?: string;
};

export type StoredObjectResult = {
  storageProvider: FileStorageProvider;
  storageKey: string;
  fallbackStorageKey?: string;
  warning?: string;
};

export function storageDriver(): StorageDriver {
  const value = process.env.FILE_STORAGE_DRIVER;
  if (value === "local" || value === "s3") return value;
  return "s3_with_local_fallback";
}

function s3Bucket() {
  return process.env.S3_BUCKET;
}

function shouldTryS3() {
  return storageDriver() !== "local" && Boolean(s3Bucket()) && hasS3CredentialSource();
}

function hasS3CredentialSource() {
  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) return true;
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return true;
  if (process.env.AWS_WEB_IDENTITY_TOKEN_FILE && process.env.AWS_ROLE_ARN) return true;
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI) return true;
  return process.env.S3_ALLOW_IAM_ROLE === "true";
}

export function localFallbackKey(key: string) {
  return key.startsWith("local/") ? key : `local/${key}`;
}

function localUploadTarget(key: string): UploadTarget {
  const localKey = localFallbackKey(key);
  return {
    provider: FileStorageProvider.LOCAL,
    storageKey: localKey,
    url: `/api/v1/storage/upload?key=${encodeURIComponent(localKey)}`,
  };
}

async function s3UploadTarget(key: string, contentType: string, expiresInSeconds?: number): Promise<UploadTarget> {
  const bucket = s3Bucket();
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return {
    provider: FileStorageProvider.S3,
    storageKey: key,
    url: await withTimeout(
      getSignedUrl(objectStorage, command, { expiresIn: expiresInSeconds ?? 900 }),
      "S3 upload URL could not be created",
    ),
  };
}

export async function createUploadTargets(input: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<UploadTargets> {
  const fallback = localUploadTarget(input.key);
  if (!shouldTryS3()) {
    return { primary: fallback, preferredProvider: FileStorageProvider.LOCAL };
  }

  try {
    const primary = await s3UploadTarget(input.key, input.contentType, input.expiresInSeconds);
    return {
      primary,
      fallback,
      preferredProvider: FileStorageProvider.S3,
    };
  } catch (error) {
    if (storageDriver() === "s3") throw storageConfigError(error);
    return {
      primary: fallback,
      preferredProvider: FileStorageProvider.LOCAL,
      warning: humanStorageWarning(error),
    };
  }
}

export async function createUploadUrl(input: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  return (await createUploadTargets(input)).primary.url;
}

export async function createDownloadUrl(input: {
  key: string;
  fileName?: string;
  disposition?: "attachment" | "inline";
  expiresInSeconds?: number;
}) {
  const bucket = s3Bucket();
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentDisposition: input.fileName ? `${input.disposition ?? "attachment"}; filename="${input.fileName}"` : undefined,
  });

  return withTimeout(
    getSignedUrl(objectStorage, command, { expiresIn: input.expiresInSeconds ?? 300 }),
    "S3 download URL could not be created",
  );
}

export async function putObject(key: string, bytes: Buffer, contentType: string) {
  const bucket = s3Bucket();
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  await withTimeout(
    objectStorage.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })),
    "S3 object upload timed out or failed",
  );
}

export function isLocalStorageKey(key: string) {
  return process.env.FILE_STORAGE_DRIVER === "local" || key.startsWith("local/");
}

export function localStoragePath(key: string) {
  const relativeKey = key.replace(/^local\//, "");
  const parts = relativeKey.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    throw invalidLocalStorageKey();
  }
  const filePath = resolve(localStorageRoot, ...parts);
  if (filePath !== localStorageRoot && !filePath.startsWith(`${localStorageRoot}${sep}`)) {
    throw invalidLocalStorageKey();
  }
  return filePath;
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

export async function getS3Object(key: string) {
  const bucket = s3Bucket();
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  const result = await withTimeout(
    objectStorage.send(new GetObjectCommand({ Bucket: bucket, Key: key })),
    "S3 object download timed out or failed",
  );
  const body = result.Body;
  if (!body || typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] !== "function") {
    throw new Error("Unsupported S3 object stream");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function getObjectResilient(key: string) {
  if (isLocalStorageKey(key)) return getLocalObject(key);

  const localKey = localFallbackKey(key);
  if (storageDriver() === "local" || !shouldTryS3()) return getLocalObject(localKey);

  if (storageDriver() === "s3_with_local_fallback") {
    try {
      return await getLocalObject(localKey);
    } catch (localBeforeError) {
      try {
        return await getS3Object(key);
      } catch (s3Error) {
        try {
          return await getLocalObject(localKey);
        } catch {
          throw new Error(
            `Stored file is unavailable. Local fallback missing (${humanStorageWarning(localBeforeError)}). S3 read failed (${humanStorageWarning(s3Error)}).`,
          );
        }
      }
    }
  }

  return getS3Object(key);
}

export function generatedDocumentStorageKey(tenantId: string, documentId: string) {
  return storageKey([tenantId, "generated", `${documentId}.pdf`]);
}

export async function putGeneratedObject(key: string, bytes: Buffer, contentType: string): Promise<StoredObjectResult> {
  return putObjectResilient(key, bytes, contentType, { mirrorLocalOnS3Success: true });
}

export async function putObjectResilient(
  key: string,
  bytes: Buffer,
  contentType: string,
  options: { mirrorLocalOnS3Success?: boolean } = {},
): Promise<StoredObjectResult> {
  const localKey = localFallbackKey(key);

  if (!shouldTryS3() || key.startsWith("local/")) {
    await putLocalObject(localKey, bytes);
    return {
      storageProvider: FileStorageProvider.LOCAL,
      storageKey: localKey,
    };
  }

  try {
    await putObject(key, bytes, contentType);
    let fallbackStorageKey: string | undefined;
    if (options.mirrorLocalOnS3Success) {
      try {
        await putLocalObject(localKey, bytes);
        fallbackStorageKey = localKey;
      } catch {
        fallbackStorageKey = undefined;
      }
    }
    return {
      storageProvider: FileStorageProvider.S3,
      storageKey: key,
      fallbackStorageKey,
    };
  } catch (error) {
    if (storageDriver() === "s3") throw storageConfigError(error);
    try {
      await putLocalObject(localKey, bytes);
      return {
        storageProvider: FileStorageProvider.LOCAL,
        storageKey: localKey,
        warning: humanStorageWarning(error),
      };
    } catch (localError) {
      const message = `Storage unavailable: S3 failed (${humanStorageWarning(error)}) and local fallback failed (${humanStorageWarning(localError)}).`;
      throw new Error(message);
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), s3TimeoutMs);
  });
  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function storageConfigError(error: unknown) {
  const wrapped = new Error(`S3 storage is not available: ${humanStorageWarning(error)}`);
  wrapped.name = "StorageConfigError";
  return wrapped;
}

function invalidLocalStorageKey() {
  const error = new Error("Invalid local storage key");
  error.name = "BadRequestError";
  return error;
}

export function humanStorageWarning(error: unknown) {
  if (error instanceof Error) return error.message;
  return "unknown storage error";
}
