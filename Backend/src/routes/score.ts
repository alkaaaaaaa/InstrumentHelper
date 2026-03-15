import { Elysia, t } from "elysia"
import { ScoreModel } from "../models/Score"
import { detectChordOrScale, extractPitchClasses } from "../utils/chordScaleDetector"

const NoteBody = t.Object({
  pitch: t.String(),
  string: t.Optional(t.Number()),
  fret: t.Optional(t.Number()),
  start: t.Number(),
  duration: t.Number(),
})

const TabNoteBody = t.Object({
  string: t.Number(),
  fret: t.Number(),
  beat: t.Number(),
})

const MeasureBody = t.Object({
  index: t.Number(),
  notes: t.Array(NoteBody),
  tabNotes: t.Optional(t.Array(TabNoteBody)),
})

const ScoreBody = t.Object({
  title: t.Optional(t.String()),
  bpm: t.Number(),
  timeSignature: t.Object({
    beats: t.Number(),
    beatValue: t.Number(),
  }),
  tuning: t.Optional(t.Array(t.String())),
  measures: t.Array(MeasureBody),
})

export const scoreRoutes = new Elysia({ prefix: "/scores" })
  .post(
    "/analyze",
    ({ body }) => {
      const pitchClasses = extractPitchClasses(body.notes, body.tabNotes, body.tuning)
      return detectChordOrScale(pitchClasses)
    },
    {
      body: t.Object({
        notes: t.Array(NoteBody),
        tabNotes: t.Optional(t.Array(TabNoteBody)),
        tuning: t.Optional(t.Array(t.String())),
      }),
    },
  )

  .get("/", async () => {
    const scores = await ScoreModel.find({}, "title bpm timeSignature updatedAt createdAt").sort({ updatedAt: -1 })
    return scores
  })

  .get("/:id", async ({ params, set }) => {
    const score = await ScoreModel.findById(params.id)
    if (!score) {
      set.status = 404
      return { error: "Score not found" }
    }
    return score
  })

  .post("/", async ({ body, set }) => {
    const score = await ScoreModel.create(body)
    set.status = 201
    return score
  }, { body: ScoreBody })

  .put("/:id", async ({ params, body, set }) => {
    const score = await ScoreModel.findByIdAndUpdate(params.id, body, { new: true, runValidators: true })
    if (!score) {
      set.status = 404
      return { error: "Score not found" }
    }
    return score
  }, { body: ScoreBody })

  .delete("/:id", async ({ params, set }) => {
    const score = await ScoreModel.findByIdAndDelete(params.id)
    if (!score) {
      set.status = 404
      return { error: "Score not found" }
    }
    return { message: "Score deleted" }
  })
