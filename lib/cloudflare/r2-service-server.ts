import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/**
 * Cloudflare R2 configuration using environment variables
 * 
 * Required environment variables in .env.local:
 * - R2_ENDPOINT: Cloudflare R2 endpoint URL (must be a valid URL starting with https://)
 * - R2_ACCESS_KEY_ID: R2 Access Key ID
 * - R2_SECRET_ACCESS_KEY: R2 Secret Access Key
 * - R2_BUCKET_NAME: R2 Bucket name
 * 
 * These variables are used server-side only and not exposed to the client.
 */

// Validate and format the endpoint URL
const getValidEndpoint = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  
  try {
    // Test if it's a valid URL
    new URL(url);
    return url;
  } catch (e) {
    console.error("Invalid R2 endpoint URL:", url);
    return undefined;
  }
};

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: "auto",
  endpoint: getValidEndpoint(process.env.R2_ENDPOINT),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "lobechat" // The bucket that actually exists in your Cloudflare R2 account

/**
 * Get a signed URL for a file in R2
 */
export async function getFileUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
  try {
    // Check if R2 client is properly configured
    if (!process.env.R2_ENDPOINT) {
      throw new Error("R2 endpoint URL is not configured");
    }
    
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    })

    const signedUrl = await getSignedUrl(r2Client, getCommand, {
      expiresIn: expiresInSeconds,
    })
    
    return signedUrl
  } catch (error) {
    console.error("Error getting signed URL from R2:", error)
    throw error
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    // Check if R2 client is properly configured
    if (!process.env.R2_ENDPOINT) {
      throw new Error("R2 endpoint URL is not configured");
    }
    
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: filePath,
    }

    await r2Client.send(new DeleteObjectCommand(deleteParams))
  } catch (error) {
    console.error("Error deleting file from R2:", error)
    throw error
  }
} 