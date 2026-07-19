import { z } from "zod"

export const ResumeContentSchema = z.object({
  headline: z.string(),
  skills: z.array(z.object({
    category: z.string(),
    items: z.string() // comma-separated, rendered as-is
  })).min(1),
  experience: z.array(z.object({
    title: z.string(),
    dateRange: z.string(),
    bullets: z.array(z.string()).max(4)
  })).min(1),
  projects: z.array(z.object({
    title: z.string(),
    dateRange: z.string(),
    techStack: z.string(), // e.g. "React | Node.js | MongoDB"
    bullets: z.array(z.string()).max(3)
  })),
  achievements: z.array(z.string())
})
