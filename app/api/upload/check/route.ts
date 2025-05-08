import { NextResponse } from 'next/server'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://55eba397da04ea21cf0ffbca29957d41.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "dc371b9f6d772a63770e2a330dea33ba",
    secretAccessKey: "74b3d77df720947daf04601780ed925cad409aa8fc7b1b9544ad24593d6dc6b8",
  },
})

export async function GET() {
  try {
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