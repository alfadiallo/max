# Max RAG AI Guidance
## Claude & Gemini Integration Strategy

**Project:** Max RAG - Key Elements Knowledge Platform  
**Domain:** www.max.keyelements.co  
**Last Updated:** 2025-11-07

---

## Overview

Max RAG uses AI models for automated content processing, entity extraction, metadata generation, and user query responses. This document defines which AI models to use, when, and how.

---

## AI Model Selection Matrix

### Primary Model: Claude Sonnet 4

**Model:** `claude-sonnet-4-20250514`  
**Context Window:** 200K tokens  
**Primary Use Cases:**

1. **Entity Extraction**
2. **Metadata Generation** (relevance scoring per profile type)
3. **Knowledge Graph Relationship Building**
4. **Controlled Vocabulary Management**
5. **User Query Understanding**
6. **Response Generation** (all user-facing content)
7. **Cross-lecture Concept Linking**

**Why Claude:**
- Superior structured output reliability (JSON consistency)
- Better adherence to complex tagging instructions
- Higher quality for user-facing response generation
- 200K context sufficient for per-lecture processing (~15-30K tokens per lecture)
- More consistent quality for production deployment

### Secondary Model: Gemini 2.0 Flash

**Model:** `gemini-2.0-flash`  
**Context Window:** 2M tokens  
**Use Cases:**

1. **Very Long Lectures** (>150K tokens in single transcript)
2. **Bulk Cross-Lecture Analysis** (analyzing multiple lectures simultaneously)
3. **Cost Optimization** (for batch processing when speed matters)

**Why Gemini:**
- Massive context window for edge cases
- Faster inference for large batches
- Better cost-performance for bulk operations
- Fallback when Claude context limit approached

### Model Routing Logic

```typescript
async function selectModel(transcript: Transcript): Promise<AIModel> {
  const tokenCount = estimateTokens(transcript.text);
  
  if (tokenCount > 150000) {
    console.log(`Large transcript (${tokenCount} tokens) - routing to Gemini`);
    return {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      reason: 'Exceeds Claude context comfort zone'
    };
  }
  
  return {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    reason: 'Standard processing - optimal for quality'
  };
}

// ALWAYS use Claude for user-facing responses regardless of extraction model
async function generateUserResponse(query: string, context: any) {
  return await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    // ... response generation
  });
}
```

---

## Content Processing Workflows

### 1. Transcript Ingestion & Analysis

**Trigger:** New transcript uploaded  
**Model:** Claude Sonnet 4 (or Gemini if >150K tokens)

**Process:**

```typescript
interface TranscriptProcessing {
  input: {
    transcript: string;
    segments: Array<{
      text: string;
      startTime: string;
      endTime: string;
      sequenceNumber: number;
    }>;
    metadata: {
      title: string;
      date: Date;
      speaker: string;
      sourceType: string;
      zoomUrl: string;
    };
  };
  
  steps: [
    '1. Segment-level analysis',
    '2. Entity extraction',
    '3. Relevance scoring',
    '4. Vocabulary updates',
    '5. Graph relationship building'
  ];
}
```

**Claude Prompt Structure:**

