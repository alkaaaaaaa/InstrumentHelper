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

const OCTAVES = [3, 4]

type Props = {
  tones: string[]
  root: string
}

function isRoot(noteName: string, root: string) {
  return noteName === root
}

function isTone(noteName: string, tones: string[]) {
  return tones.includes(noteName)
}

function WhiteKey({ noteName, tones, root }: { noteName: string; tones: string[]; root: string }) {
  const highlighted = isTone(noteName, tones)
  const rootKey = isRoot(noteName, root)

  return (
    <View
      style={[
        styles.whiteKey,
        highlighted && !rootKey && styles.whiteKeyTone,
        rootKey && styles.whiteKeyRoot,
      ]}
    >
      {highlighted && (
        <Text style={[styles.keyLabel, rootKey ? styles.rootLabel : styles.toneLabel]}>
          {noteName}
        </Text>
      )}
    </View>
  )
}

function BlackKey({ noteName, tones, root, offsetX }: { noteName: string; tones: string[]; root: string; offsetX: number }) {
  const highlighted = isTone(noteName, tones)
  const rootKey = isRoot(noteName, root)

  return (
    <View
      style={[
        styles.blackKey,
        { left: offsetX },
        highlighted && !rootKey && styles.blackKeyTone,
        rootKey && styles.blackKeyRoot,
      ]}
    >
      {highlighted && (
        <Text style={[styles.keyLabelBlack, rootKey ? styles.rootLabelBlack : styles.toneLabelBlack]}>
          {noteName.replace("#", "♯")}
        </Text>
      )}
    </View>
  )
}

export function PianoKeyboard({ tones, root }: Props) {
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
                    tones={tones}
                    root={root}
                  />
                ))}
              </View>

              {/* Black keys (absolute positioned) */}
              {BLACK_KEYS.map(({ afterWhite, name }) => {
                // Black key left edge = afterWhite * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH/2
                const offsetX = afterWhite * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
                return (
                  <BlackKey
                    key={`${name}${octave}`}
                    noteName={name}
                    tones={tones}
                    root={root}
                    offsetX={offsetX}
                  />
                )
              })}

              {/* Octave label */}
              <Text style={styles.octaveLabel}>{octave}</Text>
            </View>
          )
        })}
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
    paddingBottom: 8,
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
  octaveLabel: {
    position: "absolute",
    bottom: 0,
    left: 2,
    fontSize: 9,
    color: "#9e9e9e",
  },
})
