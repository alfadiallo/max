export const TRANSLATION_USER_PROMPT = (originalText: string, targetLanguage: string, languageCode: string): string => {
  const languageNames: Record<string, string> = {
    'sp': 'Spanish',
    'pr': 'Portuguese',
    'ar': 'Arabic',
    'fr': 'French',
    'ge': 'German',
    'it': 'Italian',
    'ma': 'Mandarin'
  }

  const languageName = languageNames[languageCode] || targetLanguage

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

