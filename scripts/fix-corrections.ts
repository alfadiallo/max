/**
 * Script to fix corrections for specific audio file
 * Updates dictionary_corrections_applied to show only changed words
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function fixCorrections() {
  try {
    // Find the version
    const { data: versions, error: fetchError } = await supabase
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
      console.error('Error fetching versions:', fetchError)
      return
    }

    console.log(`Found ${versions?.length || 0} H-1 versions`)

    // Find the one for "#2 Intro"
    const targetVersion = versions?.find(v => {
      const audio = (v.transcription as any)?.audio
      const fileName = Array.isArray(audio) ? audio[0]?.file_name : audio?.file_name
      const displayName = Array.isArray(audio) ? audio[0]?.display_name : audio?.display_name
      return fileName?.includes('#2 Intro') || displayName?.includes('#2 Intro')
    })

    if (!targetVersion) {
      console.error('Could not find H-1 version for #2 Intro audio file')
      return
    }

    console.log('Found target version:', targetVersion.id)

    const corrections = targetVersion.dictionary_corrections_applied as any[]
    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      console.log('No corrections found in this version')
      return
    }

    console.log(`Found ${corrections.length} corrections`)

    // Recompute diffs for each correction
    const fixedCorrections = corrections.map(correction => {
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

    console.log('Fixed corrections:')
    fixedCorrections.forEach((c, i) => {
      console.log(`  ${i + 1}. "${c.original_text}" → "${c.corrected_text}"`)
    })

    // Update the database
    const { error: updateError } = await supabase
      .from('max_transcription_versions')
      .update({ dictionary_corrections_applied: fixedCorrections })
      .eq('id', targetVersion.id)

    if (updateError) {
      console.error('Error updating corrections:', updateError)
      return
    }

    console.log('✅ Successfully updated corrections!')
    console.log(`Updated ${fixedCorrections.length} corrections for version ${targetVersion.id}`)

  } catch (error: any) {
    console.error('Error:', error)
  }
}

fixCorrections()

