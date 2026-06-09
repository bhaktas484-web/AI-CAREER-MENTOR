import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated – no token provided.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ message: 'User belonging to this token no longer exists.' })
    }
    req.user = user
    next()
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Token has expired. Please log in again.'
      : 'Invalid token.'
    return res.status(401).json({ message: msg })
  }
}