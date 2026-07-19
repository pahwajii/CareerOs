import mongoose from "mongoose"

const checklistSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  done: {
    type: Boolean,
    default: false
  }
})

const timelineEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  details: {
    type: String,
    default: ""
  }
})

const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    company: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["saved", "applied", "oa", "interview", "hr", "offer", "rejected", "withdrawn"],
      default: "applied"
    },
    salary: {
      type: String,
      default: ""
    },
    location: {
      type: String,
      default: ""
    },
    url: {
      type: String,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    },
    source: {
      type: String,
      default: ""
    },
    jobDescription: {
      type: String,
      default: ""
    },
    appliedDate: {
      type: Date,
      default: Date.now
    },
    recruiterName: {
      type: String,
      default: ""
    },
    recruiterEmail: {
      type: String,
      default: ""
    },
    recruiterPhone: {
      type: String,
      default: ""
    },
    matchScore: {
      type: Number,
      default: 0
    },
    resumeVersion: {
      type: String,
      default: ""
    },
    coverLetter: {
      type: String,
      default: ""
    },
    checklist: [checklistSchema],
    timeline: [timelineEventSchema]
  },
  { timestamps: true }
)

const Job = mongoose.model("Job", jobSchema)
export default Job
