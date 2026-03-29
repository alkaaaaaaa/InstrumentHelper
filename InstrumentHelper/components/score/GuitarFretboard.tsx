import React, { useMemo } from "react"
import { View, Text, StyleSheet } from "react-native"
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
const FRET_COUNT = 22       // frets 0–22
const LEFT_MARGIN = 28      // space for string labels
const TOP_MARGIN = 22       // space for fret numbers
const FRET_WIDTH = 38       // horizontal distance between frets
const STRING_SPACING = 22   // vertical distance between strings
const RIGHT_MARGIN = 12
const BOTTOM_MARGIN = 12
const DOT_RADIUS = 9
const PLAYING_DOT_RADIUS = 11

// Colors
const ROOT_COLOR = "#388E3C"
const TONE_COLOR = "#81C784"
const ROOT_TEXT_COLOR = "#fff"
const TONE_TEXT_COLOR = "#1B5E20"
const PLAYING_COLOR = "#F59E0B"
const PLAYING_ROOT_COLOR = "#D97706"
const PLAYING_GLOW_COLOR = "rgba(245, 158, 11, 0.35)"
const STRING_COLOR = "#9ca3af"
const FRET_COLOR = "#6b7280"
const NUT_COLOR = "#374151"
const LABEL_COLOR = "#9ca3af"
const MARKER_COLOR = "rgba(156,163,175,0.25)"
const SHAPE_HIGHLIGHT_COLOR = "rgba(56, 189, 248, 0.14)"
const SHAPE_BORDER_COLOR = "rgba(56, 189, 248, 0.55)"

// Fret position markers (single dot)
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
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
const CAGED_SHAPES = ["C", "A", "G", "E", "D"] as const

type ShapeName = (typeof CAGED_SHAPES)[number]
type PlayingPosition = { string: number; fret: number }
type ShapeMatch = {
  name: ShapeName
  rangeStart: number
  rangeEnd: number
  score: number
}

const SHAPE_DEFINITIONS: Record<
  ShapeName,
  { anchorString: number; relativeRange: [number, number] }
> = {
  C: { anchorString: 5, relativeRange: [-3, 0] },
  A: { anchorString: 5, relativeRange: [0, 2] },
  G: { anchorString: 6, relativeRange: [-3, 0] },
  E: { anchorString: 6, relativeRange: [0, 3] },
  D: { anchorString: 4, relativeRange: [0, 3] },
}

function getFretsForPitchOnString(string: number, pitchClass: string, tuning: string[]): number[] {
  const openPitch = tuning[6 - string] ?? "E4"
  const openClass = pitchToClass(openPitch)
  const openIdx = PITCH_CLASSES.indexOf(openClass as PitchClass)
  const targetIdx = PITCH_CLASSES.indexOf(pitchClass as PitchClass)
  if (openIdx === -1 || targetIdx === -1) return []

  const frets: number[] = []
  for (let fret = 0; fret <= FRET_COUNT; fret++) {
    if ((openIdx + fret) % 12 === targetIdx) {
      frets.push(fret)
    }
  }
  return frets
}

function detectCagedShape(
  root: string,
  tuning: string[],
  playingPositions: PlayingPosition[],
): ShapeMatch | null {
  if (!playingPositions.length) return null

  const fretted = playingPositions.filter((pos) => pos.fret >= 0)
  if (!fretted.length) return null

  const minFret = Math.min(...fretted.map((pos) => pos.fret))
  const maxFret = Math.max(...fretted.map((pos) => pos.fret))

  let bestMatch: ShapeMatch | null = null

  for (const name of CAGED_SHAPES) {
    const definition = SHAPE_DEFINITIONS[name]
    const candidateFrets = getFretsForPitchOnString(definition.anchorString, root, tuning)

    for (const anchorFret of candidateFrets) {
      const rangeStart = Math.max(0, anchorFret + definition.relativeRange[0])
      const rangeEnd = Math.min(FRET_COUNT, anchorFret + definition.relativeRange[1])

      let score = 0
      let insideCount = 0
      let rootCount = 0
      let anchorPlayed = false

      for (const pos of fretted) {
        const inRange = pos.fret >= rangeStart && pos.fret <= rangeEnd
        if (inRange) {
          insideCount += 1
          score += 4
        } else {
          const distance = pos.fret < rangeStart ? rangeStart - pos.fret : pos.fret - rangeEnd
          score -= 3 + distance * 2
        }

        const pitchClass = fretToPitchClass(pos.string, pos.fret, tuning)
        if (pitchClass === root) {
          rootCount += 1
          score += 2
          if (pos.string === definition.anchorString && pos.fret === anchorFret) {
            anchorPlayed = true
          }
        }
      }

      if (anchorPlayed) score += 6
      score += insideCount * 2 + rootCount
      score -= Math.abs(minFret - rangeStart)
      score -= Math.abs(maxFret - rangeEnd)
      score -= Math.abs((rangeEnd - rangeStart) - (maxFret - minFret))

      const match: ShapeMatch = { name, rangeStart, rangeEnd, score }
      if (!bestMatch || match.score > bestMatch.score) {
        bestMatch = match
      }
    }
  }

  return bestMatch
}

