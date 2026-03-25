import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { Measure } from "../../models/Score"
import { scoreApi, DetectionResult } from "../../utils/api"
import { PianoKeyboard } from "./PianoKeyboard"
import { GuitarFretboard } from "./GuitarFretboard"

const DEFAULT_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"]

const FLAT_TO_SHARP: Record<string, string> = {
  Cb: "B", Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#",
}

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

function pitchToClass(pitch: string): string {
  const match = pitch.match(/^([A-G][#b]?)/)
  if (!match) return "C"
  return FLAT_TO_SHARP[match[1]] ?? match[1]
}

function fretToPitchClass(stringNum: number, fret: number, tuning: string[]): string {
  const openPitch = tuning[6 - stringNum] ?? "E4"
  const match = openPitch.match(/^([A-G][#b]?)/)
  if (!match) return "C"
  const openClass = FLAT_TO_SHARP[match[1]] ?? match[1]
  const openIdx = PITCH_CLASSES.indexOf(openClass)
  if (openIdx === -1) return "C"
  return PITCH_CLASSES[(openIdx + fret) % 12]
}

type ViewMode = "keyboard" | "fretboard"

type Props = {
  visible: boolean
  onClose: () => void
  measure: Measure | null
  tuning?: string[]
  measureIndex: number
  /** Current playback beat within this measure; null = not playing (show all notes) */
  currentBeat?: number | null
}

export function ChordScaleModal({ visible, onClose, measure, tuning, measureIndex, currentBeat }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("keyboard")
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveTuning = tuning?.length ? tuning : DEFAULT_TUNING

  // Pitch classes of notes sounding at currentBeat (or all notes when no beat given)
  const playingPitchClasses = useMemo(() => {
    if (!measure) return []
    const noteFilter = (start: number, duration: number) =>
      currentBeat == null || (start <= currentBeat && currentBeat < start + duration)

    const fromNotes = (measure.notes ?? [])
      .filter(n => noteFilter(n.start, n.duration))
      .map(n => pitchToClass(n.pitch))

    const fromTab = (measure.tabNotes ?? [])
      .filter(n => noteFilter(n.beat, n.duration ?? 1))
      .map(n => fretToPitchClass(n.string, n.fret, effectiveTuning))

    return [...new Set([...fromNotes, ...fromTab])]
  }, [measure, effectiveTuning, currentBeat])

  // Specific (string, fret) positions sounding at currentBeat (or all tab notes)
  const playingTabPositions = useMemo(() => {
    if (!measure) return []
    return (measure.tabNotes ?? [])
      .filter(n =>
        currentBeat == null ||
        (n.beat <= currentBeat && currentBeat < n.beat + (n.duration ?? 1))
      )
      .map(n => ({ string: n.string, fret: n.fret }))
  }, [measure, currentBeat])

  const analyze = useCallback(async () => {
    if (!measure) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await scoreApi.analyzeChord({
        notes: measure.notes,
        tabNotes: measure.tabNotes,
        tuning: effectiveTuning,
      })
      setResult(data)
    } catch {
      setError("无法连接后端，请确认服务已启动")
    } finally {
      setLoading(false)
    }
  }, [measure, effectiveTuning])

  useEffect(() => {
    if (visible && measure) {
      analyze()
    }
  }, [visible, measure])

  const typeLabel =
    result?.type === "chord" ? "和弦" :
    result?.type === "scale" ? "音阶" : ""

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>小节 {measureIndex + 1} 的和弦/音阶</Text>
              {currentBeat != null && (
                <Text style={styles.beatIndicator}>
                  ▶ 第 {currentBeat + 1} 拍
                  {playingPitchClasses.length > 0
                    ? `  ·  ${playingPitchClasses.join(" ")}`
                    : "  ·  休止"}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Detection result */}
          <View style={styles.resultArea}>
            {loading && (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingText}>分析中...</Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={analyze}>
                  <Text style={styles.retryBtnText}>重试</Text>
                </TouchableOpacity>
              </View>
            )}

            {result && !loading && (
              <View>
                {result.type === "unknown" ? (
                  <Text style={styles.unknownText}>{result.name}</Text>
                ) : (
                  <>
                    <View style={styles.resultRow}>
                      <View style={[styles.typeBadge, result.type === "chord" ? styles.chordBadge : styles.scaleBadge]}>
                        <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                      </View>
                      <Text style={styles.resultName}>{result.name}</Text>
                    </View>
                    <Text style={styles.tonesText}>
                      {result.tones.join(" · ")}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* View toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "keyboard" && styles.toggleBtnActive]}
              onPress={() => setViewMode("keyboard")}
            >
              <Text style={[styles.toggleBtnText, viewMode === "keyboard" && styles.toggleBtnTextActive]}>
                🎹 键盘
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "fretboard" && styles.toggleBtnActive]}
              onPress={() => setViewMode("fretboard")}
            >
              <Text style={[styles.toggleBtnText, viewMode === "fretboard" && styles.toggleBtnTextActive]}>
                🎸 吉他指板
              </Text>
            </TouchableOpacity>
          </View>

          {/* Visualization */}
          <ScrollView style={styles.vizContainer} horizontal={viewMode === "fretboard"}>
            {result && result.type !== "unknown" ? (
              viewMode === "keyboard" ? (
                <PianoKeyboard
                  tones={result.tones}
                  root={result.root}
                  playingNotes={playingPitchClasses}
                />
              ) : (
                <GuitarFretboard
                  tones={result.tones}
                  root={result.root}
                  tuning={effectiveTuning}
                  playingPositions={playingTabPositions}
                />
              )
            ) : (
              !loading && (
                <View style={styles.emptyViz}>
                  <Text style={styles.emptyVizText}>
                    {result ? "音符太少或结构未识别" : "等待分析结果..."}
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    minHeight: 360,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d2d4e",
  },
  title: {
    color: "#e0e0e0",
    fontSize: 15,
    fontWeight: "600",
  },
  beatIndicator: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: "#9e9e9e",
    fontSize: 18,
  },
  resultArea: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 64,
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#9e9e9e",
    fontSize: 13,
  },
  errorText: {
    color: "#ef9a9a",
    fontSize: 13,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#2d2d4e",
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#e0e0e0",
    fontSize: 13,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chordBadge: {
    backgroundColor: "#1B5E20",
  },
  scaleBadge: {
    backgroundColor: "#0D47A1",
  },
  typeBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  resultName: {
    color: "#e0e0e0",
    fontSize: 18,
    fontWeight: "700",
  },
  tonesText: {
    color: "#81C784",
    fontSize: 13,
    letterSpacing: 1,
  },
  unknownText: {
    color: "#9e9e9e",
    fontSize: 14,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#2d2d4e",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#388E3C",
  },
  toggleBtnText: {
    color: "#9e9e9e",
    fontSize: 13,
    fontWeight: "500",
  },
  toggleBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  vizContainer: {
    paddingHorizontal: 8,
    flexGrow: 0,
  },
  emptyViz: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyVizText: {
    color: "#616161",
    fontSize: 13,
  },
})
