import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Fetch the transcript from Supabase
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('recording_id', params.id)
      .single();

    if (error) {
      console.error('Error fetching transcript:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transcript' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      full_text: data.full_text,
      speakers: data.speakers,
      overall_sentiment: data.overall_sentiment,
      meta: data.meta
    });
  } catch (error) {
    console.error('Error in transcript API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 