import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get the recording from Supabase
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('audio_url')
      .eq('id', params.id)
      .single();

    if (recordingError) {
      console.error('Error fetching recording:', recordingError);
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (!recording.audio_url) {
      return NextResponse.json({ error: 'No audio URL found' }, { status: 404 });
    }

    // Fetch the audio file from R2
    const response = await fetch(recording.audio_url);
    if (!response.ok) {
      throw new Error('Failed to fetch audio from R2');
    }

    const audioBlob = await response.blob();

    // Return the audio file with appropriate headers
    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBlob.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error in audio route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 