```markdown
You are processing a dental education transcript segment for the Max RAG knowledge platform.

SEGMENT TEXT:
"${segmentText}"

SOURCE CONTEXT:
- Lecture: ${lectureTitle}
- Speaker: ${speaker}
- Date: ${date}
- Timestamp: ${startTime} - ${endTime}

YOUR TASKS:

1. PROFILE RELEVANCE SCORING (0-100)
Analyze how useful this segment is for each user profile:

DENTIST (Clinical decision-maker):
- Score HIGH (70-100): Clinical technique, treatment planning, material selection, diagnosis, evidence-based rationale
- Score MEDIUM (40-69): Team communication, workflow optimization, case presentation
- Score LOW (0-39): Administrative tasks, patient scheduling, marketing

DENTAL_ASSISTANT (Chairside support):
- Score HIGH (70-100): Setup procedures, instrument preparation, 4-handed dentistry, material handling, patient positioning
- Score MEDIUM (40-69): Treatment flow, doctor preferences, communication timing
- Score LOW (0-39): Treatment philosophy, diagnosis, case selection

HYGIENIST (Prevention specialist):
- Score HIGH (70-100): Periodontal health, preventive protocols, patient education, maintenance after restorations
- Score MEDIUM (40-69): Oral health implications of procedures, home care instructions
- Score LOW (0-39): Restorative techniques, impression procedures, crown prep

TREATMENT_COORDINATOR (Case presentation):
- Score HIGH (70-100): Patient communication scripts, case acceptance strategies, financial discussions, overcoming objections
- Score MEDIUM (40-69): Treatment benefits, expected outcomes, timeline explanations
- Score LOW (0-39): Technical clinical details, instrument names, step-by-step procedures

2. CONTENT CLASSIFICATION
- content_type: Choose ONE from [procedure, philosophy, case_study, troubleshooting, patient_communication, team_coordination]
- clinical_complexity: Choose ONE from [beginner, intermediate, advanced]
- primary_focus: The main topic being discussed

3. ENTITY EXTRACTION
Extract and categorize all mentions:
- procedures: Clinical procedures (e.g., "crown preparation", "impression taking")
- concepts: Educational concepts (e.g., "margin design", "occlusal clearance")
- anatomy: Anatomical structures (e.g., "gingival margin", "incisal edge")
- materials: Dental materials (e.g., "zirconia", "retraction cord")
- tools: Instruments/equipment (e.g., "high-speed handpiece", "depth cutter")
- key_elements_terms: Key Elements-specific methodology terms

4. TOPIC TAGGING
Identify 3-7 relevant topics from the content. Use specific, searchable terms.

RETURN FORMAT (valid JSON only):
{
  "relevance": {
    "dentist": 85,
    "dental_assistant": 60,
    "hygienist": 10,
    "treatment_coordinator": 30
  },
  "content_type": "procedure",
  "clinical_complexity": "intermediate",
  "primary_focus": "crown preparation technique",
  "topics": ["crown_preparation", "impression_taking", "tissue_retraction", "margin_placement"],
  "entities": {
    "procedures": ["crown preparation", "impression taking"],
    "concepts": ["margin placement", "tissue retraction", "occlusal reduction"],
    "anatomy": ["gingival margin", "preparation finish line"],
    "materials": ["retraction cord", "hemostatic agent"],
    "tools": ["high-speed handpiece", "depth cutter"],
    "key_elements_terms": ["facial-driven workflow"]
  },
  "confidence_score": 0.92
}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no preamble.
```

---

### 2. Entity Extraction & Knowledge Graph Building

**Model:** Claude Sonnet 4  
**Purpose:** Build interconnected knowledge graph from extracted entities

**Relationship Types to Identify:**

```typescript
enum RelationshipType {
  PREREQUISITE_OF = 'PREREQUISITE_OF',      // Knowledge dependency
  RELATED_TO = 'RELATED_TO',                // Conceptual association
  USED_IN = 'USED_IN',                      // Tools/materials in procedures
  PART_OF = 'PART_OF',                      // Hierarchical relationship
  AFFECTS = 'AFFECTS',                       // Cause-effect
  CONTRASTS_WITH = 'CONTRASTS_WITH',        // Comparative/alternative
  DEMONSTRATES = 'DEMONSTRATES',             // Segment shows concept
  EXPLAINS = 'EXPLAINS',                     // Segment defines concept
  MENTIONS = 'MENTIONS'                      // Passing reference
}
```

**Relationship Extraction Prompt:**

