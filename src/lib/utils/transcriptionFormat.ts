/**
 * Transcription Format Utilities
 * 
 * Functions to convert between timestamped JSON format and complete text block
 */

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

/**
 * Converts timestamped JSON segments into a complete text block
 * @param segments Array of transcription segments with timestamps
 * @returns Complete text block (all segments concatenated)
 */
export function segmentsToCompleteText(segments: TranscriptionSegment[]): string {
  if (!segments || segments.length === 0) {
    return ''
  }

  return segments
    .map(segment => segment.text)
    .join(' ')
}

/**
 * Converts a complete text block back into timestamped segments
 * This is more complex and may not be accurate without word-level timestamps
 * @param completeText Full text without timestamps
 * @param originalSegments Original timestamped segments for reference
 * @returns Array of segments with approximated timestamps
 */
export function completeTextToSegments(
  completeText: string, 
  originalSegments: TranscriptionSegment[]
): TranscriptionSegment[] {
  // This is a simplified version - in production, you'd want more sophisticated
  // word-level timestamp preservation or re-segmentation
  
  const words = completeText.split(/\s+/)
  const totalWords = words.length
  
  if (totalWords === 0) {
    return []
  }

  // Divide text into same number of segments as original
  const segmentCount = originalSegments.length
  const wordsPerSegment = Math.ceil(totalWords / segmentCount)
  
  const newSegments: TranscriptionSegment[] = []
  
  for (let i = 0; i < segmentCount; i++) {
    const startWordIndex = i * wordsPerSegment
    const endWordIndex = Math.min(startWordIndex + wordsPerSegment, totalWords)
    const segmentText = words.slice(startWordIndex, endWordIndex).join(' ')
    
    // Use timestamps from original segment
    const originalSegment = originalSegments[i]
    
    newSegments.push({
      start: originalSegment.start,
      end: originalSegment.end,
      text: segmentText
    })
  }
  
  return newSegments
}

/**
 * Formats timestamped segments for display in dubbing script format
 * @param segments Array of transcription segments
 * @returns Formatted string with timestamps in square brackets
 */
export function formatDubbingScript(segments: TranscriptionSegment[]): string {
  if (!segments || segments.length === 0) {
    return ''
  }

  return segments
    .map(segment => `[${formatTimestamp(segment.start)}-${formatTimestamp(segment.end)}] ${segment.text}`)
    .join('\n')
}

/**
 * Converts seconds to MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

