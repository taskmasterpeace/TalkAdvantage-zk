import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://55eba397da04ea21cf0ffbca29957d41.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "dc371b9f6d772a63770e2a330dea33ba",
    secretAccessKey: "74b3d77df720947daf04601780ed925cad409aa8fc7b1b9544ad24593d6dc6b8",
  },
})

const BUCKET_NAME = "lobechat"

export async function POST(request: NextRequest) {
  try {
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