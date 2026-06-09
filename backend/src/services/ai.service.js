import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-20250514'

// ── Shared helper ─────────────────────────────────────────────
const ask = async (systemPrompt, userMessage, maxTokens = 1500) => {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  return res.content[0].text
}

const parseJSON = (text) => {
  // Strip possible markdown fences
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─────────────────────────────────────────────────────────────
// 1. Parse resume text into structured data
// ─────────────────────────────────────────────────────────────
export const parseResumeWithAI = async (rawText) => {
  const system = `You are a resume parsing expert. Extract structured data from the resume text provided.
Return ONLY valid JSON, no preamble, no markdown fences. Schema:
{
  "summary": "string – 2-3 sentence professional summary",
  "skills": ["string"],
  "experience": [
    { "company": "string", "role": "string", "duration": "string", "highlights": ["string"] }
  ],
  "education": [
    { "institution": "string", "degree": "string", "year": "string" }
  ]
}`

  const text = await ask(system, `Parse this resume:\n\n${rawText.slice(0, 8000)}`, 2000)
  return parseJSON(text)
}

// ─────────────────────────────────────────────────────────────
// 2. Skill gap analysis
// ─────────────────────────────────────────────────────────────
export const analyseSkillGapWithAI = async (parsedData, targetRole) => {
  const system = `You are a career coach. Analyse the candidate's skills vs the target role.
Return ONLY valid JSON. Schema:
{
  "matched": [
    { "skill": "string", "relevance": "high|medium|low" }
  ],
  "gaps": [
    { "skill": "string", "priority": "high|medium|low", "reason": "string" }
  ],
  "overallMatch": <number 0-100>,
  "summary": "string"
}`

  const prompt = `Target role: ${targetRole}
Candidate skills: ${parsedData.skills.join(', ')}
Experience: ${JSON.stringify(parsedData.experience)}`

  const text = await ask(system, prompt, 1500)
  return parseJSON(text)
}

// ─────────────────────────────────────────────────────────────
// 3. Learning roadmap
// ─────────────────────────────────────────────────────────────
export const generateRoadmapWithAI = async (parsedData, targetRole, skillGap) => {
  const system = `You are a senior engineering mentor. Create a personalised learning roadmap.
Return ONLY valid JSON. Schema:
{
  "title": "string",
  "estimatedDuration": "string",
  "phases": [
    {
      "phase": <number>,
      "title": "string",
      "duration": "string",
      "topics": [
        { "name": "string", "resources": ["string"], "type": "course|project|reading|practice" }
      ]
    }
  ]
}`

  const gaps = skillGap?.gaps?.map(g => g.skill).join(', ') || 'unknown gaps'
  const prompt = `Target role: ${targetRole}
Skill gaps to address: ${gaps}
Current experience level: ${parsedData.experience.length} positions`

  const text = await ask(system, prompt, 2000)
  return parseJSON(text)
}

// ─────────────────────────────────────────────────────────────
// 4. Interview questions
// ─────────────────────────────────────────────────────────────
export const generateInterviewQuestionsWithAI = async (parsedData, role, type = 'mixed') => {
  const system = `You are a technical interviewer at a top tech company. Generate realistic interview questions.
Return ONLY valid JSON. Schema:
{
  "questions": [
    {
      "id": "string",
      "question": "string",
      "type": "technical|behavioural|system-design",
      "difficulty": "easy|medium|hard",
      "hint": "string",
      "sampleAnswer": "string"
    }
  ]
}`

  const prompt = `Role: ${role}
Question types requested: ${type}
Candidate skills: ${parsedData.skills.slice(0, 15).join(', ')}
Experience: ${parsedData.experience.map(e => e.role).join(', ')}
Generate 8 questions.`

  const text = await ask(system, prompt, 2500)
  return parseJSON(text)
}

// ─────────────────────────────────────────────────────────────
// 5. Project suggestions
// ─────────────────────────────────────────────────────────────
export const generateProjectSuggestionsWithAI = async (parsedData, targetRole, skillGap) => {
  const system = `You are a senior developer mentor. Suggest portfolio projects that will fill skill gaps and impress hiring managers.
Return ONLY valid JSON. Schema:
{
  "projects": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "difficulty": "beginner|intermediate|advanced",
      "duration": "string",
      "skillsCovered": ["string"],
      "techStack": ["string"],
      "keyFeatures": ["string"],
      "whyThisProject": "string"
    }
  ]
}`

  const gaps = skillGap?.gaps?.map(g => g.skill).join(', ') || ''
  const prompt = `Target role: ${targetRole}
Skill gaps: ${gaps}
Current skills: ${parsedData.skills.slice(0, 15).join(', ')}
Suggest 4 projects.`

  const text = await ask(system, prompt, 2000)
  return parseJSON(text)
}

// ─────────────────────────────────────────────────────────────
// 6. Job matches (AI-generated mock matches from resume + role)
// ─────────────────────────────────────────────────────────────
export const generateJobMatchesWithAI = async (parsedData, filters = {}) => {
  const system = `You are a job market expert. Based on the candidate profile, generate realistic job listings they would match well.
Return ONLY valid JSON. Schema:
{
  "jobs": [
    {
      "id": "string",
      "title": "string",
      "company": "string",
      "location": "string",
      "remote": <boolean>,
      "matchScore": <number 60-99>,
      "salary": "string",
      "tags": ["string"],
      "description": "string",
      "requirements": ["string"],
      "postedDays": <number>
    }
  ]
}`

  const location = filters.location || 'India'
  const remote   = filters.remote !== undefined ? filters.remote : true
  const prompt = `Candidate skills: ${parsedData.skills.slice(0, 15).join(', ')}
Experience: ${parsedData.experience.length} roles
Target location: ${location}, remote preferred: ${remote}
Generate 6 job matches.`

  const text = await ask(system, prompt, 2000)
  return parseJSON(text)
}