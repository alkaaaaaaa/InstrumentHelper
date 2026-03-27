export const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const

export type PitchClass = (typeof PITCH_CLASSES)[number]

export type ChordTemplate = {
  key: string
  displayName: string
  chineseName: string
  suffix: string
  formula: string
  intervals: number[]
  character: string
}

export const CHORD_TEMPLATES: ChordTemplate[] = [
  { key: "Major", displayName: "Major", chineseName: "大三和弦", suffix: "", formula: "1-3-5", intervals: [0, 4, 7], character: "明亮、稳定。" },
  { key: "Minor", displayName: "Minor", chineseName: "小三和弦", suffix: "m", formula: "1-b3-5", intervals: [0, 3, 7], character: "偏内敛、忧郁。" },
  { key: "Diminished", displayName: "Diminished", chineseName: "减三和弦", suffix: "dim", formula: "1-b3-b5", intervals: [0, 3, 6], character: "紧张感强。" },
  { key: "Augmented", displayName: "Augmented", chineseName: "增三和弦", suffix: "aug", formula: "1-3-#5", intervals: [0, 4, 8], character: "悬浮、不稳定。" },
  { key: "Dom7", displayName: "Dom7", chineseName: "属七和弦", suffix: "7", formula: "1-3-5-b7", intervals: [0, 4, 7, 10], character: "强回归感。" },
  { key: "Maj7", displayName: "Maj7", chineseName: "大七和弦", suffix: "maj7", formula: "1-3-5-7", intervals: [0, 4, 7, 11], character: "柔和、城市感。" },
  { key: "Min7", displayName: "Min7", chineseName: "小七和弦", suffix: "m7", formula: "1-b3-5-b7", intervals: [0, 3, 7, 10], character: "温和小调色彩。" },
  { key: "Dim7", displayName: "Dim7", chineseName: "减七和弦", suffix: "dim7", formula: "1-b3-b5-bb7", intervals: [0, 3, 6, 9], character: "高度紧张。" },
  { key: "HalfDim7", displayName: "HalfDim7", chineseName: "半减七和弦", suffix: "m7b5", formula: "1-b3-b5-b7", intervals: [0, 3, 6, 10], character: "比减七更柔和。" },
  { key: "Sus2", displayName: "Sus2", chineseName: "挂二和弦", suffix: "sus2", formula: "1-2-5", intervals: [0, 2, 7], character: "开放感强。" },
  { key: "Sus4", displayName: "Sus4", chineseName: "挂四和弦", suffix: "sus4", formula: "1-4-5", intervals: [0, 5, 7], character: "悬念感明显。" },
  { key: "Maj6", displayName: "Maj6", chineseName: "大六和弦", suffix: "6", formula: "1-3-5-6", intervals: [0, 4, 7, 9], character: "温暖、复古。" },
  { key: "Min6", displayName: "Min6", chineseName: "小六和弦", suffix: "m6", formula: "1-b3-5-6", intervals: [0, 3, 7, 9], character: "小调中带亮度。" },
  { key: "Add9", displayName: "Add9", chineseName: "加九和弦", suffix: "add9", formula: "1-3-5-9", intervals: [0, 2, 4, 7], character: "清新通透。" },
  { key: "MinAdd9", displayName: "MinAdd9", chineseName: "小加九和弦", suffix: "madd9", formula: "1-b3-5-9", intervals: [0, 2, 3, 7], character: "小调情绪与空气感并存。" }
]

export type ChordEntry = {
  symbol: string
  root: PitchClass
  template: ChordTemplate
  tones: string[]
}

function rootAlias(root: PitchClass): string {
  if (!root.includes("#")) return root
  return `#${root[0]}`
}

export function tonesFrom(root: PitchClass, intervals: number[]): string[] {
  const rootIndex = PITCH_CLASSES.indexOf(root)
  return intervals.map((step) => PITCH_CLASSES[(rootIndex + step) % 12])
}

export function buildChordEntry(root: PitchClass, template: ChordTemplate): ChordEntry {
  return {
    symbol: `${root}${template.suffix}`,
    root,
    template,
    tones: tonesFrom(root, template.intervals)
  }
}

export const ALL_CHORD_ENTRIES: ChordEntry[] = PITCH_CLASSES.flatMap((root) =>
  CHORD_TEMPLATES.map((template) => buildChordEntry(root, template))
)

export function getChordBySymbol(symbol: string): ChordEntry | null {
  const normalized = decodeURIComponent(symbol).trim()
  const bySymbol = ALL_CHORD_ENTRIES.find((item) => item.symbol.toLowerCase() === normalized.toLowerCase())
  if (bySymbol) return bySymbol

  // Support alias style like #Gsus4 -> G#sus4
  const aliasFixed = normalized.replace(/^#([A-G])/, "$1#")
  const byAlias = ALL_CHORD_ENTRIES.find((item) => item.symbol.toLowerCase() === aliasFixed.toLowerCase())
  return byAlias ?? null
}

export function displayRoot(root: PitchClass): string {
  const alias = rootAlias(root)
  return alias === root ? root : `${root}（也可写作 ${alias}）`
}
