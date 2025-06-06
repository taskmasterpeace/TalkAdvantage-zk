import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "lobechat"

export async function POST(request: NextRequest) {
  try {
    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const isPublic = (formData.get('isPublic') as string) === 'true'
    const tags = formData.get('tags') as string | null

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

    console.log(`[API] Received document upload request for user ${userId}, file: ${file.name}, size: ${file.size} bytes`)
    
    // Generate file path
    const fileExt = file.name.split('.').pop() || 'pdf'
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `documents/${userId}/${fileName}`
    
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
    
    console.log(`[API] Uploading document to R2: ${filePath}`)
    await r2Client.send(new PutObjectCommand(uploadParams))
    console.log(`[API] Document uploaded successfully: ${filePath}`)
    
    // Store in Supabase documents table
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log(`[API] Storing document metadata in Supabase`)
    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        name: name,
        description: description || null,
        storage_path: filePath,
        is_public: isPublic,
        tags: tags
      })
      .select()
      .single()
    
    if (error) {
      console.error("[API] Error storing document metadata:", error)
      return NextResponse.json(
        { error: 'Failed to store document metadata', details: error.message },
        { status: 500 }
      )
    }
    
    // Map to Document interface expected by client
    const document = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isPublic: data.is_public,
      tags: data.tags
    }
    
    return NextResponse.json({ 
      success: true, 
      filePath, 
      document 
    })
  } catch (error) {
    console.error('[API] Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 