```markdown
You are analyzing dental education content to build a knowledge graph.

PREVIOUSLY EXTRACTED ENTITIES:
${JSON.stringify(entities)}

SEGMENT CONTEXT:
"${segmentText}"

TASK: Identify relationships between entities in this segment.

For each pair of entities that are related, determine:
1. Relationship type (from: PREREQUISITE_OF, RELATED_TO, USED_IN, PART_OF, AFFECTS, CONTRASTS_WITH, DEMONSTRATES, EXPLAINS, MENTIONS)
2. Relationship strength (0.0-1.0)
   - 1.0: Explicit, critical relationship
   - 0.7-0.9: Strong, clear relationship
   - 0.4-0.6: Moderate relationship
   - 0.1-0.3: Weak or passing mention
3. Directional context (source → target)

EXAMPLES:
- "retraction cord" USED_IN "impression taking" (strength: 0.95)
- "margin design" PREREQUISITE_OF "crown preparation" (strength: 0.9)
- "gingival health" AFFECTS "impression accuracy" (strength: 0.8)
- "zirconia" RELATED_TO "lithium disilicate" (strength: 0.6)

RETURN FORMAT (JSON array):
[
  {
    "source_entity": "retraction cord",
    "source_type": "materials",
    "target_entity": "impression taking",
    "target_type": "procedures",
    "relationship_type": "USED_IN",
    "strength": 0.95,
    "context": "Essential for tissue management during impression procedures"
  }
]

Focus on clinically meaningful relationships. Avoid trivial connections.
```

---

#### Background Worker Execution

> The “Push to Max RAG” button enqueues work in `rag_ingestion_queue`. A background worker drains this queue and performs the full RAG pipeline so search remains fresh without manual steps.

- **Runtime:** Supabase Edge Function on a cron (every 5 minutes) or an Inngest job. Always invoked with the service-role key.
- **Locking:** `FOR UPDATE SKIP LOCKED` on `status='queued'` records, batch size 10. Each job is immediately updated to `status='processing'`.
- **Data load:** Retrieve `transcript_segments` (fall back to 3K-token sliding window if missing) plus transcript metadata from `transcript_versions`, `content_sources`, and `max_transcriptions`.
- **AI calls:**  
  - Claude Sonnet 4 — entity extraction, relevance scoring, knowledge-graph relationships.  
  - OpenAI embeddings — one vector per segment.  
  - Gemini only if transcript segment exceeds Claude context safety.
- **Writes:**  
  - `content_segments` — segment text, embedding, timestamps, source metadata.  
  - `segment_relevance` — persona scores, content type, topics, confidence.  
  - `kg_entities` / `kg_relationships` / `segment_entities` — upsert canonical entities and relationship edges.
- **Summary envelope:** `result_summary` JSON with counts (segments, entities, relationships), processing duration, token usage, and warnings (low confidence <0.6, hallucination rejections).
- **Error handling:** Exponential backoff (retry up to 3 times). On persistent failure, set `status='error'`, populate `error_detail`, and leave for manual review. Retries sleep 60s, doubling each attempt.
- **Observability:** Structured logs (job id, transcript, duration, tokens) and metrics emitted for dashboards (segments/hour, queue depth, failure rate).
- **Future hooks:**  
  - Emit review tasks for low-confidence segments.  
  - Slack/email notifications when jobs fail permanently.  
  - Optional automatic requeue if new transcript version supersedes a processed one.

---

### 3. Controlled Vocabulary Management

**Model:** Claude Sonnet 4  
**Purpose:** Build and maintain canonical terminology

**Initial Vocabulary Extraction (Run Once on First Batch):**

