/**
 * Script to fix corrections for #2 Intro audio file
 * Run with: node scripts/fix-corrections.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function computeTextDiff(original, corrected, contextWords = 3) {
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

  let startDiff = 0
  while (startDiff < originalWords.length && startDiff < correctedWords.length && 
         originalWords[startDiff] === correctedWords[startDiff]) {
    startDiff++
  }

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
    // Find the version for #2 Intro
    const { data: versions, error: fetchError } = await supabase
      .from('max_transcription_versions')
      .select(`
        id,
        version_type,
        dictionary_corrections_applied,
        transcription:max_transcriptions!inner(
          audio:max_audio_files!inner(
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
      const transcription = Array.isArray(v.transcription) ? v.transcription[0] : v.transcription
      const audio = transcription?.audio
      const audioFile = Array.isArray(audio) ? audio[0] : audio
      const fileName = audioFile?.file_name || ''
      const displayName = audioFile?.display_name || ''
      return fileName.includes('#2 Intro') || displayName.includes('#2 Intro') || 
             fileName.includes('Intro to the software') || displayName.includes('Intro to the software')
    })

    if (!targetVersion) {
      console.error('Could not find H-1 version for #2 Intro audio file')
      console.log('Available versions:', versions?.map(v => {
        const t = Array.isArray(v.transcription) ? v.transcription[0] : v.transcription
        const a = t?.audio
        const af = Array.isArray(a) ? a[0] : a
        return af?.file_name || af?.display_name || 'unknown'
      }))
      return
    }

    console.log('Found target version:', targetVersion.id)

    const corrections = targetVersion.dictionary_corrections_applied
    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      console.log('No corrections found in this version')
      return
    }

    console.log(`\nFound ${corrections.length} corrections:`)
    corrections.forEach((c, i) => {
      console.log(`  ${i + 1}. Original: "${c.original_text}"`)
      console.log(`     Corrected: "${c.corrected_text}"`)
    })

    // Recompute diffs
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

    console.log('\nFixed corrections:')
    fixedCorrections.forEach((c, i) => {
      console.log(`  ${i + 1}. Original: "${c.original_text}"`)
      console.log(`     Corrected: "${c.corrected_text}"`)
      if (c.context_before) console.log(`     Context before: "${c.context_before}"`)
      if (c.context_after) console.log(`     Context after: "${c.context_after}"`)
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

    console.log(`\n✅ Successfully updated ${fixedCorrections.length} corrections!`)

  } catch (error) {
    console.error('Error:', error)
  }
}

fixCorrections()
