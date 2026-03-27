import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { CHORD_TEMPLATES, PITCH_CLASSES, buildChordEntry } from "../../utils/chordLibrary"

// 颜色映射：根据和弦类别赋予不同色调
const TYPE_COLORS: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
  Major:      { bg: "#EFF6FF", border: "#BFDBFE", badge: "#2563EB", badgeText: "#fff" },
  Minor:      { bg: "#F5F3FF", border: "#DDD6FE", badge: "#7C3AED", badgeText: "#fff" },
  Diminished: { bg: "#FEF2F2", border: "#FECACA", badge: "#DC2626", badgeText: "#fff" },
  Augmented:  { bg: "#FFF7ED", border: "#FED7AA", badge: "#EA580C", badgeText: "#fff" },
  Dom7:       { bg: "#FFFBEB", border: "#FDE68A", badge: "#D97706", badgeText: "#fff" },
  Maj7:       { bg: "#ECFDF5", border: "#A7F3D0", badge: "#059669", badgeText: "#fff" },
  Min7:       { bg: "#F0FDF4", border: "#BBF7D0", badge: "#16A34A", badgeText: "#fff" },
  Dim7:       { bg: "#FFF1F2", border: "#FECDD3", badge: "#E11D48", badgeText: "#fff" },
  HalfDim7:   { bg: "#FDF4FF", border: "#F0ABFC", badge: "#A21CAF", badgeText: "#fff" },
  Sus2:       { bg: "#F0F9FF", border: "#BAE6FD", badge: "#0284C7", badgeText: "#fff" },
  Sus4:       { bg: "#EEF2FF", border: "#C7D2FE", badge: "#4338CA", badgeText: "#fff" },
  Maj6:       { bg: "#FEFCE8", border: "#FEF08A", badge: "#CA8A04", badgeText: "#fff" },
  Min6:       { bg: "#F7FEE7", border: "#D9F99D", badge: "#65A30D", badgeText: "#fff" },
  Add9:       { bg: "#ECFEFF", border: "#A5F3FC", badge: "#0891B2", badgeText: "#fff" },
  MinAdd9:    { bg: "#FDF2F8", border: "#F9A8D4", badge: "#DB2777", badgeText: "#fff" },
}

const BASIC_SECTIONS = [
  {
    id: "guide",
    title: "乐理学习指南",
    summary: "先理解结构，再上手弹，最后靠耳朵记。",
    points: [
      "建议顺序：和弦结构 → 常见进行 → 音阶与调式 → 实际伴奏应用。",
      "每学完一个概念，立刻在琴上弹 2-3 次，耳朵比记忆更可靠。",
      "使用级数思维（I、ii、V），可以快速移调到任意调。",
    ],
  },
  {
    id: "scale",
    title: "音阶速记",
    summary: "快速复习最常用音阶的结构。",
    points: [
      "大调：全-全-半-全-全-全-半。",
      "自然小调：全-半-全-全-半-全-全。",
      "五声音阶：减少冲突音，适合即兴入门。",
      "练习法：节拍器 60 BPM，先上下行，再做 3/4 音分组。",
    ],
  },
  {
    id: "progression",
    title: "和弦进行速记",
    summary: "把和弦放进进行里，音乐才会动起来。",
    points: [
      "流行常用：I-V-vi-IV（如 C-G-Am-F）。",
      "Jazz 终止套路：ii-V-I。",
      "先固定节奏型，再替换和弦，能更快听出功能变化。",
    ],
  },
]