```markdown
Analyze the provided dental education transcripts to create a controlled vocabulary.

TRANSCRIPTS:
${transcriptCollection}

TASK: Extract canonical terminology across categories.

CATEGORIES:
1. PROCEDURES: All clinical procedures
2. CONCEPTS: Core educational concepts
3. ANATOMY: Anatomical structures
4. MATERIALS: Dental materials and products
5. TOOLS: Instruments and equipment
6. KEY_ELEMENTS_TERMS: Methodology-specific terminology

For each term, provide:
- canonical_name: The preferred term to use
- aliases: Common synonyms and variations
- category: Which category it belongs to
- frequency: How often it appears across transcripts
- definition: Brief clinical definition (if clear from context)

RETURN FORMAT (JSON):
{
  "procedures": [
    {
      "canonical_name": "crown preparation",
      "aliases": ["crown prep", "tooth preparation for crown", "preparation for full coverage restoration"],
      "frequency": 47,
      "definition": "Reduction of tooth structure to receive a full-coverage restoration"
    }
  ],
  "concepts": [...],
  "anatomy": [...],
  "materials": [...],
  "tools": [...],
  "key_elements_terms": [...]
}

Prioritize terms that appear in multiple transcripts. Group synonyms under single canonical term.
```

**Ongoing Vocabulary Updates (Per New Transcript):**

```markdown
Compare newly extracted entities against existing controlled vocabulary.

EXISTING VOCABULARY:
${existingVocabulary}

NEW ENTITIES FROM LATEST TRANSCRIPT:
${newEntities}

TASK: Identify vocabulary updates needed.

For each new entity:
1. MATCH: Does it match an existing canonical term or alias?
2. NEW: Is it a genuinely new term that should be added?
3. ALIAS: Is it a synonym of an existing term that should be added as alias?
4. IGNORE: Is it too context-specific or not clinically relevant?

RETURN FORMAT (JSON):
{
  "matches": [
    {
      "new_entity": "crown prep",
      "matched_to": "crown preparation",
      "confidence": 0.95
    }
  ],
  "new_terms": [
    {
      "canonical_name": "facial-driven smile design",
      "category": "key_elements_terms",
      "suggested_aliases": ["FDSD", "facial-driven design"],
      "justification": "Key Elements methodology-specific term appearing in multiple contexts"
    }
  ],
  "new_aliases": [
    {
      "canonical_term": "impression taking",
      "new_alias": "final impression procedure",
      "confidence": 0.88
    }
  ],
  "ignored": ["that thing", "the stuff"] // Too vague
}
```

---

### 4. User Query Processing

**Model:** Claude Sonnet 4 (ALWAYS)  
**Purpose:** Understand user intent and generate persona-appropriate responses

**Query Understanding Phase:**

```markdown
Analyze this user query to determine search strategy and intent.

USER QUERY:
"${userQuery}"

USER PROFILE:
- Role: ${userProfile.role}
- External Type: ${userProfile.externalType}
- Experience Level: ${userProfile.experienceLevel}
- Specializations: ${userProfile.specializations}

TASK: Extract query characteristics.

1. INTENT CLASSIFICATION:
   - seeking_definition: User wants to understand a concept
   - seeking_procedure: User wants step-by-step clinical guidance
   - seeking_troubleshooting: User has a problem to solve
   - seeking_communication: User wants patient/team communication guidance
   - seeking_comparison: User wants to compare options
   - seeking_example: User wants case studies or demonstrations

2. KEY ENTITIES:
   Extract procedures, concepts, anatomy, materials mentioned in query

3. IMPLICIT NEEDS:
   Based on user role, what related information might they need?
   Example: Dentist asking about crown prep might also need impression technique

4. SEARCH STRATEGY:
   - primary_keywords: Most important search terms
   - expanded_concepts: Related concepts to include via graph traversal
   - relevance_threshold: Minimum relevance score for results (based on role)

RETURN FORMAT (JSON):
{
  "intent": "seeking_procedure",
  "key_entities": ["crown preparation", "anterior teeth"],
  "implicit_needs": ["impression technique", "temporary fabrication"],
  "search_strategy": {
    "primary_keywords": ["crown preparation", "anterior"],
    "expanded_concepts": ["margin design", "tissue management", "esthetic considerations"],
    "relevance_threshold": 0.7
  },
  "response_format_hint": "step_by_step_protocol"
}
```

