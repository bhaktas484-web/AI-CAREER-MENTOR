import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Custom Cloudinary v2 storage engine for Multer ────────────
const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:          'ai-career-mentor/resumes',
        resource_type:   'raw',
        access_mode:     'public',          // ← makes the file publicly downloadable
        use_filename:    true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return cb(error)
        cb(null, {
          path:     result.secure_url,   // req.file.path
          filename: result.public_id,    // req.file.filename
        })
      }
    )
    file.stream.pipe(uploadStream)
  },

  _removeFile(_req, file, cb) {
    cloudinary.uploader.destroy(file.filename, { resource_type: 'raw' }, cb)
  },
}

export const uploadResume = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF and Word documents are allowed.'))
  },
})

export { cloudinary }