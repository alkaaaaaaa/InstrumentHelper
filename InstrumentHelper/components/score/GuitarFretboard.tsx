import React, { useMemo } from "react"
import { View } from "react-native"
import {
  Canvas,
  Circle,
  Line,
  Text as SkiaText,
  Rect,
  vec,
  useFont,
} from "@shopify/react-native-skia"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontFile = require("../../assets/FiraCode-VariableFont_wght.ttf")

// Layout constants
const STRING_COUNT = 6
const FRET_COUNT = 12       // frets 0–12
const LEFT_MARGIN = 28      // space for string labels
const TOP_MARGIN = 22       // space for fret numbers
const FRET_WIDTH = 38       // horizontal distance between frets
const STRING_SPACING = 22   // vertical distance between strings
const RIGHT_MARGIN = 12
const BOTTOM_MARGIN = 12
const DOT_RADIUS = 9

// Colors
const ROOT_COLOR = "#388E3C"
const TONE_COLOR = "#81C784"
const ROOT_TEXT_COLOR = "#fff"
const TONE_TEXT_COLOR = "#1B5E20"
const STRING_COLOR = "#9ca3af"
const FRET_COLOR = "#6b7280"
const NUT_COLOR = "#374151"
const LABEL_COLOR = "#9ca3af"
const MARKER_COLOR = "rgba(156,163,175,0.25)"

// Fret position markers (single dot)
const SINGLE_DOT_FRETS = [3, 5, 7, 9]
const DOUBLE_DOT_FRET = 12

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const
type PitchClass = (typeof PITCH_CLASSES)[number]

const FLAT_TO_SHARP: Record<string, string> = {
  Cb: "B", Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#",
}