**Response Generation Phase:**

```markdown
Generate a response to the user's query based on retrieved content.

USER QUERY:
"${userQuery}"

USER PROFILE:
- Role: ${userProfile.externalType} (${userProfile.experienceLevel})
- Context: ${userProfile.specializations}

RETRIEVED CONTENT:
${relevantSegments.map(s => `
[${s.source_title} - ${s.timestamp}]
${s.text}
`).join('\n\n')}

KNOWLEDGE GRAPH CONTEXT:
- Related concepts: ${relatedConcepts}
- Prerequisites: ${prerequisites}
- Related procedures: ${relatedProcedures}

RESPONSE GUIDELINES BASED ON USER ROLE:

${userProfile.externalType === 'dentist' ? `
DENTIST RESPONSE STYLE:
- Focus: Clinical technique, evidence-based rationale, decision-making
- Format: Structured protocol with clear steps
- Include: Material science when relevant, patient safety considerations
- Tone: Professional, precise, assumes clinical knowledge
- Add: Video timestamps for demonstration
` : ''}

${userProfile.externalType === 'dental_assistant' ? `
DENTAL ASSISTANT RESPONSE STYLE:
- Focus: Setup procedures, chairside efficiency, material preparation
- Format: Checklist-oriented, action-focused, time-sequenced
- Include: What to have ready, when to hand off, how to anticipate needs
- Tone: Clear, procedural, team-oriented
- Add: Setup checklists, timing cues
` : ''}

${userProfile.externalType === 'hygienist' ? `
HYGIENIST RESPONSE STYLE:
- Focus: Periodontal implications, patient education, preventive protocols
- Format: Patient-education ready language
- Include: Home care instructions, maintenance protocols, what to look for
- Tone: Educational, patient-centered, preventive
- Add: Patient communication scripts
` : ''}

${userProfile.externalType === 'treatment_coordinator' ? `
TREATMENT COORDINATOR RESPONSE STYLE:
- Focus: Case presentation strategies, patient communication, overcoming objections
- Format: Conversation scripts and talking points
- Include: Value framing, expected outcomes, addressing concerns
- Tone: Conversational, persuasive, patient-focused
- Add: Before/after cases, testimonial references
` : ''}

RESPONSE STRUCTURE:
1. Direct answer to the query (2-3 sentences)
2. Detailed explanation appropriate for role
3. Related concepts they should know
4. Video references with timestamps (if applicable)
5. Downloadable resources (if applicable)
6. Related topics for further exploration

FORMATTING:
- Use clear headers (sentence case, not title case)
- Bold key terms sparingly
- Use bullet points for lists
- Include emoji icons subtly (🦷 🔧 💬 📹) for visual scanning
- Keep paragraphs short (3-4 lines max)

CRITICAL: 
- Match the user's experience level (don't oversimplify for advanced users)
- Stay within scope of their role (don't give dentist-level clinical guidance to assistants)
- Reference video timestamps when relevant segments exist
- If query cannot be fully answered from available content, say so clearly

Generate response now.
```

---

## Response Quality Standards

### All Responses Must:

1. **Be Role-Appropriate**
   - Dentist: Clinical depth, decision-making focus
   - Assistant: Procedural clarity, timing emphasis
   - Hygienist: Patient education angle, prevention focus
   - Coordinator: Communication scripts, value framing

2. **Include Provenance**
   - Reference source lectures by title and date
   - Include video timestamps when demonstrating techniques
   - Link to related concepts in knowledge graph

3. **Be Actionable**
   - Give clear next steps
   - Provide downloadable resources when available
   - Suggest related queries for deeper learning

4. **Maintain Clinical Accuracy**
   - Never contradict Dr. Soto's teaching
   - Flag when insufficient information exists
   - Escalate ambiguous clinical questions (Phase 2 feature)

---

## Error Handling & Fallbacks

