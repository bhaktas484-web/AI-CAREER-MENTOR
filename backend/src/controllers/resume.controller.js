import Resume from '../models/Resume.model.js'
import User   from '../models/User.model.js'
import { cloudinary } from '../config/cloudinary.js'
import { extractTextFromUrl } from '../utils/parseResume.utils.js'
import {
  parseResumeWithAI,
  analyseSkillGapWithAI,
  generateRoadmapWithAI,
  generateInterviewQuestionsWithAI,
  generateProjectSuggestionsWithAI,
  generateJobMatchesWithAI,
} from '../services/ai.service.js'

// ─────────────────────────────────────────────────────────────
// POST /api/resume/upload
// ─────────────────────────────────────────────────────────────
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' })
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase()

    const resume = await Resume.create({
      user:          req.user._id,
      originalName:  req.file.originalname,
      cloudinaryUrl: req.file.path,
      cloudinaryId:  req.file.filename,
      fileType:      ext,
    })

    res.status(201).json({ message: 'Resume uploaded.', resume })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/resume
// ─────────────────────────────────────────────────────────────
export const getAllResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-parsed.rawText -skillGapCache -roadmapCache -interviewCache -projectsCache')
    res.json({ resumes })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/resume/:id
// ─────────────────────────────────────────────────────────────
export const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    await cloudinary.uploader.destroy(resume.cloudinaryId, { resource_type: 'raw' })
    await resume.deleteOne()

    if (req.user.activeResumeId?.toString() === resume._id.toString()) {
      await User.findByIdAndUpdate(req.user._id, { activeResumeId: null })
    }

    res.json({ message: 'Resume deleted.' })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/resume/:id/set-active
// ─────────────────────────────────────────────────────────────
export const setActiveResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    await Resume.updateMany({ user: req.user._id }, { isActive: false })
    resume.isActive = true
    await resume.save()
    await User.findByIdAndUpdate(req.user._id, { activeResumeId: resume._id })

    res.json({ message: 'Active resume updated.', resume })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/resume/:id/parse
// ─────────────────────────────────────────────────────────────
export const parseResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
      .select('+parsed.rawText')
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    // Return cached result if already parsed
    if (resume.parsed?.parsedAt && resume.parsed.skills?.length > 0) {
      const cached = resume.parsed.toObject ? resume.parsed.toObject() : { ...resume.parsed }
      delete cached.rawText
      return res.json(cached)
    }

    // ── Extract text — pass cloudinaryId for signed URL ──
    const rawText = await extractTextFromUrl(resume.cloudinaryUrl, resume.cloudinaryId)

    if (!rawText || rawText.length < 50) {
      return res.status(422).json({
        message: 'Could not extract text from this file. Make sure it is a PDF with selectable text (not a scanned image).',
      })
    }

    // ── AI parse ──
    const parsed = await parseResumeWithAI(rawText)

    // Merge and save
    resume.parsed = {
      skills:     parsed.skills     || [],
      experience: parsed.experience || [],
      education:  parsed.education  || [],
      summary:    parsed.summary    || '',
      rawText,
      parsedAt: new Date(),
    }
    await resume.save()

    // Return without rawText
    const { rawText: _raw, ...safeData } = resume.parsed.toObject
      ? resume.parsed.toObject()
      : { ...resume.parsed }

    res.json(safeData)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/resume/:id/skill-gap
// ─────────────────────────────────────────────────────────────
export const analyseSkillGap = async (req, res, next) => {
  try {
    const { targetRole } = req.body
    if (!targetRole) return res.status(400).json({ message: 'targetRole is required.' })

    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    if (!resume.parsed?.parsedAt) {
      return res.status(400).json({ message: 'Parse the resume first via GET /api/resume/:id/parse' })
    }

    const cacheKey = targetRole.toLowerCase().replace(/\s+/g, '_')
    if (resume.skillGapCache?.get(cacheKey)) {
      return res.json(resume.skillGapCache.get(cacheKey))
    }

    const result = await analyseSkillGapWithAI(resume.parsed, targetRole)
    resume.skillGapCache.set(cacheKey, result)
    await resume.save()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/resume/:id/roadmap
// ─────────────────────────────────────────────────────────────
export const getRoadmap = async (req, res, next) => {
  try {
    const { targetRole } = req.body
    if (!targetRole) return res.status(400).json({ message: 'targetRole is required.' })

    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    if (!resume.parsed?.parsedAt) {
      return res.status(400).json({ message: 'Parse the resume first.' })
    }

    const cacheKey = targetRole.toLowerCase().replace(/\s+/g, '_')
    if (resume.roadmapCache?.get(cacheKey)) {
      return res.json(resume.roadmapCache.get(cacheKey))
    }

    const skillGap = resume.skillGapCache?.get(cacheKey) || null
    const result   = await generateRoadmapWithAI(resume.parsed, targetRole, skillGap)
    resume.roadmapCache.set(cacheKey, result)
    await resume.save()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/resume/:id/interview-questions
// ─────────────────────────────────────────────────────────────
export const getInterviewQuestions = async (req, res, next) => {
  try {
    const { role, type = 'mixed' } = req.body
    if (!role) return res.status(400).json({ message: 'role is required.' })

    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    if (!resume.parsed?.parsedAt) {
      return res.status(400).json({ message: 'Parse the resume first.' })
    }

    const cacheKey = `${role}_${type}`.toLowerCase().replace(/\s+/g, '_')
    if (resume.interviewCache?.get(cacheKey)) {
      return res.json(resume.interviewCache.get(cacheKey))
    }

    const result = await generateInterviewQuestionsWithAI(resume.parsed, role, type)
    resume.interviewCache.set(cacheKey, result)
    await resume.save()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/resume/:id/projects
// ─────────────────────────────────────────────────────────────
export const getProjectSuggestions = async (req, res, next) => {
  try {
    const { targetRole } = req.body
    if (!targetRole) return res.status(400).json({ message: 'targetRole is required.' })

    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    if (!resume.parsed?.parsedAt) {
      return res.status(400).json({ message: 'Parse the resume first.' })
    }

    const cacheKey = targetRole.toLowerCase().replace(/\s+/g, '_')
    if (resume.projectsCache?.get(cacheKey)) {
      return res.json(resume.projectsCache.get(cacheKey))
    }

    const skillGap = resume.skillGapCache?.get(cacheKey) || null
    const result   = await generateProjectSuggestionsWithAI(resume.parsed, targetRole, skillGap)
    resume.projectsCache.set(cacheKey, result)
    await resume.save()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/resume/:id/job-matches
// ─────────────────────────────────────────────────────────────
export const getJobMatches = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
    if (!resume) return res.status(404).json({ message: 'Resume not found.' })

    if (!resume.parsed?.parsedAt) {
      return res.status(400).json({ message: 'Parse the resume first.' })
    }

    const filters = {
      location: req.query.location,
      remote:   req.query.remote === 'true',
    }

    const result = await generateJobMatchesWithAI(resume.parsed, filters)
    res.json(result)
  } catch (err) {
    next(err)
  }
}