function pitchToClass(pitch: string): string {
  const match = pitch.match(/^([A-G][#b]?)/)
  if (!match) return "C"
  return FLAT_TO_SHARP[match[1]] ?? match[1]
}

function fretToPitchClass(string: number, fret: number, tuning: string[]): string {
  const openPitch = tuning[6 - string] ?? "E4"
  const openClass = pitchToClass(openPitch)
  const openIdx = PITCH_CLASSES.indexOf(openClass as PitchClass)
  if (openIdx === -1) return "C"
  return PITCH_CLASSES[(openIdx + fret) % 12]
}

// String labels: string 1 (high e) at top, string 6 (low E) at bottom
const STRING_LABELS = ["e", "B", "G", "D", "A", "E"]

const DEFAULT_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"]

type Props = {
  tones: string[]
  root: string
  tuning?: string[]
}

export function GuitarFretboard({ tones, root, tuning = DEFAULT_TUNING }: Props) {
  const font = useFont(fontFile, 11)
  const labelFont = useFont(fontFile, 10)

  const totalWidth = LEFT_MARGIN + FRET_COUNT * FRET_WIDTH + RIGHT_MARGIN
  const totalHeight = TOP_MARGIN + (STRING_COUNT - 1) * STRING_SPACING + BOTTOM_MARGIN

  // Precompute which (string, fret) positions should be highlighted
  const highlights = useMemo(() => {
    const result: { x: number; y: number; pitchClass: string; isRoot: boolean }[] = []
    for (let s = 1; s <= STRING_COUNT; s++) {
      for (let f = 0; f <= FRET_COUNT; f++) {
        const pc = fretToPitchClass(s, f, tuning)
        if (tones.includes(pc)) {
          const x = LEFT_MARGIN + f * FRET_WIDTH
          const y = TOP_MARGIN + (s - 1) * STRING_SPACING
          result.push({ x, y, pitchClass: pc, isRoot: pc === root })
        }
      }
    }
    return result
  }, [tones, root, tuning])

  if (!font || !labelFont) return null

  return (
    <View>
      <Canvas style={{ width: totalWidth, height: totalHeight }}>

        {/* ── Position marker dots (background) ── */}
        {SINGLE_DOT_FRETS.map((fret) => {
          const x = LEFT_MARGIN + fret * FRET_WIDTH - FRET_WIDTH / 2
          const y = TOP_MARGIN + ((STRING_COUNT - 1) / 2) * STRING_SPACING
          return (
            <Circle key={`marker-${fret}`} cx={x} cy={y} r={5} color={MARKER_COLOR} />
          )
        })}
        {/* Double dot at fret 12 */}
        {[1, 3].map((strOffset) => (
          <Circle
            key={`marker12-${strOffset}`}
            cx={LEFT_MARGIN + DOUBLE_DOT_FRET * FRET_WIDTH - FRET_WIDTH / 2}
            cy={TOP_MARGIN + strOffset * STRING_SPACING * 1.5}
            r={5}
            color={MARKER_COLOR}
          />
        ))}

        {/* ── Fret numbers ── */}
        {Array.from({ length: FRET_COUNT + 1 }).map((_, f) => {
          if (f === 0) return null
          const x = LEFT_MARGIN + f * FRET_WIDTH - FRET_WIDTH / 2 - 4
          return (
            <SkiaText
              key={`fret-num-${f}`}
              x={x}
              y={TOP_MARGIN - 6}
              text={f.toString()}
              font={labelFont}
              color={LABEL_COLOR}
            />
          )
        })}

        {/* ── String labels ── */}
        {STRING_LABELS.map((label, i) => (
          <SkiaText
            key={`str-label-${i}`}
            x={6}
            y={TOP_MARGIN + i * STRING_SPACING + 4}
            text={label}
            font={labelFont}
            color={LABEL_COLOR}
          />
        ))}

        {/* ── Nut (thick line at fret 0) ── */}
        <Rect
          x={LEFT_MARGIN - 3}
          y={TOP_MARGIN - 2}
          width={4}
          height={(STRING_COUNT - 1) * STRING_SPACING + 4}
          color={NUT_COLOR}
        />

        {/* ── Fret lines ── */}
        {Array.from({ length: FRET_COUNT }).map((_, i) => {
          const x = LEFT_MARGIN + (i + 1) * FRET_WIDTH
          return (
            <Line
              key={`fret-${i}`}
              p1={vec(x, TOP_MARGIN)}
              p2={vec(x, TOP_MARGIN + (STRING_COUNT - 1) * STRING_SPACING)}
              color={FRET_COLOR}
              strokeWidth={1}
            />
          )
        })}

        {/* ── String lines ── */}
        {Array.from({ length: STRING_COUNT }).map((_, i) => {
          const y = TOP_MARGIN + i * STRING_SPACING
          const strokeWidth = 1 + i * 0.25
          return (
            <Line
              key={`string-${i}`}
              p1={vec(LEFT_MARGIN, y)}
              p2={vec(LEFT_MARGIN + FRET_COUNT * FRET_WIDTH, y)}
              color={STRING_COLOR}
              strokeWidth={strokeWidth}
            />
          )
        })}

        {/* ── Highlighted positions ── */}
        {highlights.map(({ x, y, pitchClass, isRoot }, idx) => {
          const cx = x === LEFT_MARGIN
            ? LEFT_MARGIN - FRET_WIDTH / 2 + 4   // open string: draw left of nut
            : x - FRET_WIDTH / 2                  // between previous and current fret
          const fillColor = isRoot ? ROOT_COLOR : TONE_COLOR
          const textColor = isRoot ? ROOT_TEXT_COLOR : TONE_TEXT_COLOR
          const label = pitchClass.replace("#", "♯")
          const textX = cx - (label.length > 1 ? 7 : 4)
          return (
            <React.Fragment key={`hl-${idx}`}>
              <Circle cx={cx} cy={y} r={DOT_RADIUS} color={fillColor} />
              <SkiaText
                x={textX}
                y={y + 4}
                text={label}
                font={font}
                color={textColor}
              />
            </React.Fragment>
          )
        })}

      </Canvas>
    </View>
  )
}
