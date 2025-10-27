import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const translationId = params.id
    const body = await req.json()
    const { edited_text, json_with_timestamps } = body

    if (!edited_text) {
      return NextResponse.json({ success: false, error: 'Missing edited_text' }, { status: 400 })
    }

    // Get translation
    const { data: translation, error: transError } = await supabase
      .from('max_translations')
      .select('*')
      .eq('id', translationId)
      .single()

    if (transError || !translation) {
      return NextResponse.json({ success: false, error: 'Translation not found' }, { status: 404 })
    }

    // Get latest version number
    const { data: latestVersion, error: latestError } = await supabase
      .from('max_translation_versions')
      .select('version_number')
      .eq('translation_id', translationId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1
    const versionType = `H-${nextVersionNumber}`

    const { data: newVersion, error: insertError } = await supabase
      .from('max_translation_versions')
      .insert({
        translation_id: translationId,
        version_number: nextVersionNumber,
        version_type: versionType,
        edited_text: edited_text,
        json_with_timestamps: json_with_timestamps,
        edited_by: user.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Delete old speech files since we have a new version
    // This ensures speech will be regenerated from the latest version
    const { error: deleteSpeechError } = await supabase
      .from('max_generated_speech')
      .delete()
      .eq('translation_id', translationId)

    if (deleteSpeechError) {
      console.error('Error deleting old speech files:', deleteSpeechError)
      // Don't fail the save if speech deletion fails
    }

    // Auto-promote this new version to final
    const { error: updateFinalError } = await supabase
      .from('max_translations')
      .update({ final_version_id: newVersion.id })
      .eq('id', translationId)

    if (updateFinalError) {
      console.error('Error promoting version to final:', updateFinalError)
      // Don't fail the save if final update fails
    }

    return NextResponse.json({ success: true, data: newVersion }, { status: 201 })

  } catch (error: any) {
    console.error('Error saving translation version:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save translation version' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const translationId = params.id

    const { data: versions, error } = await supabase
      .from('max_translation_versions')
      .select('*')
      .eq('translation_id', translationId)
      .order('version_number', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: versions }, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching translation versions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch translation versions' },
      { status: 500 }
    )
  }
}


