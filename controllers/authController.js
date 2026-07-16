import jwt from "jsonwebtoken"
import User from "../models/User.js"

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "defaultjwtsecretforlocaldevelopmentonly",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  )
}

/**
 * Register a new user
 * POST /api/auth/signup
 */
export async function signup(req, res, next) {
  const { name, email, password } = req.body

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please enter all fields" })
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    const user = await User.create({
      name,
      email,
      password
    })

    const token = generateToken(user._id)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileLinks: user.profileLinks,
        resumeText: user.resumeText
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Authenticate user & get token
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Please enter all fields" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = generateToken(user._id)

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileLinks: user.profileLinks,
        resumeText: user.resumeText
      }
    })
  } catch (error) {
    next(error)
  }
}
