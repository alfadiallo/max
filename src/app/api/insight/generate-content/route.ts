import { createClient } from '@/lib/supabase/server'
import { Anthropic } from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { transcriptionId } = await request.json()

    if (!transcriptionId) {
      return Response.json({ success: false, error: 'transcription_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const anthropic = new Anthropic()

    // Get the Insight transcript and metadata
    const { data: insightTranscript, error: transcriptError } = await supabase
      .from('insight_transcripts')
      .select('id, text, json_with_timestamps')
      .eq('transcription_id', transcriptionId)
      .single()

    if (transcriptError || !insightTranscript) {
      return Response.json({ success: false, error: 'Insight transcript not found' }, { status: 404 })
    }

    // Get metadata
    const { data: metadata } = await supabase
      .from('insight_metadata')
      .select('*')
      .eq('insight_transcript_id', insightTranscript.id)
      .single()

    if (!metadata) {
      return Response.json({ success: false, error: 'Metadata not found. Please ensure metadata has been extracted.' }, { status: 400 })
    }

    // Get chunks to inform content generation
    const { data: chunks } = await supabase
      .from('insight_chunks')
      .select('id, chunk_number, text, timestamp_start, timestamp_end, semantic_section')
      .eq('insight_transcript_id', insightTranscript.id)
      .order('chunk_number', { ascending: true })

    // Determine output volume based on transcript length
    const wordCount = insightTranscript.text.split(' ').length
    let outputPlan: any = {}

    if (wordCount < 3000) {
      // Small transcript: 1 email, 2 posts
      outputPlan = { emails: 1, posts: 2, blog: false, clips: 1 }
    } else if (wordCount < 5500) {
      // Medium transcript: 3 emails, 3 posts, blog outline
      outputPlan = { emails: 3, posts: 3, blog: 'outline', clips: 2 }
    } else {
      // Large transcript: 3 emails, 5 posts, full blog, 3 clips
      outputPlan = { emails: 3, posts: 5, blog: 'full', clips: 3 }
    }

    // Generate content using Claude
    const contentPrompt = `You are generating marketing content from an educational dental transcript.

SOURCE TRANSCRIPT METADATA:
- Learning Objectives: ${metadata.learning_objectives.join(', ')}
- Procedures: ${metadata.procedures_discussed.join(', ')}
- Tools: ${metadata.products_or_tools.join(', ')}
- Clinical Domains: ${metadata.clinical_domain.join(', ')}
- Target Audiences: ${metadata.target_audience.join(', ')}

TRANSCRIPT WORD COUNT: ${wordCount}

Please generate ${outputPlan.emails} EMAIL VARIANT(S) targeting different audiences. For each email:
- Subject line (compelling, benefit-focused)
- Body (200-250 words, action-oriented)
- Call-to-action (clear next step)

Please generate ${outputPlan.posts} LINKEDIN/SOCIAL POSTS. For each post:
- Post text (150 words max for LinkedIn)
- Suggested format/style
- Key takeaway

${outputPlan.blog ? `Please generate a BLOG ARTICLE ${outputPlan.blog === 'outline' ? 'OUTLINE' : 'DRAFT'}:` : ''}
${outputPlan.blog ? `- Structure (introduction, sections, conclusion)` : ''}
${outputPlan.blog ? `- Section titles` : ''}
${outputPlan.blog ? `- Estimated word count` : ''}

Please identify ${outputPlan.clips} VIDEO CLIP SEGMENTS:
- Timestamp range
- Clip title
- Suggested visual approach
- Key message

Return ONLY a JSON object with this structure:
{
  "emails": [{
    "audience": "string",
    "subject": "string",
    "body": "string",
    "cta": "string"
  }],
  "posts": [{
    "style": "string",
    "text": "string",
    "format": "string"
  }],
  "blog": {
    "title": "string",
    "structure": "object",
    "estimated_words": "number"
  },
  "clips": [{
    "timestamp_start": "string",
    "timestamp_end": "string",
    "title": "string",
    "visual_approach": "string",
    "key_message": "string"
  }]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: contentPrompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const contentMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (!contentMatch) {
      console.error('Failed to parse content from Claude:', responseText)
      return Response.json({ 
        success: false, 
        error: 'Failed to parse generated content from Claude' 
      }, { status: 500 })
    }

    let generatedContent
    try {
      generatedContent = JSON.parse(contentMatch[0])
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return Response.json({ 
        success: false, 
        error: 'Failed to parse generated content' 
      }, { status: 500 })
    }

    // Store generated content in database
    const inserts = []

    // Store emails
    if (generatedContent.emails) {
      generatedContent.emails.forEach((email: any) => {
        inserts.push({
          transcription_id: transcriptionId,
          output_type: 'email',
          audience: email.audience,
          title: email.subject,
          content: `${email.body}\n\n[CTA: ${email.cta}]`,
          status: 'draft',
          created_at: new Date().toISOString()
        })
      })
    }

    // Store posts
    if (generatedContent.posts) {
      generatedContent.posts.forEach((post: any) => {
        inserts.push({
          transcription_id: transcriptionId,
          output_type: 'linkedin',
          audience: null,
          title: post.style,
          content: post.text,
          status: 'draft',
          created_at: new Date().toISOString()
        })
      })
    }

    // Store blog
    if (generatedContent.blog) {
      inserts.push({
        transcription_id: transcriptionId,
        output_type: 'blog',
        audience: null,
        title: generatedContent.blog.title,
        content: JSON.stringify(generatedContent.blog.structure),
        status: 'draft',
        created_at: new Date().toISOString()
      })
    }

    // Store video clip specs
    if (generatedContent.clips) {
      generatedContent.clips.forEach((clip: any) => {
        inserts.push({
          transcription_id: transcriptionId,
          output_type: 'video_clip',
          audience: null,
          title: clip.title,
          content: JSON.stringify({
            timestamp_start: clip.timestamp_start,
            timestamp_end: clip.timestamp_end,
            visual_approach: clip.visual_approach,
            key_message: clip.key_message
          }),
          status: 'draft',
          created_at: new Date().toISOString()
        })
      })
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('insight_content_outputs')
        .insert(inserts)

      if (insertError) {
        console.error('Error storing content outputs:', insertError)
        return Response.json({ 
          success: false, 
          error: insertError.message 
        }, { status: 500 })
      }
    }

    // Update pipeline status
    await supabase
      .from('insight_pipeline_status')
      .update({
        current_stage: 'in_review',
        content_generation_completed_at: new Date().toISOString()
      })
      .eq('transcription_id', transcriptionId)

    return Response.json({
      success: true,
      message: `Content generation complete! Created ${inserts.length} content pieces.`,
      data: {
        emailCount: generatedContent.emails?.length || 0,
        postCount: generatedContent.posts?.length || 0,
        blogGenerated: !!generatedContent.blog,
        clipCount: generatedContent.clips?.length || 0,
        totalOutputs: inserts.length
      }
    })

  } catch (error: any) {
    console.error('Error in content generation:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

