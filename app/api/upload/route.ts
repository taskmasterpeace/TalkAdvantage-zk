import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "lobechat"

export async function POST(request: NextRequest) {
  try {
    // Check if R2 client is properly configured
    if (!process.env.R2_ENDPOINT) {
      return NextResponse.json(
        { error: 'R2 endpoint URL is not configured' },
        { status: 500 }
      )
    }
    
    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const durationSeconds = parseInt(formData.get('durationSeconds') as string || '0')
    const isPublic = (formData.get('isPublic') as string) === 'true'
    const tags = formData.get('tags') as string | null // Get tags from form data

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'No userId provided' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'No name provided' },
        { status: 400 }
      )
    }

    console.log(`[API] Received upload request for user ${userId}, file: ${file.name}, size: ${file.size} bytes`)
    
    // Generate file path
    const fileExt = file.name.split('.').pop() || 'webm'
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `${fileName}` // Store at root level to avoid permission issues
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to R2
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
    }
    
    console.log(`[API] Uploading file to R2: ${filePath}`)
    await r2Client.send(new PutObjectCommand(uploadParams))
    console.log(`[API] File uploaded successfully: ${filePath}`)
    
    // Store in Supabase
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log(`[API] Storing recording metadata in Supabase`)
    const { data, error } = await supabase
      .from("recordings")
      .insert({
        user_id: userId,
        name: name,
        description: description || null,
        duration_seconds: durationSeconds,
        storage_path: filePath,
        is_public: isPublic,
        is_processed: false,
        tags: tags // Add tags to the database record
      })
      .select()
      .single()
    
    if (error) {
      console.error("[API] Error storing recording metadata:", error)
      return NextResponse.json(
        { error: 'Failed to store recording metadata', details: error.message },
        { status: 500 }
      )
    }
    
    // Map to Recording interface expected by client
    const recording = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      durationSeconds: data.duration_seconds,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isProcessed: data.is_processed,
      isPublic: data.is_public,
      tags: data.tags // Include tags in the response
    }
    
    return NextResponse.json({ 
      success: true, 
      filePath, 
      recording 
    })
  } catch (error) {
    console.error('[API] Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 