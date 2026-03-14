import { Schema, model } from "mongoose"

const NoteSchema = new Schema({
  pitch: { type: String, required: true },
  string: Number,
  fret: Number,
  start: { type: Number, required: true },
  duration: { type: Number, required: true },
}, { _id: false })

const TabNoteSchema = new Schema({
  string: { type: Number, required: true },
  fret: { type: Number, required: true },
  beat: { type: Number, required: true },
}, { _id: false })

const MeasureSchema = new Schema({
  index: { type: Number, required: true },
  notes: [NoteSchema],
  tabNotes: [TabNoteSchema],
}, { _id: false })

const ScoreSchema = new Schema({
  title: { type: String, default: "未命名乐谱" },
  bpm: { type: Number, required: true },
  timeSignature: {
    beats: { type: Number, required: true },
    beatValue: { type: Number, required: true },
  },
  tuning: [String],
  measures: [MeasureSchema],
}, { timestamps: true })

export const ScoreModel = model("Score", ScoreSchema)
