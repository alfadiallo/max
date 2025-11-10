import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { original_text, edited_text, language_code, transcription_id } = body

    if (!original_text || !edited_text || !language_code) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Simple term extraction - split by words and compare
    // This is a simplified version - in production, use NLP libraries for better extraction
    const originalWords = original_text.toLowerCase().split(/\s+/)
    const editedWords = edited_text.toLowerCase().split(/\s+/)
    
    // For now, we'll store the entire original and edited text as a dictionary entry
    // This can be refined later to extract specific term pairs
    
    // Check if this dictionary entry already exists
    const { data: existingEntry } = await supabase
      .from('max_dictionary')
      .select('*')
      .eq('term_original', original_text.substring(0, 100)) // Store first 100 chars as key
      .eq('language_code', language_code)
      .single()

    if (existingEntry) {
      // Update usage count
      await supabase
        .from('max_dictionary')
        .update({ 
          usage_count: existingEntry.usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id)
      
      return NextResponse.json({ success: true, data: existingEntry }, { status: 200 })
    } else {
      // Create new dictionary entry
      const { data: newEntry, error } = await supabase
        .from('max_dictionary')
        .insert({
          term_original: original_text,
          term_corrected: edited_text,
          language_code: language_code,
          context: `Transcription: ${transcription_id}`,
          usage_count: 1,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data: newEntry }, { status: 201 })
    }

  } catch (error: any) {
    console.error('Error extracting dictionary terms:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to extract dictionary terms' },
      { status: 500 }
    )
  }
}














