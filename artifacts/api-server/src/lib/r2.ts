import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import type { Readable } from "node:stream";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "ekolglass-photos";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = "assemblies"
): Promise<string> {
  const ext = path.extname(originalName) || ".jpg";
  const uniqueName = `${folder}/${crypto.randomUUID()}${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueName,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );

  return uniqueName;
}

export async function getFromR2(key: string): Promise<{ body: Readable; contentType: string }> {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
  return {
    body: response.Body as Readable,
    contentType: response.ContentType ?? "image/jpeg",
  };
}

export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

export function getR2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
