import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const educationSchema = new mongoose.Schema({
  school: { type: String, default: "" },
  degree: { type: String, default: "" },
  fieldOfStudy: { type: String, default: "" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  grade: { type: String, default: "" }
})

const experienceSchema = new mongoose.Schema({
  company: { type: String, default: "" },
  role: { type: String, default: "" },
  location: { type: String, default: "" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  description: { type: String, default: "" },
  current: { type: Boolean, default: false }
})

const projectSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  technologies: { type: [String], default: [] },
  link: { type: String, default: "" }
})

const certificationSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  issuingOrganization: { type: String, default: "" },
  issueDate: { type: String, default: "" },
  expirationDate: { type: String, default: "" },
  credentialId: { type: String, default: "" },
  credentialUrl: { type: String, default: "" }
})

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    resumeText: {
      type: String,
      default: ""
    },
    // Master Career Profile Fields
    phone: { type: String, default: "" },
    headline: { type: String, default: "" },
    bio: { type: String, default: "" },
    
    profileLinks: {
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      leetcode: { type: String, default: "" },
      portfolio: { type: String, default: "" }
    },
    codingProfiles: {
      leetcode: { type: String, default: "" },
      codechef: { type: String, default: "" },
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      portfolio: { type: String, default: "" }
    },
    
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    
    skills: { type: [String], default: [] },
    
    careerPreferences: {
      targetRoles: { type: [String], default: [] },
      preferredLocations: { type: [String], default: [] },
      jobTypes: { type: [String], default: [] }
    },
    
    resumeFileName: { type: String, default: "" },
    portfolioFileName: { type: String, default: "" }
  },
  { timestamps: true }
)

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Match entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model("User", userSchema)
export default User
