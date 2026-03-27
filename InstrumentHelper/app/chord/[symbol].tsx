import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { getChordBySymbol } from "../../utils/chordLibrary"

const TYPE_COLORS: Record<string, { accent: string; light: string; border: string }> = {
  Major:      { accent: "#2563EB", light: "#EFF6FF", border: "#BFDBFE" },
  Minor:      { accent: "#7C3AED", light: "#F5F3FF", border: "#DDD6FE" },
  Diminished: { accent: "#DC2626", light: "#FEF2F2", border: "#FECACA" },
  Augmented:  { accent: "#EA580C", light: "#FFF7ED", border: "#FED7AA" },
  Dom7:       { accent: "#D97706", light: "#FFFBEB", border: "#FDE68A" },
  Maj7:       { accent: "#059669", light: "#ECFDF5", border: "#A7F3D0" },
  Min7:       { accent: "#16A34A", light: "#F0FDF4", border: "#BBF7D0" },
  Dim7:       { accent: "#E11D48", light: "#FFF1F2", border: "#FECDD3" },
  HalfDim7:   { accent: "#A21CAF", light: "#FDF4FF", border: "#F0ABFC" },
  Sus2:       { accent: "#0284C7", light: "#F0F9FF", border: "#BAE6FD" },
  Sus4:       { accent: "#4338CA", light: "#EEF2FF", border: "#C7D2FE" },
  Maj6:       { accent: "#CA8A04", light: "#FEFCE8", border: "#FEF08A" },
  Min6:       { accent: "#65A30D", light: "#F7FEE7", border: "#D9F99D" },
  Add9:       { accent: "#0891B2", light: "#ECFEFF", border: "#A5F3FC" },
  MinAdd9:    { accent: "#DB2777", light: "#FDF2F8", border: "#F9A8D4" },
}

// 对应度数名称
const INTERVAL_NAMES: Record<number, string> = {
  0: "根音",
  1: "小二度",
  2: "大二度",
  3: "小三度",
  4: "大三度",
  5: "纯四度",
  6: "减五度",
  7: "纯五度",
  8: "增五度",
  9: "大六度",
  10: "小七度",
  11: "大七度",
}

// 公式各度对应描述
const FORMULA_NOTES: Record<string, string[]> = {
  Major:      ["根音", "大三度", "纯五度"],
  Minor:      ["根音", "小三度", "纯五度"],
  Diminished: ["根音", "小三度", "减五度"],
  Augmented:  ["根音", "大三度", "增五度"],
  Dom7:       ["根音", "大三度", "纯五度", "小七度"],
  Maj7:       ["根音", "大三度", "纯五度", "大七度"],
  Min7:       ["根音", "小三度", "纯五度", "小七度"],
  Dim7:       ["根音", "小三度", "减五度", "减七度"],
  HalfDim7:   ["根音", "小三度", "减五度", "小七度"],
  Sus2:       ["根音", "大二度", "纯五度"],
  Sus4:       ["根音", "纯四度", "纯五度"],
  Maj6:       ["根音", "大三度", "纯五度", "大六度"],
  Min6:       ["根音", "小三度", "纯五度", "大六度"],
  Add9:       ["根音", "大二度", "大三度", "纯五度"],
  MinAdd9:    ["根音", "大二度", "小三度", "纯五度"],
}

const CHORD_CONTEXT: Record<string, { use: string; example: string; tip: string }> = {
  Major:      { use: "歌曲的主和弦、结尾稳定落点。", example: "C → G → Am → F 中的 C 和 G。", tip: "弹大三和弦后再弹对应的小三和弦，感受明暗对比。" },
  Minor:      { use: "营造内敛、忧郁的情绪，常见于副歌和过渡。", example: "Am → F → C → G 中的 Am。", tip: "小调歌曲通常以 vi 级小三和弦开始，试试 Am 大调里的 vi。" },
  Diminished: { use: "半音过渡、制造紧张感，常用于经过和弦。", example: "C → C#dim → Dm。", tip: "减三和弦常出现在上行半音进行中，试试 C-C#dim-Dm 这段。" },
  Augmented:  { use: "增添悬浮感，常用于属和弦前的修饰。", example: "Caug → F。", tip: "增三和弦每隔大三度对称，转位听起来一样。" },
  Dom7:       { use: "属功能，制造强烈的回归期待，常在 I 级前。", example: "G7 → C。", tip: "弹 G7 之后接 C，感受最经典的终止式。" },
  Maj7:       { use: "柔和、都市感，R&B/Jazz/流行抒情常用。", example: "Cmaj7 → Am7 → Dm7 → G7。", tip: "大七度音与根音形成小二度，听感温柔而不失张力。" },
  Min7:       { use: "ii-V-I 进行中的 ii 级，情绪温和。", example: "Dm7 → G7 → Cmaj7。", tip: "在 C 大调里，Dm7 是最常见的小七和弦进行起点。" },
  Dim7:       { use: "高度紧张，常用于半音连接和转调桥梁。", example: "G → G#dim7 → Am。", tip: "减七和弦的四个音等距，任一音都可以做根音。" },
  HalfDim7:   { use: "比减七柔和，写作 m7b5，常见于 ii 在小调中。", example: "Bm7b5 → E7 → Am。", tip: "在 A 小调 ii-V-I 中，Bm7b5 是标准的 ii 级。" },
  Sus2:       { use: "开放感，民谣和流行的常用铺底和弦。", example: "Dsus2 → D。", tip: "Sus2 和 Sus4 都是悬挂和弦，无三度，不分大小调。" },
  Sus4:       { use: "制造悬念，常落回大三或小三和弦。", example: "Csus4 → C。", tip: "Csus4 = C-F-G，解决到 C = C-E-G，F 下行到 E。" },
  Maj6:       { use: "温暖复古，爵士与流行都常见，可替代 Maj7。", example: "C6 代替 Cmaj7 用于更复古的感觉。", tip: "C6 与 Am7 组成音相同，两者可互换使用。" },
  Min6:       { use: "小调带亮度，色彩独特，常见于爵士小调进行。", example: "Cm6 → Dm7b5 → G7。", tip: "小六和弦中的大六度让小调带来一丝明亮感。" },
  Add9:       { use: "清新通透，副歌和间奏常用，比 Maj7 更简洁。", example: "Cadd9 → Gadd9 → Am7 → Fadd9。", tip: "Add9 不含七度，比 9th 和弦更干净。" },
  MinAdd9:    { use: "小调情绪与空气感并存，Neo-Soul 常用。", example: "Cmadd9 在低沉的 Neo-Soul 旋律中。", tip: "小加九和弦的二度音加进来让小调更有空间感。" },
}