### When Claude/Gemini Fails:

```typescript
interface AIFailureHandling {
  scenarios: {
    json_parse_error: {
      action: 'Retry with stricter prompt emphasizing JSON-only output',
      max_retries: 2,
      fallback: 'Log error, mark segment for manual review, continue processing'
    },
    
    context_overflow: {
      action: 'Switch to Gemini 2.0 Flash',
      if_gemini_fails: 'Chunk transcript into smaller segments and process sequentially'
    },
    
    low_confidence_extraction: {
      action: 'Flag for human review',
      threshold: 0.6, // confidence_score below this triggers review
      continue_processing: true
    },
    
    rate_limit_hit: {
      action: 'Queue for retry with exponential backoff',
      max_wait: '5 minutes',
      notify_admin: true
    },
    
    hallucinated_entities: {
      detection: 'Cross-reference against controlled vocabulary',
      action: 'Reject entities not matching vocabulary OR existing in multiple segments',
      human_review: 'New entities appearing only once'
    }
  };
}
```

### Quality Assurance Checks:

```typescript
async function validateAIOutput(output: AIExtraction): Promise<ValidationResult> {
  const checks = {
    // Relevance scores must sum reasonably (not all 0 or all 100)
    relevance_distribution: 
      Object.values(output.relevance).some(r => r > 10) &&
      Object.values(output.relevance).some(r => r < 90),
    
    // At least one entity extracted (unless truly no clinical content)
    entities_present: 
      Object.values(output.entities).some(arr => arr.length > 0),
    
    // Content type is valid enum value
    valid_content_type: 
      ['procedure', 'philosophy', 'case_study', 'troubleshooting', 
       'patient_communication', 'team_coordination'].includes(output.content_type),
    
    // Confidence score reasonable
    reasonable_confidence: 
      output.confidence_score >= 0.3 && output.confidence_score <= 1.0,
    
    // Topics are specific (not too generic)
    specific_topics:
      output.topics.every(t => t.length > 3) && // No 1-2 char topics
      output.topics.length >= 2 // At least 2 topics
  };
  
  const passed = Object.values(checks).every(Boolean);
  
  return {
    valid: passed,
    failed_checks: Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check),
    requires_review: !passed || output.confidence_score < 0.6
  };
}
```

---

## Performance Optimization

### Batch Processing Strategy:

```typescript
interface BatchProcessingConfig {
  // Process multiple segments in parallel
  concurrent_segments: 5, // Process 5 segments simultaneously
  
  // Cache embedding generations
  cache_embeddings: true,
  embedding_cache_duration: '30 days',
  
  // Reuse entity extractions across similar segments
  similarity_threshold_for_cache: 0.95, // If segments are 95%+ similar, reuse extraction
  
  // Rate limiting
  max_requests_per_minute: {
    claude: 50,
    gemini: 60,
    openai_embeddings: 500
  }
}

// Batch segments for efficient processing
async function processBatch(segments: ContentSegment[]) {
  const batches = chunk(segments, 5); // Process 5 at a time
  
  for (const batch of batches) {
    await Promise.all(
      batch.map(segment => processSegmentWithRetry(segment))
    );
    
    // Rate limiting pause
    await sleep(1000); // 1 second between batches
  }
}
```

### Caching Strategy:

```typescript
interface CachingRules {
  // Cache entity extractions by content hash
  entity_cache: {
    key: 'sha256(segment_text)',
    ttl: '90 days',
    invalidate_on: 'vocabulary_update'
  },
  
  // Cache query embeddings
  query_embedding_cache: {
    key: 'normalized_query_text',
    ttl: '7 days'
  },
  
  // Cache graph traversal results for common paths
  graph_traversal_cache: {
    key: 'start_entity_id + relationship_types + depth',
    ttl: '24 hours',
    invalidate_on: 'new_content_published'
  }
}
```

---

## Monitoring & Observability

### Metrics to Track:

