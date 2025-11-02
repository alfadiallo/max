import { createClient } from '@/lib/supabase/server'
import { Anthropic } from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { transcriptionId } = await request.json()

    if (!transcriptionId) {
      return Response.json({ success: false, error: 'transcription_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the final version of the transcription
    const { data: transcription, error: transError } = await supabase
      .from('max_transcriptions')
      .select('id, final_version_id, raw_text, json_with_timestamps')
      .eq('id', transcriptionId)
      .single()

    if (transError || !transcription) {
      return Response.json({ success: false, error: 'Transcription not found' }, { status: 404 })
    }

    // Check if final_version_id is undefined (not set at all)
    if (transcription.final_version_id === undefined) {
      return Response.json({ 
        success: false, 
        error: 'No final version set. Please finalize a transcription version first.' 
      }, { status: 400 })
    }

    let finalVersion: any
    let finalVersionId: string

    // Handle different cases for final version
    if (transcription.final_version_id === null) {
      // T-1 (raw Whisper output) is the final version
      finalVersion = {
        id: `t1-${transcription.id}`,
        edited_text: transcription.raw_text,
        json_with_timestamps: transcription.json_with_timestamps
      }
      finalVersionId = `t1-${transcription.id}`
    } else {
      // A specific version (H-1, H-2, etc.) is the final version
      const { data, error: finalError } = await supabase
        .from('max_transcription_versions')
        .select('id, edited_text, json_with_timestamps')
        .eq('id', transcription.final_version_id)
        .single()

      if (finalError || !data) {
        return Response.json({ success: false, error: 'Final version not found' }, { status: 404 })
      }

      finalVersion = data
      finalVersionId = transcription.final_version_id
    }

    // Check if already sent to Insight
    const { data: existing } = await supabase
      .from('insight_transcripts')
      .select('id')
      .eq('transcription_id', transcriptionId)
      .single()

    if (existing) {
      return Response.json({ 
        success: false, 
        error: 'This transcript has already been sent to Insight',
        data: { existingId: existing.id }
      }, { status: 400 })
    }

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Create Insight transcript (clone from final version)
    const { data: insightTranscript, error: createError } = await supabase
      .from('insight_transcripts')
      .insert({
        transcription_id: transcriptionId,
        source_final_version_id: transcription.final_version_id === null ? null : transcription.final_version_id,
        source_is_t1: transcription.final_version_id === null,
        text: finalVersion.edited_text,
        json_with_timestamps: finalVersion.json_with_timestamps,
        edited_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating insight transcript:', createError)
      return Response.json({ success: false, error: createError.message }, { status: 500 })
    }

    // Create pipeline status
    const { error: pipelineError } = await supabase
      .from('insight_pipeline_status')
      .insert({
        transcription_id: transcriptionId,
        current_stage: 'metadata_extraction',
        status: 'processing',
        metadata_extraction_started_at: new Date().toISOString()
      })

    if (pipelineError) {
      console.error('Error creating pipeline status:', pipelineError)
      // Don't fail the whole operation, but log it
    }

    // Start metadata extraction asynchronously
    // We'll do this in the background to return quickly
    const anthropic = new Anthropic()
    
    // Load the metadata extraction rulebook
    // For now, we'll pass the rulebook as context in the API call
    // In production, this should be loaded from a separate file or database
    
    const extractionPrompt = `You are extracting metadata from a dental/medical transcript for the Insight learning management system.

METADATA EXTRACTION RULEBOOK:

1. learning_objectives: What students can DO after consuming this content (action verbs, measurable, maximum 8)
   Example: "Identify clinical indicators for case selection"
   
2. procedures_discussed: Clinical procedures explicitly mentioned or demonstrated (lowercase_underscores, canonical names only)
   Example: ["tissue_contouring", "direct_bonding"]
   
3. products_or_tools: Software/hardware/materials featured (PascalCase, preserve branding)
   Example: ["Exocad", "iTero Element", "Composite Resin"]
   
4. clinical_domain: Specialty areas (>20% of content focus, maximum 3)
   Example: ["Anterior Aesthetics", "Digital Dentistry"]
   
5. key_concepts: Core ideas/principles explained (nouns, reusable frameworks, maximum 6)
   Example: ["Tissue dynamics in restorative cases", "Esthetic principles and proportions"]
   
6. target_audience: Professional roles for whom content is suitable (Title Case)
   Example: ["Dentist", "Dental Assistant"]
   
7. keywords: Searchable terms (8-15 keywords, medical + common terminology)
   Example: ["smile design", "bonding", "composite", "Exocad"]

IMPORTANT RULES:
- Be specific, not vague
- Use canonical tag values from the Tag Dictionary
- Err toward including rather than excluding (admin can trim)
- Only tag procedures if discussed >30 seconds
- If ambiguity: flag it in the flags array

TRANSCRIPT TO EXTRACT FROM:
${finalVersion.edited_text}

Extract metadata and return ONLY a JSON object with this exact structure:
{
  "learning_objectives": ["string array"],
  "procedures_discussed": ["string array"],
  "products_or_tools": ["string array"],
  "clinical_domain": ["string array"],
  "key_concepts": ["string array"],
  "target_audience": ["string array"],
  "keywords": ["string array"],
  "flags": [{"field": "string", "issue": "string", "recommendation": "string"}]
}`

    // Call Claude for metadata extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: extractionPrompt
      }]
    })

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const metadataMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (!metadataMatch) {
      console.error('Failed to parse metadata from Claude:', responseText)
      // Still succeed, but mark as error
      await supabase
        .from('insight_pipeline_status')
        .update({
          status: 'error',
          error_stage: 'metadata_extraction',
          error_message: 'Failed to parse metadata from Claude'
        })
        .eq('transcription_id', transcriptionId)
      
      return Response.json({ 
        success: true, 
        message: 'Transcript sent to Insight, but metadata extraction failed. Please retry.',
        insightTranscriptId: insightTranscript.id
      })
    }

    let extractedMetadata
    try {
      extractedMetadata = JSON.parse(metadataMatch[0])
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return Response.json({ 
        success: false, 
        error: 'Failed to parse extracted metadata' 
      }, { status: 500 })
    }

    // Store extracted metadata
    const { data: metadata, error: metadataError } = await supabase
      .from('insight_metadata')
      .insert({
        insight_transcript_id: insightTranscript.id,
        learning_objectives: extractedMetadata.learning_objectives || [],
        procedures_discussed: extractedMetadata.procedures_discussed || [],
        products_or_tools: extractedMetadata.products_or_tools || [],
        clinical_domain: extractedMetadata.clinical_domain || [],
        key_concepts: extractedMetadata.key_concepts || [],
        target_audience: extractedMetadata.target_audience || [],
        keywords: extractedMetadata.keywords || [],
        flags: extractedMetadata.flags || [],
        extracted_by: user.id,
        review_status: extractedMetadata.flags && extractedMetadata.flags.length > 0 ? 'needs_revision' : 'pending'
      })
      .select()
      .single()

    if (metadataError) {
      console.error('Error storing metadata:', metadataError)
      return Response.json({ 
        success: false, 
        error: metadataError.message 
      }, { status: 500 })
    }

    // Update tags from metadata
    const tagInserts: Array<{ insight_transcript_id: string; tag_type: string; tag_value: string }> = []
    if (extractedMetadata.procedures_discussed) {
      extractedMetadata.procedures_discussed.forEach((tag: string) => {
        tagInserts.push({
          insight_transcript_id: insightTranscript.id,
          tag_type: 'procedure',
          tag_value: tag
        })
      })
    }
    if (extractedMetadata.products_or_tools) {
      extractedMetadata.products_or_tools.forEach((tag: string) => {
        tagInserts.push({
          insight_transcript_id: insightTranscript.id,
          tag_type: 'tool',
          tag_value: tag
        })
      })
    }
    if (extractedMetadata.target_audience) {
      extractedMetadata.target_audience.forEach((tag: string) => {
        tagInserts.push({
          insight_transcript_id: insightTranscript.id,
          tag_type: 'audience',
          tag_value: tag
        })
      })
    }
    if (extractedMetadata.clinical_domain) {
      extractedMetadata.clinical_domain.forEach((tag: string) => {
        tagInserts.push({
          insight_transcript_id: insightTranscript.id,
          tag_type: 'domain',
          tag_value: tag
        })
      })
    }

    if (tagInserts.length > 0) {
      const { error: tagsError } = await supabase
        .from('insight_tags')
        .insert(tagInserts)

      if (tagsError) {
        console.error('Error creating tags:', tagsError)
        // Don't fail, just log
      }
    }

    // Update pipeline status
    await supabase
      .from('insight_pipeline_status')
      .update({
        current_stage: 'in_review',
        status: 'complete',
        metadata_extraction_completed_at: new Date().toISOString()
      })
      .eq('transcription_id', transcriptionId)

    // Update transcript status
    await supabase
      .from('insight_transcripts')
      .update({
        status: 'extracted'
      })
      .eq('id', insightTranscript.id)

    return Response.json({
      success: true,
      message: 'Transcript sent to Insight and metadata extracted',
      data: {
        insightTranscriptId: insightTranscript.id,
        metadataId: metadata.id,
        hasFlags: extractedMetadata.flags && extractedMetadata.flags.length > 0,
        tagCount: tagInserts.length
      }
    })

  } catch (error: any) {
    console.error('Error in send-to-brain:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

// GET handler to check if transcription has been sent to Insight
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptionId = searchParams.get('transcription_id')

    if (!transcriptionId) {
      return Response.json({ success: false, error: 'transcription_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('insight_transcripts')
      .select('id, status, created_at')
      .eq('transcription_id', transcriptionId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data || null
    })

  } catch (error: any) {
    console.error('Error checking Insight status:', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
