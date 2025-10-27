export const TRANSLATION_USER_PROMPT = (originalText: string, targetLanguage: string, languageCode: string, segments?: any[]): string => {
  const languageNames: Record<string, string> = {
    'sp': 'Spanish',
    'pr': 'Portuguese',
    'ar': 'Arabic',
    'fr': 'French',
    'ge': 'German',
    'it': 'Italian',
    'ma': 'Mandarin',
    'ja': 'Japanese',
    'hi': 'Hindi'
  }

  const languageName = languageNames[languageCode] || targetLanguage

  if (segments && segments.length > 0) {
    // Request segmented translation
    const segmentFormat = segments.map(seg => 
      `[${seg.start.toFixed(2)}-${seg.end.toFixed(2)}] ${seg.text}`
    ).join('\n')

    return `You are an expert translator specializing in medical and technical content. Translate the following English transcription into ${languageName} (${languageCode}).

IMPORTANT REQUIREMENTS:
1. Maintain the exact same structure with timestamps
2. Preserve all technical and medical terminology accurately
3. Use natural, fluent ${languageName} while maintaining technical accuracy
4. Do NOT translate proper nouns (names, places, brands) unless they have established ${languageName} equivalents
5. Return the translation in EXACTLY the same format with timestamps

ENGLISH TRANSCRIPTION (with timestamps):
${segmentFormat}

Return the translation in the same segmented format:
[start-end] translated_text
[start-end] translated_text
etc.

Return ONLY the translated segments with timestamps, no additional commentary.`
  }

  return `You are an expert translator specializing in medical and technical content. Translate the following English transcription into ${languageName} (${languageCode}).

IMPORTANT REQUIREMENTS:
1. Maintain the exact same structure and timestamps as the original
2. Preserve all technical and medical terminology accurately
3. Keep formatting, punctuation, and structure identical
4. Use natural, fluent ${languageName} while maintaining technical accuracy
5. Do NOT translate proper nouns (names, places, brands) unless they have established ${languageName} equivalents

TRANSCRIPTION TO TRANSLATE:
${originalText}

Return ONLY the translated text with the same structure and timestamps preserved. Return ONLY the translation, no additional commentary.`
}

