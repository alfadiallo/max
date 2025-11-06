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

    // Verify the translation exists and user has access
    const { data: translation, error: fetchError } = await supabase
      .from('max_translations')
      .select('id, transcription_id, language_code, final_version_id')
      .eq('id', translationId)
      .single()

    if (fetchError || !translation) {
      return NextResponse.json(
        { success: false, error: 'Translation not found or access denied' },
        { status: 404 }
      )
    }

    // Mark translation as ready for speech generation by ensuring it has a final_version_id
    // If no final_version_id exists, we'll use the latest version or create one
    if (!translation.final_version_id) {
      // Get the latest version
      const { data: latestVersion, error: versionError } = await supabase
        .from('max_translation_versions')
        .select('id')
        .eq('translation_id', translationId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      if (!versionError && latestVersion) {
        // Promote the latest version to final
        const { error: updateError } = await supabase
          .from('max_translations')
          .update({ final_version_id: latestVersion.id })
          .eq('id', translationId)

        if (updateError) {
          console.error('Error promoting version to final:', updateError)
          return NextResponse.json(
            { success: false, error: 'Failed to promote version to final' },
            { status: 500 }
          )
        }
      }
    }

    // We can add a ready_for_speech field if needed, but for now we'll use final_version_id as indicator
    // If translation has final_version_id, it's ready for speech generation

    return NextResponse.json({ 
      success: true, 
      message: 'Translation promoted to speech translation',
      data: { translation_id: translationId }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error promoting translation to speech:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to promote translation to speech' },
      { status: 500 }
    )
  }
}

