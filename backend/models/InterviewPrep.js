import mongoose from "mongoose"

const prepSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  }
})

const interviewPrepSchema = new mongoose.Schema(
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
    sections: [prepSectionSchema]
  },
  { timestamps: true }
)

const InterviewPrep = mongoose.model("InterviewPrep", interviewPrepSchema)
export default InterviewPrep
