import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://55eba397da04ea21cf0ffbca29957d41.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "dc371b9f6d772a63770e2a330dea33ba",
    secretAccessKey: "74b3d77df720947daf04601780ed925cad409aa8fc7b1b9544ad24593d6dc6b8",
  },
})

const BUCKET_NAME = "lobechat" // The bucket that actually exists in your Cloudflare R2 account

/**
 * Get a signed URL for a file in R2
 */
export async function getFileUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
  try {
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