function ExpandCard({
  id,
  title,
  summary,
  points,
  expanded,
  onToggle,
}: {
  id: string
  title: string
  summary: string
  points: string[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <View style={styles.infoCard}>
      <Pressable style={styles.infoCardHeader} onPress={onToggle}>
        <View style={styles.infoCardText}>
          <Text style={styles.infoCardTitle}>{title}</Text>
          <Text style={styles.infoCardSummary}>{summary}</Text>
        </View>
        <Text style={styles.expandBtn}>{expanded ? "收起" : "展开"}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.infoCardBody}>
          {points.map((p) => (
            <Text key={p} style={styles.bulletText}>
              {"• "}{p}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

function ChordTypeSection({ templateKey }: { templateKey: string }) {
  const router = useRouter()
  const template = CHORD_TEMPLATES.find((t) => t.key === templateKey)!
  const color = TYPE_COLORS[templateKey] ?? TYPE_COLORS["Major"]
  const [open, setOpen] = useState(false)

  return (
    <View style={[styles.chordSection, { borderColor: color.border, backgroundColor: color.bg }]}>
      {/* 标题行，点击展开/收起 */}
      <Pressable style={styles.chordSectionHeader} onPress={() => setOpen((v) => !v)}>
        <View style={styles.chordSectionLeft}>
          <View style={[styles.typeBadge, { backgroundColor: color.badge }]}>
            <Text style={[styles.typeBadgeText, { color: color.badgeText }]}>{template.suffix || "maj"}</Text>
          </View>
          <View style={styles.chordSectionTitleWrap}>
            <Text style={styles.chordSectionTitle}>{template.displayName}</Text>
            <Text style={styles.chordSectionCN}>{template.chineseName}</Text>
          </View>
        </View>
        <View style={styles.chordSectionRight}>
          <Text style={styles.formulaTag}>{template.formula}</Text>
          <Text style={[styles.expandBtn, { color: color.badge }]}>{open ? "收起" : "查看"}</Text>
        </View>
      </Pressable>

      {open && (
        <View style={styles.chordSectionBody}>
          <Text style={styles.chordDescText}>{template.character}</Text>
          <Text style={styles.rootGridLabel}>选择根音 →</Text>
          <View style={styles.rootGrid}>
            {PITCH_CLASSES.map((root) => {
              const entry = buildChordEntry(root, template)
              return (
                <Pressable
                  key={root}
                  style={({ pressed }) => [
                    styles.rootChip,
                    { borderColor: color.badge, backgroundColor: pressed ? color.badge : "#fff" },
                  ]}
                  onPress={() => router.push(`/chord/${encodeURIComponent(entry.symbol)}`)}
                >
                  {({ pressed }) => (
                    <Text style={[styles.rootChipText, { color: pressed ? "#fff" : color.badge }]}>
                      {entry.symbol}
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

export default function Learn() {
  const [expandedId, setExpandedId] = useState<string>("guide")

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>学习模块</Text>
      <Text style={styles.pageSubtitle}>
        和弦、音阶、调式实用科普。15 种和弦类型与后端分析模板保持完全一致，点击任意根音进入详情页。
      </Text>

      {/* 乐理速记卡片 */}
      {BASIC_SECTIONS.map((s) => (
        <ExpandCard
          key={s.id}
          {...s}
          expanded={expandedId === s.id}
          onToggle={() => setExpandedId(expandedId === s.id ? "" : s.id)}
        />
      ))}

      {/* 和弦种类百科 */}
      <Text style={styles.sectionHeading}>和弦种类百科</Text>
      <Text style={styles.sectionDesc}>
        共 15 种和弦类型 × 12 个根音 = 180 个和弦页面。展开某类型，选根音即可进入详情。
      </Text>

      {CHORD_TEMPLATES.map((t) => (
        <ChordTypeSection key={t.key} templateKey={t.key} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
    backgroundColor: "#F7F8FA",
    gap: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
    marginBottom: 4,
  },
  // 乐理速记卡片
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  infoCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  infoCardText: {
    flex: 1,
    gap: 3,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  infoCardSummary: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  infoCardBody: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 5,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#334155",
  },
  expandBtn: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  // 和弦百科区块标题
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 6,
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },
  // 单种和弦类型
  chordSection: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  chordSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chordSectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 36,
    alignItems: "center",
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chordSectionTitleWrap: {
    gap: 1,
  },
  chordSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  chordSectionCN: {
    fontSize: 11,
    color: "#64748B",
  },
  chordSectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formulaTag: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "monospace" as const,
  },
  // 展开区域
  chordSectionBody: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    padding: 12,
    gap: 8,
  },
  chordDescText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  rootGridLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  rootGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  rootChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: "center",
  },
  rootChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
})
