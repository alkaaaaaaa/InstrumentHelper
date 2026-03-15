import { Score, Note, TabNote } from "../models/Score"

const API_BASE = "http://localhost:3000"

export type ScoreListItem = {
  _id: string
  title: string
  bpm: number
  timeSignature: { beats: number; beatValue: number }
  createdAt: string
  updatedAt: string
}

export type ScorePayload = Omit<Score, "_id" | "createdAt" | "updatedAt">

export type DetectionResult = {
  type: "chord" | "scale" | "unknown"
  name: string
  root: string
  tones: string[]
}

export type AnalyzePayload = {
  notes: Note[]
  tabNotes?: TabNote[]
  tuning?: string[]
}

export const scoreApi = {
  list: async (): Promise<ScoreListItem[]> => {
    const res = await fetch(`${API_BASE}/scores`)
    if (!res.ok) throw new Error("Failed to fetch scores")
    return res.json()
  },

  get: async (id: string): Promise<Score> => {
    const res = await fetch(`${API_BASE}/scores/${id}`)
    if (!res.ok) throw new Error("Failed to fetch score")
    return res.json()
  },

  create: async (score: ScorePayload): Promise<Score> => {
    const res = await fetch(`${API_BASE}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(score),
    })
    if (!res.ok) throw new Error("Failed to create score")
    return res.json()
  },

  update: async (id: string, score: ScorePayload): Promise<Score> => {
    const res = await fetch(`${API_BASE}/scores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(score),
    })
    if (!res.ok) throw new Error("Failed to update score")
    return res.json()
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/scores/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete score")
  },

  analyzeChord: async (payload: AnalyzePayload): Promise<DetectionResult> => {
    const res = await fetch(`${API_BASE}/scores/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to analyze chord")
    return res.json()
  },
}
