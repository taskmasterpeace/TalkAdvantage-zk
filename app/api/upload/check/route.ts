import { NextResponse } from 'next/server'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'

/**
 * Cloudflare R2 configuration using environment variables
 * 
 * Required environment variables in .env.local:
 * - R2_ENDPOINT: Cloudflare R2 endpoint URL (must be a valid URL starting with https://)
 * - R2_ACCESS_KEY_ID: R2 Access Key ID
 * - R2_SECRET_ACCESS_KEY: R2 Secret Access Key
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

export async function GET() {
  try {
    // Check if R2 client is properly configured
    if (!process.env.R2_ENDPOINT) {
      return NextResponse.json({ 
        hasAccess: false, 
        error: 'R2 endpoint URL is not configured' 
      })
    }
    
    // Attempt to list buckets to check if we have access
    console.log('[API] Checking R2 bucket access')
    const command = new ListBucketsCommand({})
    const response = await r2Client.send(command)
    
    // If we got a response, we have access
    const hasAccess = Array.isArray(response.Buckets) && response.Buckets.length > 0
    console.log(`[API] R2 bucket access check: ${hasAccess ? 'Success' : 'Failed'}`)
    
    return NextResponse.json({ 
      hasAccess,
      buckets: response.Buckets?.map(bucket => bucket.Name) || [] 
    })
  } catch (error) {
    console.error('[API] Error checking R2 bucket access:', error)
    return NextResponse.json(
      { hasAccess: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 