/**
 * Converts Sonix CSV export to Max transcription format
 * 
 * Sonix CSV format:
 * - Word,Start Timecode,End Timecode,Speaker
 * - Timecode format: HH:MM:SS:FF (hours:minutes:seconds:frames, typically 24fps or 30fps)
 */

interface SonixCSVRow {
  word: string
  startTimecode: string // HH:MM:SS:FF
  endTimecode: string   // HH:MM:SS:FF
  speaker: string
}

interface MaxWord {
  word: string
  start: number  // seconds (decimal)
  end: number    // seconds (decimal)
}

interface MaxSegment {
  id: number
  seek: number    // milliseconds (or can be same as start * 1000)
  start: number   // seconds (decimal)
  end: number     // seconds (decimal)
  text: string    // Full segment text
  words: MaxWord[] // Word-level timestamps within segment
}

/**
 * Converts timecode (HH:MM:SS:FF) to seconds
 * Assumes 24fps for frame calculation (common for video)
 */
function timecodeToSeconds(timecode: string, fps: number = 24): number {
  const [timePart, frames] = timecode.split(':')
  const [hours, minutes, seconds] = timePart.split(':').map(Number)
  const frameNumber = parseInt(frames) || 0
  
  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  const frameSeconds = frameNumber / fps
  
  return totalSeconds + frameSeconds
}

/**
 * Groups words into segments based on punctuation and pauses
 * This is a heuristic - you may want to adjust based on your needs
 */
function groupWordsIntoSegments(
  words: Array<{ word: string; start: number; end: number; speaker: string }>,
  pauseThreshold: number = 0.5 // 500ms pause indicates segment boundary
): MaxSegment[] {
  const segments: MaxSegment[] = []
  let currentSegment: Array<{ word: string; start: number; end: number; speaker: string }> = []
  let segmentId = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const prevWord = i > 0 ? words[i - 1] : null

    // Start new segment if:
    // 1. This is the first word
    // 2. There's a significant pause (> pauseThreshold)
    // 3. Previous word ends with sentence-ending punctuation
    const shouldStartNewSegment =
      !prevWord ||
      (word.start - prevWord.end > pauseThreshold) ||
      (prevWord.word.match(/[.!?]$/))

    if (shouldStartNewSegment && currentSegment.length > 0) {
      // Save current segment
      segments.push(createSegmentFromWords(currentSegment, segmentId++))
      currentSegment = []
    }

    currentSegment.push(word)
  }

  // Don't forget the last segment
  if (currentSegment.length > 0) {
    segments.push(createSegmentFromWords(currentSegment, segmentId))
  }

  return segments
}

/**
 * Creates a Max segment from an array of words
 */
function createSegmentFromWords(
  words: Array<{ word: string; start: number; end: number; speaker: string }>,
  id: number
): MaxSegment {
  if (words.length === 0) {
    throw new Error('Cannot create segment from empty word array')
  }

  const start = words[0].start
  const end = words[words.length - 1].end
  const text = words.map(w => w.word).join(' ')

  return {
    id,
    seek: Math.floor(start * 1000), // Convert to milliseconds
    start,
    end,
    text,
    words: words.map(w => ({
      word: w.word,
      start: w.start,
      end: w.end
    }))
  }
}

/**
 * Parses Sonix CSV content into Max transcription format
 * 
 * @param csvContent - Raw CSV string from Sonix
 * @param fps - Frames per second for timecode conversion (default: 24)
 * @returns Max-compatible transcription format
 */
/**
 * Convert Sonix CSV export to Max format (Sonix-style: nested words only, no flattened array)
 */
export function convertSonixCSVToMaxFormat(
  csvContent: string,
  fps: number = 24
): {
  raw_text: string
  json_with_timestamps: {
    segments: MaxSegment[]
    metadata: {
      source: 'sonix'
      speaker_count: number
      duration: number
    }
  }
} {
  // Parse CSV (simple parser - assumes no commas in word text)
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
  
  // Find column indices
  const wordIdx = headers.indexOf('word')
  const startIdx = headers.indexOf('start timecode')
  const endIdx = headers.indexOf('end timecode')
  const speakerIdx = headers.indexOf('speaker')

  if (wordIdx === -1 || startIdx === -1 || endIdx === -1) {
    throw new Error('Invalid Sonix CSV format: missing required columns')
  }

  // Parse rows (skip header)
  const words: Array<{ word: string; start: number; end: number; speaker: string }> = []
  const speakers = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing (handles quoted fields)
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Last value

    if (values.length < Math.max(wordIdx, startIdx, endIdx) + 1) {
      continue // Skip malformed rows
    }

    const word = values[wordIdx]?.replace(/^"|"$/g, '') || '' // Remove quotes
    const startTimecode = values[startIdx]?.trim() || ''
    const endTimecode = values[endIdx]?.trim() || ''
    const speaker = speakerIdx >= 0 ? (values[speakerIdx]?.trim() || 'Speaker1') : 'Speaker1'

    if (!word || !startTimecode || !endTimecode) {
      continue // Skip incomplete rows
    }

    const start = timecodeToSeconds(startTimecode, fps)
    const end = timecodeToSeconds(endTimecode, fps)

    words.push({ word, start, end, speaker })
    speakers.add(speaker)
  }

  if (words.length === 0) {
    throw new Error('No valid words found in Sonix CSV')
  }

  // Group words into segments
  const segments = groupWordsIntoSegments(words)

  // Calculate duration
  const duration = words.length > 0 
    ? words[words.length - 1].end 
    : 0

  // Build full text
  const raw_text = segments.map(s => s.text).join(' ')

  return {
    raw_text,
    json_with_timestamps: {
      segments,
      // No flattened words array - words are nested in segments (Sonix format)
      metadata: {
        source: 'sonix',
        speaker_count: speakers.size,
        duration
      }
    }
  }
}

/**
 * Alternative: If Sonix provides JSON API endpoint (preferred)
 * This would be a cleaner approach if Sonix has a JSON transcript API
 */
export interface SonixJSONSegment {
  id: number
  start: number  // seconds
  end: number    // seconds
  text: string
  words?: Array<{
    word: string
    start: number
    end: number
  }>
}

/**
 * Convert Sonix JSON transcript to Max format (Sonix-style: nested words only, no flattened array)
 */
export function convertSonixJSONToMaxFormat(
  sonixJSON: {
    segments: SonixJSONSegment[]
    full_text?: string
  }
): {
  raw_text: string
  json_with_timestamps: {
    segments: MaxSegment[]
    metadata: {
      source: 'sonix'
      duration: number
    }
  }
} {
  const segments = sonixJSON.segments.map((seg, idx) => ({
    id: seg.id || idx,
    seek: Math.floor(seg.start * 1000),
    start: seg.start,
    end: seg.end,
    text: seg.text,
    words: seg.words || []
  }))

  const duration = segments.length > 0 
    ? segments[segments.length - 1].end 
    : 0

  return {
    raw_text: sonixJSON.full_text || segments.map(s => s.text).join(' '),
    json_with_timestamps: {
      segments,
      // No flattened words array - Sonix format uses nested words only
      metadata: {
        source: 'sonix',
        duration
      }
    }
  }
}
