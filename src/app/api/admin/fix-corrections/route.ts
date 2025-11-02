import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Compute minimal text diff between two strings
 */
function computeTextDiff(original: string, corrected: string, contextWords: number = 3) {
  if (original === corrected) {
    return {
      original_text: '',
      corrected_text: '',
      context_before: '',
      context_after: ''
    }
  }

  const originalWords = original.split(/\s+/)
  const correctedWords = corrected.split(/\s+/)

  // Find where difference starts
  let startDiff = 0
  while (startDiff < originalWords.length && startDiff < correctedWords.length && 
         originalWords[startDiff] === correctedWords[startDiff]) {
    startDiff++
  }

  // Find where difference ends
  let endDiffOrig = originalWords.length - 1
  let endDiffCorr = correctedWords.length - 1
  while (endDiffOrig >= startDiff && endDiffCorr >= startDiff &&
         originalWords[endDiffOrig] === correctedWords[endDiffCorr]) {
    endDiffOrig--
    endDiffCorr--
  }

  const changedOriginal = originalWords.slice(startDiff, endDiffOrig + 1).join(' ')
  const changedCorrected = correctedWords.slice(startDiff, endDiffCorr + 1).join(' ')

  const contextBefore = originalWords.slice(Math.max(0, startDiff - contextWords), startDiff).join(' ')
  const contextAfter = originalWords.slice(endDiffOrig + 1, Math.min(originalWords.length, endDiffOrig + 1 + contextWords)).join(' ')

  // If change is too large, return full text
  const changeRatio = changedOriginal.length / original.length
  if (changeRatio > 0.5 || changedOriginal.length > 100) {
    return {
      original_text: original,
      corrected_text: corrected,
      context_before: '',
      context_after: ''
    }
  }

  return {
    original_text: changedOriginal || original,
    corrected_text: changedCorrected || corrected,
    context_before: contextBefore,
    context_after: contextAfter
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role
    if (userRole !== 'Admin' && userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    const body = await req.json()
    const { audio_file_name } = body // e.g., "#2 Intro to the software and tools.m4a"

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Find the H-1 version for this audio file
    const { data: versions, error: fetchError } = await adminClient
      .from('max_transcription_versions')
      .select(`
        id,
        version_type,
        dictionary_corrections_applied,
        transcription:max_transcriptions(
          audio:max_audio_files(
            file_name,
            display_name
          )
        )
      `)
      .eq('version_type', 'H-1')

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    // Find the version for the specified audio file
    const targetVersion = versions?.find((v: any) => {
      const transcription = Array.isArray(v.transcription) ? v.transcription[0] : v.transcription
      const audio = transcription?.audio
      const audioFile = Array.isArray(audio) ? audio[0] : audio
      const fileName = audioFile?.file_name || ''
      const displayName = audioFile?.display_name || ''
      return fileName.includes(audio_file_name) || displayName.includes(audio_file_name) ||
             fileName.includes('#2 Intro') || displayName.includes('#2 Intro')
    })

    if (!targetVersion) {
      return NextResponse.json({ 
        success: false, 
        error: `Could not find H-1 version for audio file containing "${audio_file_name}"` 
      }, { status: 404 })
    }

    const corrections = targetVersion.dictionary_corrections_applied as any[]
    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No corrections found in this version' 
      }, { status: 404 })
    }

    // Recompute diffs for each correction
    const fixedCorrections = corrections.map((correction: any) => {
      const diff = computeTextDiff(
        correction.original_text || '',
        correction.corrected_text || '',
        2
      )

      return {
        ...correction,
        original_text: diff.original_text || correction.original_text,
        corrected_text: diff.corrected_text || correction.corrected_text,
        context_before: diff.context_before || correction.context_before || '',
        context_after: diff.context_after || correction.context_after || ''
      }
    })

    // Update the database
    const { error: updateError } = await adminClient
      .from('max_transcription_versions')
      .update({ dictionary_corrections_applied: fixedCorrections })
      .eq('id', targetVersion.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCorrections.length} corrections`,
      data: {
        version_id: targetVersion.id,
        corrections_fixed: fixedCorrections.length,
        corrections: fixedCorrections
      }
    })

  } catch (error: any) {
    console.error('Error fixing corrections:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fix corrections' },
      { status: 500 }
    )
  }
}