export default function ChordDetailPage() {
  const router = useRouter()
  const params = useLocalSearchParams<{ symbol?: string }>()
  const symbol = params.symbol ?? ""
  const chord = getChordBySymbol(symbol)

  if (!chord) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "未找到" }} />
        <Text style={styles.notFoundTitle}>未找到该和弦</Text>
        <Text style={styles.notFoundDesc}>请从学习页面的和弦列表重新进入。</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
      </View>
    )
  }

  const color = TYPE_COLORS[chord.template.key] ?? TYPE_COLORS["Major"]
  const formulaNotes = FORMULA_NOTES[chord.template.key] ?? []
  const context = CHORD_CONTEXT[chord.template.key]

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: chord.symbol,
          headerStyle: { backgroundColor: color.light },
          headerTintColor: color.accent,
          headerTitleStyle: { color: "#0F172A", fontWeight: "700" },
        }}
      />

      {/* 顶部标题区 */}
      <View style={[styles.heroCard, { backgroundColor: color.light, borderColor: color.border }]}>
        <Text style={[styles.heroSymbol, { color: color.accent }]}>{chord.symbol}</Text>
        <Text style={styles.heroChinese}>{chord.template.chineseName}</Text>
        <View style={[styles.formulaBadge, { backgroundColor: color.accent }]}>
          <Text style={styles.formulaBadgeText}>公式 {chord.template.formula}</Text>
        </View>
      </View>

      {/* 组成音 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>组成音</Text>
        <View style={styles.tonesRow}>
          {chord.tones.map((tone, index) => {
            const isRoot = index === 0
            const degreeName = formulaNotes[index] ?? INTERVAL_NAMES[chord.template.intervals[index] ?? 0]
            return (
              <View
                key={`${tone}-${index}`}
                style={[
                  styles.toneChip,
                  isRoot
                    ? { backgroundColor: color.accent, borderColor: color.accent }
                    : { backgroundColor: "#fff", borderColor: color.border },
                ]}
              >
                <Text style={[styles.toneNote, { color: isRoot ? "#fff" : color.accent }]}>{tone}</Text>
                <Text style={[styles.toneDegree, { color: isRoot ? "rgba(255,255,255,0.8)" : "#94A3B8" }]}>
                  {degreeName}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 音程结构 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>音程结构（半音数）</Text>
        <View style={styles.intervalsRow}>
          {chord.template.intervals.map((interval, i) => (
            <View key={i} style={[styles.intervalChip, { borderColor: color.border }]}>
              <Text style={[styles.intervalNum, { color: color.accent }]}>{interval}</Text>
              <Text style={styles.intervalName}>{INTERVAL_NAMES[interval] ?? `+${interval}`}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 听感说明 */}
      <View style={[styles.sectionCard, { backgroundColor: color.light, borderColor: color.border }]}>
        <Text style={styles.sectionLabel}>听感 / 情绪</Text>
        <Text style={styles.descText}>{chord.template.character}</Text>
      </View>

      {/* 实际使用 */}
      {context && (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>常见用途</Text>
            <Text style={styles.descText}>{context.use}</Text>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>典型例子</Text>
            <Text style={[styles.descText, styles.exampleText]}>{context.example}</Text>
          </View>
          <View style={[styles.sectionCard, { borderColor: color.border }]}>
            <Text style={styles.sectionLabel}>练习小提示</Text>
            <Text style={styles.descText}>{context.tip}</Text>
          </View>
        </>
      )}

      <Pressable
        style={[styles.backBtn, { backgroundColor: color.accent }]}
        onPress={() => router.back()}
      >
        <Text style={styles.backBtnText}>← 返回学习页</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
    backgroundColor: "#F8FAFC",
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
    backgroundColor: "#F8FAFC",
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  notFoundDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  // 顶部 Hero 卡片
  heroCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    gap: 4,
    alignItems: "flex-start",
  },
  heroSymbol: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroChinese: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },
  formulaBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  formulaBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace" as const,
  },
  // 通用 section 卡片
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  // 组成音行
  tonesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toneChip: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
    minWidth: 60,
  },
  toneNote: {
    fontSize: 18,
    fontWeight: "700",
  },
  toneDegree: {
    fontSize: 10,
    fontWeight: "500",
  },
  // 音程结构行
  intervalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intervalChip: {
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 2,
    minWidth: 52,
  },
  intervalNum: {
    fontSize: 16,
    fontWeight: "700",
  },
  intervalName: {
    fontSize: 10,
    color: "#94A3B8",
  },
  // 文字描述
  descText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },
  exampleText: {
    fontStyle: "italic" as const,
    color: "#475569",
  },
  // 返回按钮
  backBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
})
