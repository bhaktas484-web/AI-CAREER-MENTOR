import mongoose from 'mongoose'

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryId:  { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'docx'],
      required: true,
    },
    isActive: { type: Boolean, default: false },

    // ── AI-parsed data ────────────────────────────────────────
    parsed: {
      skills:      { type: [String], default: [] },
      experience: {
        type: [{
          company:   String,
          role:      String,
          duration:  String,
          highlights: [String],
        }],
        default: [],
      },
      education: {
        type: [{
          institution: String,
          degree:      String,
          year:        String,
        }],
        default: [],
      },
      summary:  { type: String, default: '' },
      rawText:  { type: String, default: '', select: false },
      parsedAt: { type: Date },
    },

    // ── Cached AI results (keyed by targetRole) ───────────────
    skillGapCache:  { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    roadmapCache:   { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    interviewCache: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    projectsCache:  { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

const Resume = mongoose.model('Resume', resumeSchema)
export default Resume