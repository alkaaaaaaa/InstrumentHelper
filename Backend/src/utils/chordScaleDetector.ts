const PITCH_CLASSES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const

type PitchClass = (typeof PITCH_CLASSES)[number]

const FLAT_TO_SHARP: Record<string, string> = {
  Cb: "B", Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#",
}

const CHORD_TEMPLATES: Record<string, number[]> = {
  "Major":      [0, 4, 7],
  "Minor":      [0, 3, 7],
  "Diminished": [0, 3, 6],
  "Augmented":  [0, 4, 8],
  "Dom7":       [0, 4, 7, 10],
  "Maj7":       [0, 4, 7, 11],
  "Min7":       [0, 3, 7, 10],
  "Dim7":       [0, 3, 6, 9],
  "HalfDim7":   [0, 3, 6, 10],
  "Sus2":       [0, 2, 7],
  "Sus4":       [0, 5, 7],
  "Maj6":       [0, 4, 7, 9],
  "Min6":       [0, 3, 7, 9],
  "Add9":       [0, 2, 4, 7],
  "MinAdd9":    [0, 2, 3, 7],
}

const SCALE_TEMPLATES: Record<string, number[]> = {
  "Major":            [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor":    [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor":   [0, 2, 3, 5, 7, 8, 11],
  "Major Pentatonic": [0, 2, 4, 7, 9],
  "Minor Pentatonic": [0, 3, 5, 7, 10],
  "Blues":            [0, 3, 5, 6, 7, 10],
  "Dorian":           [0, 2, 3, 5, 7, 9, 10],
  "Mixolydian":       [0, 2, 4, 5, 7, 9, 10],
  "Phrygian":         [0, 1, 3, 5, 7, 8, 10],
  "Lydian":           [0, 2, 4, 6, 7, 9, 11],
}

const DEFAULT_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"]

export type DetectionResult = {
  type: "chord" | "scale" | "unknown"
  name: string
  root: string
  tones: string[]
}

export function pitchToClass(pitch: string): string {
  const match = pitch.match(/^([A-G][#b]?)/)
  if (!match) return "C"
  const cls = match[1]
  return FLAT_TO_SHARP[cls] ?? cls
}

// string: 1-6, 1=high e (tuning index 5), 6=low E (tuning index 0)
export function fretToPitchClass(string: number, fret: number, tuning: string[]): string {
  const openPitch = tuning[6 - string] ?? "E4"
  const openClass = pitchToClass(openPitch)
  const openIdx = PITCH_CLASSES.indexOf(openClass as PitchClass)
  if (openIdx === -1) return "C"
  const resultIdx = (openIdx + fret) % 12
  return PITCH_CLASSES[resultIdx]
}

type RawNote = { pitch: string; string?: number; fret?: number; start: number; duration: number }
type RawTabNote = { string: number; fret: number; beat: number }

export function extractPitchClasses(
  notes: RawNote[],
  tabNotes: RawTabNote[] | undefined,
  tuning: string[] | undefined,
): string[] {
  const effectiveTuning = tuning?.length ? tuning : DEFAULT_TUNING
  const set = new Set<string>()

  for (const note of notes) {
    set.add(pitchToClass(note.pitch))
  }

  for (const note of tabNotes ?? []) {
    set.add(fretToPitchClass(note.string, note.fret, effectiveTuning))
  }

  return [...set]
}

export function detectChordOrScale(pitchClasses: string[]): DetectionResult {
  const unique = [...new Set(pitchClasses.filter(Boolean))]

  if (unique.length === 0) {
    return { type: "unknown", name: "无音符", root: "", tones: [] }
  }
  if (unique.length === 1) {
    return { type: "unknown", name: `单音 ${unique[0]}`, root: unique[0], tones: unique }
  }

  // --- 和弦检测（优先）---
  let bestChord: { root: string; name: string; score: number; tones: string[] } | null = null

  for (const rootClass of PITCH_CLASSES) {
    const rootIdx = PITCH_CLASSES.indexOf(rootClass)
    for (const [templateName, intervals] of Object.entries(CHORD_TEMPLATES)) {
      const chordTones = intervals.map((i) => PITCH_CLASSES[(rootIdx + i) % 12])
      const matched = unique.filter((p) => chordTones.includes(p as PitchClass)).length
      const inputCoverage = matched / unique.length
      const templateCoverage = matched / chordTones.length
      const score = inputCoverage * 0.6 + templateCoverage * 0.4

      if (inputCoverage >= 0.8 && (!bestChord || score > bestChord.score)) {
        bestChord = {
          root: rootClass,
          name: `${rootClass} ${templateName}`,
          score,
          tones: chordTones as unknown as string[],
        }
      }
    }
  }

  if (bestChord) {
    return { type: "chord", name: bestChord.name, root: bestChord.root, tones: bestChord.tones }
  }

  // --- 音阶检测（回退）---
  let bestScale: { root: string; name: string; score: number; tones: string[] } | null = null

  for (const rootClass of PITCH_CLASSES) {
    const rootIdx = PITCH_CLASSES.indexOf(rootClass)
    for (const [templateName, intervals] of Object.entries(SCALE_TEMPLATES)) {
      const scaleTones = intervals.map((i) => PITCH_CLASSES[(rootIdx + i) % 12])
      const matched = unique.filter((p) => scaleTones.includes(p as PitchClass)).length
      const inputCoverage = matched / unique.length
      const templateCoverage = matched / scaleTones.length
      const score = inputCoverage * 0.5 + templateCoverage * 0.5

      if (inputCoverage >= 0.7 && (!bestScale || score > bestScale.score)) {
        bestScale = {
          root: rootClass,
          name: `${rootClass} ${templateName}`,
          score,
          tones: scaleTones as unknown as string[],
        }
      }
    }
  }

  if (bestScale) {
    return { type: "scale", name: bestScale.name, root: bestScale.root, tones: bestScale.tones }
  }

  return { type: "unknown", name: "未识别结构", root: unique[0] ?? "", tones: unique }
}
