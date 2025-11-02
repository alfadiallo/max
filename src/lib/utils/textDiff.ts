/**
 * Compute the minimal difference between two texts
 * Returns only the changed portion, or the full text if too different
 */

export interface TextDiff {
  original_text: string
  corrected_text: string
  context_before: string
  context_after: string
}

/**
 * Find the minimal changed portion between two texts
 * Uses word-level comparison to identify the actual change
 */
export function computeTextDiff(original: string, corrected: string, contextWords: number = 3): TextDiff {
  // If texts are identical, return empty diff
  if (original === corrected) {
    return {
      original_text: '',
      corrected_text: '',
      context_before: '',
      context_after: ''
    }
  }

  // Split into words for better comparison
  const originalWords = original.split(/\s+/)
  const correctedWords = corrected.split(/\s+/)

  // Find where the difference starts (from the beginning)
  let startDiff = 0
  while (startDiff < originalWords.length && startDiff < correctedWords.length && 
         originalWords[startDiff] === correctedWords[startDiff]) {
    startDiff++
  }

  // Find where the difference ends (from the end)
  let endDiffOrig = originalWords.length - 1
  let endDiffCorr = correctedWords.length - 1
  while (endDiffOrig >= startDiff && endDiffCorr >= startDiff &&
         originalWords[endDiffOrig] === correctedWords[endDiffCorr]) {
    endDiffOrig--
    endDiffCorr--
  }

  // Extract the changed portions
  const changedOriginal = originalWords.slice(startDiff, endDiffOrig + 1).join(' ')
  const changedCorrected = correctedWords.slice(startDiff, endDiffCorr + 1).join(' ')

  // Extract context (words before and after the change)
  const contextBefore = originalWords.slice(Math.max(0, startDiff - contextWords), startDiff).join(' ')
  const contextAfter = originalWords.slice(endDiffOrig + 1, Math.min(originalWords.length, endDiffOrig + 1 + contextWords)).join(' ')

  // If the change is too large (more than 50% of the text), show the full segment
  // This handles cases where most of the segment was rewritten
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

