import mongoose from "mongoose"

const outreachTemplateSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["Cover Letter", "Email", "Referral Request", "LinkedIn Message", "Cold Email", "Follow-up", "Thank You Email"],
      required: true
    },
    tone: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      default: ""
    },
    content: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
)

const OutreachTemplate = mongoose.model("OutreachTemplate", outreachTemplateSchema)
export default OutreachTemplate