```typescript
interface AIMetrics {
  processing_metrics: {
    segments_processed_per_hour: number;
    average_processing_time_per_segment: number;
    claude_vs_gemini_usage_ratio: number;
    extraction_confidence_distribution: number[]; // Histogram
  },
  
  quality_metrics: {
    segments_requiring_human_review: number;
    entity_extraction_accuracy: number; // Validated against human reviews
    relevance_score_accuracy: number; // Validated against user engagement
    response_helpfulness_rating: number; // User feedback
  },
  
  cost_metrics: {
    total_tokens_processed: number;
    cost_per_segment: number;
    cost_per_user_query: number;
  },
  
  error_metrics: {
    json_parse_failures: number;
    context_overflow_incidents: number;
    rate_limit_hits: number;
    hallucination_detections: number;
  }
}
```

### Logging Requirements:

```typescript
// Log every AI interaction
interface AILog {
  timestamp: Date;
  model: 'claude-sonnet-4' | 'gemini-2.0-flash';
  operation: 'entity_extraction' | 'relevance_scoring' | 'vocabulary_update' | 'query_response';
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  confidence_score?: number;
  validation_passed: boolean;
  requires_review: boolean;
  error?: string;
}
```

---

## Model Update Strategy

### When to Upgrade Models:

1. **Claude Model Updates:**
   - Monitor Anthropic announcements for Claude 4.x updates
   - Test new models on sample transcripts before production switch
   - Compare quality metrics (extraction accuracy, response coherence)
   - Gradual rollout: 10% traffic → 50% → 100%

2. **Gemini Model Updates:**
   - Test for JSON reliability improvements
   - Validate entity extraction quality vs. Claude baseline
   - Cost-benefit analysis for bulk processing

3. **Prompt Engineering Iterations:**
   - Version control all prompts in `/prompts/` directory
   - A/B test prompt variations on sample data
   - Track quality metrics per prompt version
   - Roll back if quality degrades

---

## Security & Safety

### Content Safety Checks:

```typescript
async function contentSafetyCheck(segment: ContentSegment): Promise<SafetyResult> {
  // Check for PHI/PII accidentally in transcripts
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b.*\b(patient|client)\b/i, // Patient names
    /\b\d{10,}\b/ // Phone numbers
  ];
  
  const containsPII = piiPatterns.some(pattern => pattern.test(segment.text));
  
  if (containsPII) {
    return {
      safe: false,
      reason: 'Potential PHI/PII detected',
      action: 'FLAG_FOR_MANUAL_REVIEW'
    };
  }
  
  return { safe: true };
}
```

### API Key Management:

```typescript
// Never commit API keys
// Store in Supabase secrets or environment variables
interface APIKeys {
  ANTHROPIC_API_KEY: string; // From process.env
  GOOGLE_AI_API_KEY: string;
  OPENAI_API_KEY: string;
  
  // Rotate keys quarterly
  rotation_schedule: '90 days';
  
  // Use separate keys for dev/staging/prod
  environment_separation: true;
}
```

---

## Human-in-the-Loop (Phase 2)

### Review Dashboard Requirements:

```typescript
interface ReviewDashboard {
  pending_reviews: {
    low_confidence_extractions: ContentSegment[];
    new_vocabulary_terms: VocabularyProposal[];
    user_reported_issues: UserFeedback[];
  },
  
  review_actions: {
    approve_extraction: (segmentId: UUID) => void;
    override_relevance: (segmentId: UUID, newScores: RelevanceScores) => void;
    add_vocabulary_term: (term: VocabularyTerm) => void;
    merge_entities: (sourceId: UUID, targetId: UUID) => void;
  },
  
  analytics: {
    ai_accuracy_over_time: Chart;
    most_common_corrections: Report;
    vocabulary_growth_rate: Metric;
  }
}
```

---

## API Usage Guidelines

