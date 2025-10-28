/**
 * Diff Generator for Transcription Edit Tracking
 * 
 * Generates word-level diffs between original and edited text,
 * capturing context (2 words before and after each change).
 */

export interface WordEdit {
  original_text: string;
  corrected_text: string;
  position_start: number;  // Character position in original text
  position_end: number;    // Character position in original text
  context_before: string;  // 2 words before the edit
  context_after: string;   // 2 words after the edit
}

export interface EditTrackingData {
  edits: WordEdit[];
  total_edits: number;
  transcription_version_id: string;
  audio_file_id: string;
}

/**
 * Generates word-level diffs between original and edited text
 * @param originalText Original transcription text
 * @param editedText Edited transcription text
 * @returns Array of word-level edits with context
 */
export function generateWordLevelDiff(
  originalText: string,
  editedText: string
): WordEdit[] {
  const edits: WordEdit[] = [];

  // Simple word-by-word comparison
  // For production, consider using a more robust diff algorithm (e.g., diff.js)
  const originalWords = originalText.split(/\s+/);
  const editedWords = editedText.split(/\s+/);

  let originalIndex = 0;
  let editedIndex = 0;
  let charPosition = 0;

  while (originalIndex < originalWords.length || editedIndex < editedWords.length) {
    const originalWord = originalWords[originalIndex] || '';
    const editedWord = editedWords[editedIndex] || '';

    // If words are different, record the edit
    if (originalWord !== editedWord) {
      // Find the position of this word in the original text
      const positionStart = charPosition;
      const positionEnd = charPosition + originalWord.length;

      // Get context (2 words before and after)
      const contextBefore = getContextBefore(originalWords, originalIndex, 2);
      const contextAfter = getContextAfter(originalWords, originalIndex, 2);

      edits.push({
        original_text: originalWord,
        corrected_text: editedWord,
        position_start: positionStart,
        position_end: positionEnd,
        context_before: contextBefore,
        context_after: contextAfter,
      });

      charPosition += originalWord.length + 1; // +1 for the space
      originalIndex++;
      editedIndex++;
    } else {
      // Words match, advance both
      charPosition += originalWord.length + 1;
      originalIndex++;
      editedIndex++;
    }
  }

  return edits;
}

/**
 * Gets context words before a given position
 */
function getContextBefore(words: string[], index: number, count: number): string {
  const startIndex = Math.max(0, index - count);
  return words.slice(startIndex, index).join(' ');
}

/**
 * Gets context words after a given position
 */
function getContextAfter(words: string[], index: number, count: number): string {
  const endIndex = Math.min(words.length, index + 1 + count);
  return words.slice(index + 1, endIndex).join(' ');
}

/**
 * Prepares edit tracking data for database storage
 */
export function prepareEditTrackingData(
  originalText: string,
  editedText: string,
  transcriptionVersionId: string,
  audioFileId: string
): EditTrackingData {
  const edits = generateWordLevelDiff(originalText, editedText);

  return {
    edits,
    total_edits: edits.length,
    transcription_version_id: transcriptionVersionId,
    audio_file_id: audioFileId,
  };
}

