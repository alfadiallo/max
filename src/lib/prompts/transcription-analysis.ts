/**
 * Claude Analysis Prompts for Transcription Analysis
 * These prompts guide Claude to analyze transcriptions for metadata extraction
 */

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert content analyst specializing in video transcription analysis. Your role is to extract structured metadata from video transcriptions to help with content organization, search, and analytics.`

export const ANALYSIS_USER_PROMPT = (transcript: string): string => {
  return `Analyze this video transcription and provide structured metadata:

TRANSCRIPTION:
${transcript}

Please analyze and provide:

1. **CONTENT_TYPE**: The primary category (e.g., "Tutorial", "Presentation", "Interview", "Marketing", "Entertainment", "Educational", "Product Demo", "Meeting", "Training")
   
2. **THEMATIC_TAGS**: An array of 3-5 key themes or topics (e.g., ["Healthcare", "Emergency Medicine", "Continuing Education"])
   
3. **KEY_CONCEPTS**: An array of the main concepts covered (e.g., ["CT Utilization", "Clinical Decision Making", "Patient Care"])
   
4. **TARGET_AUDIENCE**: Who is the primary audience? (e.g., "Healthcare Providers", "Emergency Physicians", "Medical Students", "General Public")
   
5. **TONE**: The overall tone and style (e.g., "Professional", "Casual", "Technical", "Conversational", "Educational")
   
6. **DURATION_CATEGORY**: How long is this content? (e.g., "Short (under 5 min)", "Medium (5-15 min)", "Long (15+ min)")
   
7. **LANGUAGE_STYLE**: The complexity of language used (e.g., "Technical/Jargon-Heavy", "Moderate", "Simple/Layperson-Friendly")

Return your analysis as a JSON object in this exact format:
{
  "contentType": "string",
  "thematicTags": ["string", "string"],
  "keyConcepts": ["string", "string"],
  "targetAudience": "string",
  "tone": "string",
  "durationCategory": "string",
  "languageStyle": "string",
  "summary": "A brief 2-3 sentence summary of the content"
}

Important: Return ONLY valid JSON, no additional text.`
}

export interface AnalysisResult {
  contentType: string
  thematicTags: string[]
  keyConcepts: string[]
  targetAudience: string
  tone: string
  durationCategory: string
  languageStyle: string
  summary: string
}












