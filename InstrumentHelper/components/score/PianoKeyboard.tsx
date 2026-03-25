import React from "react"
import { View, Text, StyleSheet, ScrollView } from "react-native"

// Layout constants
const WHITE_KEY_WIDTH = 28
const WHITE_KEY_HEIGHT = 100
const BLACK_KEY_WIDTH = 18
const BLACK_KEY_HEIGHT = 62

// Colors
const ROOT_COLOR = "#388E3C"
const TONE_COLOR = "#81C784"
const ROOT_TEXT_COLOR = "#fff"
const TONE_TEXT_COLOR = "#1B5E20"
const PLAYING_COLOR = "#F59E0B"
const PLAYING_ROOT_COLOR = "#D97706"
const PLAYING_TEXT_COLOR = "#fff"

// White keys per octave: C D E F G A B
const WHITE_NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"]
// Black keys per octave: position (index among white keys) and note name
const BLACK_KEYS = [
  { afterWhite: 0, name: "C#" },
  { afterWhite: 1, name: "D#" },
  { afterWhite: 3, name: "F#" },
  { afterWhite: 4, name: "G#" },
  { afterWhite: 5, name: "A#" },
]

const OCTAVES = [2, 3, 4, 5, 6]

type Props = {
  tones: string[]
  root: string
  /**
   * Full pitch names WITH octave of notes actually present in the current beat/measure.
   * e.g. ["C4", "D#3", "A#5"]  — only those exact keys will be highlighted amber.
   */
  playingNotes?: string[]
}

function isRoot(noteName: string, root: string) {
  return noteName === root
}

function isTone(noteName: string, tones: string[]) {
  return tones.includes(noteName)
}

/** noteName = pitch class (e.g. "C#"), octave = number (e.g. 4) */
function isPlayingKey(noteName: string, octave: number, playingNotes?: string[]) {
  const full = `${noteName}${octave}`
  return (playingNotes ?? []).includes(full)
}

function WhiteKey({
  noteName,
  octave,
  tones,
  root,
  playingNotes,
}: {
  noteName: string
  octave: number
  tones: string[]
  root: string
  playingNotes?: string[]
}) {
  const highlighted = isTone(noteName, tones)
  const rootKey = isRoot(noteName, root)
  const playing = isPlayingKey(noteName, octave, playingNotes)

  const keyStyle = playing
    ? rootKey
      ? styles.whiteKeyPlayingRoot
      : styles.whiteKeyPlaying
    : rootKey
    ? styles.whiteKeyRoot
    : highlighted
    ? styles.whiteKeyTone
    : null

  const showLabel = highlighted || playing
  const labelStyle = playing
    ? styles.playingLabel
    : rootKey
    ? styles.rootLabel
    : styles.toneLabel

  return (
    <View style={[styles.whiteKey, keyStyle]}>
      {showLabel && (
        <Text style={[styles.keyLabel, labelStyle]}>{noteName}</Text>
      )}
    </View>
  )
}

function BlackKey({
  noteName,
  octave,
  tones,
  root,
  offsetX,
  playingNotes,
}: {
  noteName: string
  octave: number
  tones: string[]
  root: string
  offsetX: number
  playingNotes?: string[]
}) {
  const highlighted = isTone(noteName, tones)
  const rootKey = isRoot(noteName, root)
  const playing = isPlayingKey(noteName, octave, playingNotes)

  const keyStyle = playing
    ? rootKey
      ? styles.blackKeyPlayingRoot
      : styles.blackKeyPlaying
    : rootKey
    ? styles.blackKeyRoot
    : highlighted
    ? styles.blackKeyTone
    : null

  const showLabel = highlighted || playing
  const labelStyle = playing
    ? styles.playingLabelBlack
    : rootKey
    ? styles.rootLabelBlack
    : styles.toneLabelBlack

  return (
    <View style={[styles.blackKey, { left: offsetX }, keyStyle]}>
      {showLabel && (
        <Text style={[styles.keyLabelBlack, labelStyle]}>
          {noteName.replace("#", "♯")}
        </Text>
      )}
    </View>
  )
}

export function PianoKeyboard({ tones, root, playingNotes }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.container}>
        {OCTAVES.map((octave) => {
          const octaveWidth = WHITE_NOTE_NAMES.length * WHITE_KEY_WIDTH
          return (
            <View key={octave} style={[styles.octave, { width: octaveWidth }]}>
              {/* White keys */}
              <View style={styles.whiteRow}>
                {WHITE_NOTE_NAMES.map((noteName) => (
                  <WhiteKey
                    key={`${noteName}${octave}`}
                    noteName={noteName}
                    octave={octave}
                    tones={tones}
                    root={root}
                    playingNotes={playingNotes}
                  />
                ))}
              </View>

              {/* Black keys (absolute positioned) */}
              {BLACK_KEYS.map(({ afterWhite, name }) => {
                const offsetX = afterWhite * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
                return (
                  <BlackKey
                    key={`${name}${octave}`}
                    noteName={name}
                    octave={octave}
                    tones={tones}
                    root={root}
                    offsetX={offsetX}
                    playingNotes={playingNotes}
                  />
                )
              })}

              {/* Octave label */}
              <Text style={styles.octaveLabel}>{octave}</Text>
            </View>
          )
        })}
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  octave: {
    position: "relative",
    height: WHITE_KEY_HEIGHT + 20,
  },
  whiteRow: {
    flexDirection: "row",
    position: "absolute",
    top: 0,
    left: 0,
  },
  whiteKey: {
    width: WHITE_KEY_WIDTH,
    height: WHITE_KEY_HEIGHT,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    backgroundColor: "#fff",
    borderRadius: 3,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 4,
    marginRight: 1,
  },
  whiteKeyTone: {
    backgroundColor: TONE_COLOR,
  },
  whiteKeyRoot: {
    backgroundColor: ROOT_COLOR,
  },
  whiteKeyPlaying: {
    backgroundColor: PLAYING_COLOR,
    borderWidth: 2,
    borderColor: "#fff",
  },
  whiteKeyPlayingRoot: {
    backgroundColor: PLAYING_ROOT_COLOR,
    borderWidth: 2,
    borderColor: "#fff",
  },
  blackKey: {
    position: "absolute",
    top: 0,
    width: BLACK_KEY_WIDTH,
    height: BLACK_KEY_HEIGHT,
    backgroundColor: "#212121",
    borderRadius: 3,
    zIndex: 10,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 4,
  },
  blackKeyTone: {
    backgroundColor: "#2E7D32",
  },
  blackKeyRoot: {
    backgroundColor: "#1B5E20",
  },
  blackKeyPlaying: {
    backgroundColor: "#D97706",
  },
  blackKeyPlayingRoot: {
    backgroundColor: "#92400E",
    borderWidth: 1.5,
    borderColor: PLAYING_COLOR,
  },
  keyLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  keyLabelBlack: {
    fontSize: 8,
    fontWeight: "600",
  },
  rootLabel: {
    color: ROOT_TEXT_COLOR,
  },
  toneLabel: {
    color: TONE_TEXT_COLOR,
  },
  rootLabelBlack: {
    color: "#fff",
  },
  toneLabelBlack: {
    color: "#C8E6C9",
  },
  playingLabel: {
    color: PLAYING_TEXT_COLOR,
  },
  playingLabelBlack: {
    color: "#fff",
  },
  octaveLabel: {
    position: "absolute",
    bottom: 0,
    left: 2,
    fontSize: 9,
    color: "#9e9e9e",
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
    color: "#9e9e9e",
  },
})
