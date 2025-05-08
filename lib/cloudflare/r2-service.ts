"use client"

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

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
const USE_ROOT_PATH = true // Store files in the root of the bucket to avoid permission issues

export const r2Service = {
  /**
   * Upload a file to Cloudflare R2 using server API to avoid CORS issues
   */
  async uploadFile(userId: string, file: File): Promise<string> {
    try {
      console.log(`Attempting to upload file for user ${userId}, filename: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      
      // Upload using our API route instead of direct R2 access
      console.log(`Sending file to API endpoint`);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`File uploaded successfully through API: ${result.filePath}`);
      
      return result.filePath;
    } catch (error) {
      console.error("Error uploading file to R2:", error);
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  },

  /**
   * Get a signed URL for a file in R2
   */
  async getFileUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    try {
      console.log(`Getting signed URL for file: ${filePath} with expiry of ${expiresInSeconds} seconds`);
      
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
      })

      const signedUrl = await getSignedUrl(r2Client, getCommand, {
        expiresIn: expiresInSeconds,
      })
      
      console.log(`Generated signed URL successfully for ${filePath}`);
      return signedUrl
    } catch (error) {
      console.error("Error getting signed URL from R2:", error);
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        
        // Additional debugging for specific error types
        if ('$metadata' in error) {
          // @ts-ignore
          console.error(`Error metadata: ${JSON.stringify(error.$metadata)}`);
        }
      }
      throw error
    }
  },

  /**
   * Delete a file from R2
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log(`Attempting to delete file: ${filePath}`);
      
      const deleteParams = {
        Bucket: BUCKET_NAME,
        Key: filePath,
      }

      await r2Client.send(new DeleteObjectCommand(deleteParams))
      console.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      console.error("Error deleting file from R2:", error);
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        
        // Additional debugging for specific error types
        if ('$metadata' in error) {
          // @ts-ignore
          console.error(`Error metadata: ${JSON.stringify(error.$metadata)}`);
        }
      }
      throw error
    }
  },
  
  /**
   * Check if the bucket exists and is accessible
   */
  async checkBucketAccess(): Promise<boolean> {
    try {
      // Try using the API route to check access
      const response = await fetch('/api/upload/check', {
        method: 'GET',
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.hasAccess;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking bucket access:", error);
      return false;
    }
  }
} 