### Anthropic API (Claude):

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Standard extraction call
async function extractWithClaude(prompt: string, segmentText: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    temperature: 0.3, // Lower temperature for consistent extraction
    messages: [{
      role: 'user',
      content: prompt.replace('${segmentText}', segmentText)
    }]
  });
  
  const response = message.content[0].text;
  
  try {
    return JSON.parse(response);
  } catch (e) {
    // Retry with stricter prompt
    console.error('JSON parse failed, retrying...');
    return await retryWithStricterPrompt(prompt, segmentText);
  }
}
```

### Google AI API (Gemini):

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function extractWithGemini(prompt: string, segmentText: string) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json' // Force JSON output
    }
  });
  
  const result = await model.generateContent(
    prompt.replace('${segmentText}', segmentText)
  );
  
  return JSON.parse(result.response.text());
}
```

---

## Testing Strategy

### Unit Tests for AI Functions:

```typescript
describe('Entity Extraction', () => {
  test('extracts dental procedures correctly', async () => {
    const sampleSegment = `
      When doing crown preparation, start with occlusal reduction 
      using a depth cutter. Then move to axial reduction with a 
      chamfer bur, maintaining 6 degrees of taper.
    `;
    
    const result = await extractEntities(sampleSegment);
    
    expect(result.entities.procedures).toContain('crown preparation');
    expect(result.entities.tools).toContain('depth cutter');
    expect(result.entities.tools).toContain('chamfer bur');
    expect(result.entities.concepts).toContain('occlusal reduction');
  });
  
  test('assigns appropriate relevance scores', async () => {
    const clinicalSegment = `
      The preparation margin should be 0.5mm subgingival for 
      optimal esthetics in the anterior region.
    `;
    
    const result = await scoreRelevance(clinicalSegment);
    
    expect(result.relevance.dentist).toBeGreaterThan(80);
    expect(result.relevance.treatment_coordinator).toBeLessThan(30);
  });
});
```

### Integration Tests:

```typescript
describe('Full Processing Pipeline', () => {
  test('processes transcript end-to-end', async () => {
    const mockTranscript = loadFixture('sample_lecture.json');
    
    const result = await processTranscript(mockTranscript);
    
    expect(result.segments_processed).toBe(mockTranscript.segments.length);
    expect(result.entities_extracted).toBeGreaterThan(0);
    expect(result.graph_relationships_created).toBeGreaterThan(0);
    expect(result.validation_errors).toBe(0);
  });
});
```

---

## Appendix: Prompt Library

All production prompts stored in version control:

```
/prompts/
  /entity_extraction/
    v1.0_initial.md
    v1.1_improved_accuracy.md
    v2.0_multi_entity_types.md (current)
  /relevance_scoring/
    v1.0_initial.md
    v1.1_profile_specific.md (current)
  /vocabulary_management/
    v1.0_initial_extraction.md
    v1.1_incremental_updates.md (current)
  /query_processing/
    v1.0_simple_retrieval.md
    v2.0_graph_aware.md (current)
  /response_generation/
    dentist_v1.0.md (current)
    assistant_v1.0.md (current)
    hygienist_v1.0.md (current)
    coordinator_v1.0.md (current)
```

Each prompt file includes:
- Version number and date
- Use case description
- Expected input format
- Expected output format
- Quality benchmarks
- Known limitations

---

## Future AI Enhancements (Roadmap)

### Phase 3+:
- **Multimodal Processing:** Extract information from lecture slides/diagrams
- **Active Learning:** Use user feedback to improve relevance scoring
- **Personalized Responses:** Learn individual user preferences over time
- **Clinical Question Routing:** Detect questions requiring human expert review
- **Content Generation:** Auto-generate study guides, quizzes, protocols from knowledge graph
- **Translation Support:** Multilingual entity extraction and response generation

---

**Document Owner:** Alfa  
**Review Cycle:** Monthly or upon major model updates  
**Last Review:** 2025-11-07