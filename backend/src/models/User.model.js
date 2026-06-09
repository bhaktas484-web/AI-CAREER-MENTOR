import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name must be under 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned by default
    },
    title: {
      type: String,
      default: '',
      maxlength: 100,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    targetRoles: {
      type: [String],
      default: [],
    },
    skills: {
      type: [{ name: String, level: { type: Number, min: 0, max: 100 } }],
      default: [],
    },
    activeResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    settings: {
      emailNotifications: { type: Boolean, default: true },
      weeklyReport:       { type: Boolean, default: true },
      aiSuggestions:      { type: Boolean, default: true },
      publicProfile:      { type: Boolean, default: false },
    },
    resetPasswordToken:   { type: String, select: false },
    resetPasswordExpires: { type: Date,   select: false },
  },
  { timestamps: true }
)

// ── Hash password before saving ───────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// ── Instance method: compare passwords ───────────────────────
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

// ── Sanitise output ───────────────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.resetPasswordToken
  delete obj.resetPasswordExpires
  return obj
}

const User = mongoose.model('User', userSchema)
export default User