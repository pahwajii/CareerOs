import mongoose from "mongoose"

const tailoredResumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    company: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    tailoredText: {
      type: String,
      required: true
    },
    atsScore: {
      type: Number,
      required: true
    },
    keywordCoverage: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [String],
      default: []
    },
    suggestions: {
      type: [String],
      default: []
    },
    pdfFileName: {
      type: String,
      default: ""
    },
    docxFileName: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
)

const TailoredResume = mongoose.model("TailoredResume", tailoredResumeSchema)
export default TailoredResume