type Props = {
  tones: string[]
  root: string
  tuning?: string[]
  /** Specific (string, fret) positions of notes actually played in the current measure */
  playingPositions?: PlayingPosition[]
}

export function GuitarFretboard({ tones, root, tuning = DEFAULT_TUNING, playingPositions }: Props) {
  const font = useFont(fontFile, 11)
  const labelFont = useFont(fontFile, 10)

  const totalWidth = LEFT_MARGIN + FRET_COUNT * FRET_WIDTH + RIGHT_MARGIN
  const totalHeight = TOP_MARGIN + (STRING_COUNT - 1) * STRING_SPACING + BOTTOM_MARGIN

  const playingSet = useMemo(() => {
    return new Set((playingPositions ?? []).map(p => `${p.string}-${p.fret}`))
  }, [playingPositions])

  const detectedShape = useMemo(() => {
    return detectCagedShape(root, tuning, playingPositions ?? [])
  }, [root, tuning, playingPositions])

  const shapeHighlightRect = useMemo(() => {
    if (!detectedShape) return null

    const leftEdge = LEFT_MARGIN - FRET_WIDTH / 2 + 4
    const startX = detectedShape.rangeStart <= 0
      ? leftEdge
      : LEFT_MARGIN + detectedShape.rangeStart * FRET_WIDTH - FRET_WIDTH / 2
    const endX = LEFT_MARGIN + detectedShape.rangeEnd * FRET_WIDTH + FRET_WIDTH / 2

    return {
      x: Math.max(leftEdge, startX),
      width: Math.max(24, Math.min(totalWidth - RIGHT_MARGIN, endX) - Math.max(leftEdge, startX)),
    }
  }, [detectedShape, totalWidth])

  // Precompute which (string, fret) positions should be highlighted
  const highlights = useMemo(() => {
    const result: {
      x: number
      y: number
      pitchClass: string
      isRoot: boolean
      isPlaying: boolean
    }[] = []
    for (let s = 1; s <= STRING_COUNT; s++) {
      for (let f = 0; f <= FRET_COUNT; f++) {
        const pc = fretToPitchClass(s, f, tuning)
        const playing = playingSet.has(`${s}-${f}`)
        if (tones.includes(pc) || playing) {
          const x = LEFT_MARGIN + f * FRET_WIDTH
          const y = TOP_MARGIN + (s - 1) * STRING_SPACING
          result.push({ x, y, pitchClass: pc, isRoot: pc === root, isPlaying: playing })
        }
      }
    }
    return result
  }, [tones, root, tuning, playingSet])

  if (!font || !labelFont) return null

  return (
    <View>
      <Canvas style={{ width: totalWidth, height: totalHeight }}>
        {shapeHighlightRect && (
          <Rect
            x={shapeHighlightRect.x}
            y={TOP_MARGIN - 4}
            width={shapeHighlightRect.width}
            height={(STRING_COUNT - 1) * STRING_SPACING + 8}
            color={SHAPE_HIGHLIGHT_COLOR}
          />
        )}

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

        {shapeHighlightRect && (
          <>
            <Line
              p1={vec(shapeHighlightRect.x, TOP_MARGIN - 4)}
              p2={vec(shapeHighlightRect.x, TOP_MARGIN + (STRING_COUNT - 1) * STRING_SPACING + 4)}
              color={SHAPE_BORDER_COLOR}
              strokeWidth={2}
            />
            <Line
              p1={vec(shapeHighlightRect.x + shapeHighlightRect.width, TOP_MARGIN - 4)}
              p2={vec(shapeHighlightRect.x + shapeHighlightRect.width, TOP_MARGIN + (STRING_COUNT - 1) * STRING_SPACING + 4)}
              color={SHAPE_BORDER_COLOR}
              strokeWidth={2}
            />
          </>
        )}

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

        {/* ── Scale tone positions (non-playing, render first / underneath) ── */}
        {highlights
          .filter(h => !h.isPlaying)
          .map(({ x, y, pitchClass, isRoot }, idx) => {
            const cx = x === LEFT_MARGIN
              ? LEFT_MARGIN - FRET_WIDTH / 2 + 4
              : x - FRET_WIDTH / 2
            const fillColor = isRoot ? ROOT_COLOR : TONE_COLOR
            const textColor = isRoot ? ROOT_TEXT_COLOR : TONE_TEXT_COLOR
            const label = pitchClass.replace("#", "♯")
            const textX = cx - (label.length > 1 ? 7 : 4)
            return (
              <React.Fragment key={`hl-scale-${idx}`}>
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

        {/* ── Playing positions (render on top with glow + larger dot) ── */}
        {highlights
          .filter(h => h.isPlaying)
          .map(({ x, y, pitchClass, isRoot }, idx) => {
            const cx = x === LEFT_MARGIN
              ? LEFT_MARGIN - FRET_WIDTH / 2 + 4
              : x - FRET_WIDTH / 2
            const fillColor = isRoot ? PLAYING_ROOT_COLOR : PLAYING_COLOR
            const label = pitchClass.replace("#", "♯")
            const textX = cx - (label.length > 1 ? 7 : 4)
            return (
              <React.Fragment key={`hl-play-${idx}`}>
                {/* Glow ring */}
                <Circle cx={cx} cy={y} r={PLAYING_DOT_RADIUS + 4} color={PLAYING_GLOW_COLOR} />
                {/* Dot */}
                <Circle cx={cx} cy={y} r={PLAYING_DOT_RADIUS} color={fillColor} />
                <SkiaText
                  x={textX}
                  y={y + 4}
                  text={label}
                  font={font}
                  color="#fff"
                />
              </React.Fragment>
            )
          })}

      </Canvas>

      <View style={styles.shapeSection}>
        <Text style={styles.shapeTitle}>自动识别指型</Text>
        <View style={styles.shapeRow}>
          {CAGED_SHAPES.map((shape) => {
            const active = detectedShape?.name === shape
            return (
              <View key={`shape-${shape}`} style={[styles.shapeChip, active && styles.shapeChipActive]}>
                <Text style={[styles.shapeChipText, active && styles.shapeChipTextActive]}>
                  {shape} 形
                </Text>
              </View>
            )
          })}
        </View>
        <Text style={styles.shapeHint}>
          {detectedShape
            ? `当前匹配 ${detectedShape.name} 形，已高亮第 ${detectedShape.rangeStart}–${detectedShape.rangeEnd} 品`
            : "当前没有足够的按弦位置来判断 CAGED 指型"}
        </Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PLAYING_ROOT_COLOR }]} />
          <Text style={styles.legendText}>演奏中（根音）</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PLAYING_COLOR }]} />
          <Text style={styles.legendText}>演奏中</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: ROOT_COLOR }]} />
          <Text style={styles.legendText}>根音</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: TONE_COLOR }]} />
          <Text style={styles.legendText}>音阶音</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shapeSection: {
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 8,
  },
  shapeTitle: {
    fontSize: 12,
    color: "#d1d5db",
    fontWeight: "600",
  },
  shapeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  shapeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  shapeChipActive: {
    backgroundColor: "#082f49",
    borderColor: "#38bdf8",
  },
  shapeChipText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  shapeChipTextActive: {
    color: "#e0f2fe",
  },
  shapeHint: {
    fontSize: 11,
    color: "#94a3b8",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: "#9ca3af",
  },
})
