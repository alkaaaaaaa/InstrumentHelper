import React, { useCallback, useMemo, useRef } from "react"
import {
    Canvas,
    Line,
    Text as SkiaText,
    RoundedRect,
    vec,
    Rect,
    Group,
    Path,
    useFont,
} from "@shopify/react-native-skia"
import { Pressable, View } from "react-native"
import { Measure, TabNote, TimeSignature } from "../../models/Score"

// ─── 布局常量 ───
const STRING_COUNT = 6
const LINE_SPACING = 20           // 弦间距
export const TAB_BEAT_WIDTH = 60             // 每拍宽度
export const TAB_LEFT_MARGIN = 40            // 左侧留白（放弦号标签）
const RIGHT_MARGIN = 16
const TOP_MARGIN = 44             // 加高，为推弦标注留出空间
const BOTTOM_MARGIN = 16
const BARLINE_EXTEND = 0          // 小节线上下延伸
const NOTE_FONT_SIZE = 16
const STEM_LENGTH = 26         // 品位数字下方的“音符杆”长度
const LABEL_FONT_SIZE = 12
const CURSOR_COLOR = "rgba(59, 130, 246, 0.3)"   // 选中格高亮
const CURSOR_BORDER_COLOR = "rgba(59, 130, 246, 0.8)"
const NOTE_BG_COLOR = "white"
const NOTE_TEXT_COLOR = "#1a1a1a"
const LINE_COLOR = "#9ca3af"
const BARLINE_COLOR = "#6b7280"
const LABEL_COLOR = "#9ca3af"

// 标准调弦标签（从第1弦到第6弦）
const STRING_LABELS = ["e", "B", "G", "D", "A", "E"]

// 推弦半音数 → 显示文字
function bendLabel(bend: number): string {
    if (bend === 1) return "½"
    if (bend === 2) return "full"
    if (bend === 3) return "1½"
    return ""
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontFile = require("../../assets/FiraCode-VariableFont_wght.ttf")

type SelectedCell = {
    measureIndex: number
    beat: number
    string: number   // 1-6
}

type Props = {
    measures: Measure[]
    timeSignature: TimeSignature
    selectedCell: SelectedCell | null
    onCellSelect?: (cell: SelectedCell) => void
    onNoteChange?: (measureIndex: number, tabNote: TabNote) => void
    onNoteDelete?: (measureIndex: number, beat: number, string: number) => void
}

export function TabStaff({
    measures,
    timeSignature,
    selectedCell,
    onCellSelect,
}: Props) {
    const font = useFont(fontFile, NOTE_FONT_SIZE)
    const labelFont = useFont(fontFile, LABEL_FONT_SIZE)

    const beatsPerMeasure = timeSignature.beats

    // 时值到六线谱符号外观的映射
    // 参考示例：全音无杆；二分/四分为直杆；八分/十六在底部加 1/2 个“勾”
    const getTabNoteAppearance = useCallback((duration: number) => {
        if (duration >= 4) {
            return { showStem: false, flags: 0, stemLength: 0 }
        }
        if (duration >= 2) {
            return { showStem: true, flags: 0, stemLength: STEM_LENGTH * 1.4 }
        }
        if (duration >= 1) {
            return { showStem: true, flags: 0, stemLength: STEM_LENGTH }
        }
        if (duration >= 0.5) {
            return { showStem: true, flags: 1, stemLength: STEM_LENGTH }
        }
        return { showStem: true, flags: 2, stemLength: STEM_LENGTH }
    }, [])

    // 稳定布局：仅由已有音符决定宽度，用于计算画布总宽，防止光标移动时整体宽度抖动
    const stableMeasureLayout = useMemo(() => {
        let x = TAB_LEFT_MARGIN
        return measures.map((m) => {
            const startX = x
            const tabNotes = m.tabNotes || []
            // 小节宽度至少覆盖到最右侧音符的结束位置，而不是只看拍号格数
            const maxNoteEnd = tabNotes.length > 0
                ? Math.max(...tabNotes.map(n => n.beat + (n.duration ?? 1)))
                : 0
            const beatSpan = Math.max(1, Math.ceil(maxNoteEnd))
            const width = beatSpan * TAB_BEAT_WIDTH
            x += width
            return { startX, width, beatSpan, measure: m }
        })
    }, [measures])

    // 视觉布局：在稳定布局基础上，根据当前选中格子向右扩展小节空间（类似五线谱）
    const measureLayout = (() => {
        let x = TAB_LEFT_MARGIN
        return measures.map((m) => {
            const stable = stableMeasureLayout.find(l => l.measure.index === m.index)
            const tabNotes = m.tabNotes || []
            const maxNoteEnd = tabNotes.length > 0
                ? Math.max(...tabNotes.map(n => n.beat + (n.duration ?? 1)))
                : 0
            let beatSpan = stable?.beatSpan ?? Math.max(1, Math.ceil(maxNoteEnd))

            if (selectedCell && selectedCell.measureIndex === m.index) {
                // 光标向右移动时继续扩展可见列数，确保当前编辑位置始终可见
                const desiredBeatSpan = Math.max(beatSpan, selectedCell.beat + 1)
                beatSpan = desiredBeatSpan
            }

            const startX = x
            const width = beatSpan * TAB_BEAT_WIDTH
            x += width
            return { startX, width, beatSpan, measure: m }
        })
    })()

    const stableWidth = stableMeasureLayout.reduce((sum, l) => sum + l.width, TAB_LEFT_MARGIN) + RIGHT_MARGIN
    const visualWidth = measureLayout.reduce((sum, l) => sum + l.width, TAB_LEFT_MARGIN) + RIGHT_MARGIN
    const totalWidth = Math.max(stableWidth, visualWidth)
    const staffHeight = (STRING_COUNT - 1) * LINE_SPACING
    const totalHeight = TOP_MARGIN + staffHeight + BOTTOM_MARGIN

    // 弦的 Y 坐标（第1弦在最上面）
    const stringY = useCallback((stringNum: number) => {
        return TOP_MARGIN + (stringNum - 1) * LINE_SPACING
    }, [])

    // 拍的 X 坐标（拍中心）
    const beatX = useCallback((measureStartX: number, beat: number) => {
        return measureStartX + beat * TAB_BEAT_WIDTH + TAB_BEAT_WIDTH / 2
    }, [])

    // 处理点击
    const handlePress = useCallback((evt: { nativeEvent: { locationX: number; locationY: number } }) => {
        const { locationX, locationY } = evt.nativeEvent
        if (!onCellSelect) return

        // 找到对应的小节
        for (const layout of measureLayout) {
            const mEndX = layout.startX + layout.width
            if (locationX >= layout.startX && locationX < mEndX) {
                // 找到对应的拍
                const relX = locationX - layout.startX
                const beat = Math.floor(relX / TAB_BEAT_WIDTH)
                if (beat < 0 || beat >= layout.beatSpan) return

                // 找到对应的弦
                const relY = locationY - TOP_MARGIN + LINE_SPACING / 2
                const stringIdx = Math.floor(relY / LINE_SPACING)
                const stringNum = stringIdx + 1
                if (stringNum < 1 || stringNum > STRING_COUNT) return

                onCellSelect({
                    measureIndex: layout.measure.index,
                    beat,
                    string: stringNum,
                })
                return
            }
        }
    }, [measureLayout, onCellSelect])

    if (!font || !labelFont) return null

    return (
        <View style={{ width: totalWidth, height: totalHeight }}>
        <Pressable onPress={handlePress} style={{ width: totalWidth, height: totalHeight }}>
            <Canvas style={{ width: totalWidth, height: totalHeight }}>
                {/* ─── 左侧弦号标签 ─── */}
                {STRING_LABELS.map((label, i) => (
                    <SkiaText
                        key={`label-${i}`}
                        x={10}
                        y={stringY(i + 1) + NOTE_FONT_SIZE / 3}
                        text={label}
                        font={labelFont}
                        color={LABEL_COLOR}
                    />
                ))}

                {/* ─── 六根弦（水平线） ─── */}
                {Array.from({ length: STRING_COUNT }).map((_, i) => {
                    const y = stringY(i + 1)
                    return (
                        <Line
                            key={`string-${i}`}
                            p1={vec(TAB_LEFT_MARGIN, y)}
                            p2={vec(totalWidth - RIGHT_MARGIN, y)}
                            color={LINE_COLOR}
                            strokeWidth={1}
                        />
                    )
                })}

                {/* ─── 小节线 ─── */}
                {measureLayout.map((layout, i) => (
                    <React.Fragment key={`barline-group-${i}`}>
                        {/* 小节起始线 */}
                        {i === 0 && (
                            <Line
                                p1={vec(layout.startX, stringY(1) - BARLINE_EXTEND)}
                                p2={vec(layout.startX, stringY(STRING_COUNT) + BARLINE_EXTEND)}
                                color={BARLINE_COLOR}
                                strokeWidth={2}
                            />
                        )}
                        {/* 小节结束线 */}
                        <Line
                            p1={vec(layout.startX + layout.width, stringY(1) - BARLINE_EXTEND)}
                            p2={vec(layout.startX + layout.width, stringY(STRING_COUNT) + BARLINE_EXTEND)}
                            color={BARLINE_COLOR}
                            strokeWidth={i === measureLayout.length - 1 ? 2 : 1}
                        />
                    </React.Fragment>
                ))}

                {/* ─── 选中高亮 ─── */}
                {selectedCell && (() => {
                    const layout = measureLayout.find(l => l.measure.index === selectedCell.measureIndex)
                    if (!layout) return null
                    const beat = selectedCell.beat
                    const cy = stringY(selectedCell.string)

                    const cx = beatX(layout.startX, Math.min(beat, layout.beatSpan - 1))
                    return (
                        <Group>
                            <RoundedRect
                                x={cx - TAB_BEAT_WIDTH / 2 + 4}
                                y={cy - LINE_SPACING / 2 + 2}
                                width={TAB_BEAT_WIDTH - 8}
                                height={LINE_SPACING - 4}
                                r={4}
                                color={CURSOR_COLOR}
                            />
                            <RoundedRect
                                x={cx - TAB_BEAT_WIDTH / 2 + 4}
                                y={cy - LINE_SPACING / 2 + 2}
                                width={TAB_BEAT_WIDTH - 8}
                                height={LINE_SPACING - 4}
                                r={4}
                                color={CURSOR_BORDER_COLOR}
                                style="stroke"
                                strokeWidth={1.5}
                            />
                        </Group>
                    )
                })()}

                {/* ─── 音符（品位数字 + 下方“杆”表示时值） ─── */}
                {measureLayout.map((layout) => {
                    const tabNotes = layout.measure.tabNotes || []
                    return tabNotes.map((note, ni) => {
                        const cx = beatX(layout.startX, note.beat)
                        const cy = stringY(note.string)
                        const text = note.fret.toString()
                        // 估算文本宽度：单个数字约 10px，两位数约 18px
                        const textWidth = text.length === 1 ? 10 : 18
                        // 六线谱自身的时值（若未设置则默认 1 拍）
                        const duration = note.duration ?? 1
                        const appearance = getTabNoteAppearance(duration)

                        // 推弦可视化参数
                        const hasBend = !!note.bend && note.bend > 0
                        const bendStartY = cy - NOTE_FONT_SIZE / 2 - 2
                        const bendEndX = cx + 10
                        const bendEndY = bendStartY - 28
                        const bendCtrlX = cx + 14
                        const bendCtrlY = bendStartY - 10
                        const bendArcPath = hasBend
                            ? `M ${cx} ${bendStartY} Q ${bendCtrlX} ${bendCtrlY} ${bendEndX} ${bendEndY}`
                            : ""
                        const arrowSz = 4
                        const bendArrowHead = hasBend
                            ? `M ${bendEndX} ${bendEndY} L ${bendEndX - arrowSz} ${bendEndY + arrowSz * 1.5} L ${bendEndX + arrowSz} ${bendEndY + arrowSz * 1.5} Z`
                            : ""

                        return (
                            <Group key={`note-${layout.measure.index}-${ni}`}>
                                {/* 白色背景遮盖弦线 */}
                                <Rect
                                    x={cx - textWidth / 2 - 3}
                                    y={cy - NOTE_FONT_SIZE / 2 - 1}
                                    width={textWidth + 6}
                                    height={NOTE_FONT_SIZE + 2}
                                    color={NOTE_BG_COLOR}
                                />
                                {/* 品位数字 */}
                                <SkiaText
                                    x={cx - textWidth / 2}
                                    y={cy + NOTE_FONT_SIZE / 3}
                                    text={text}
                                    font={font}
                                    color={NOTE_TEXT_COLOR}
                                />
                                {/* 推弦弧线箭头 + 标注文字 */}
                                {hasBend && (
                                    <Group>
                                        <Path
                                            path={bendArcPath}
                                            color="#e05c00"
                                            style="stroke"
                                            strokeWidth={1.8}
                                        />
                                        <Path
                                            path={bendArrowHead}
                                            color="#e05c00"
                                            style="fill"
                                        />
                                        <SkiaText
                                            x={bendEndX + 3}
                                            y={bendEndY + 4}
                                            text={bendLabel(note.bend!)}
                                            font={labelFont}
                                            color="#e05c00"
                                        />
                                    </Group>
                                )}
                                {/* 下方“音符杆”和时値勾形 */}
                                {appearance.showStem && (() => {
                                    const stemTopY = cy + NOTE_FONT_SIZE / 2 + 2
                                    const stemX = cx - 1
                                    const stemHeight = appearance.stemLength
                                    const stemBottomY = stemTopY + stemHeight
                                    return (
                                        <Group>
                                            <Rect
                                                x={stemX}
                                                y={stemTopY}
                                                width={2}
                                                height={stemHeight}
                                                color={NOTE_TEXT_COLOR}
                                            />
                                            {appearance.flags > 0 && Array.from({ length: appearance.flags }).map((_, fi) => {
                                                const offset = fi * 6
                                                const fy = stemBottomY + offset
                                                // 小尾巴向上弯：控制点与终点的 y 坐标比起点更小
                                                const pathStr = `M ${stemX} ${fy} Q ${stemX + 10} ${fy - 6} ${stemX + 4} ${fy - 12}`
                                                return (
                                                    <Path
                                                        key={`tab-flag-${layout.measure.index}-${ni}-${fi}`}
                                                        path={pathStr}
                                                        color={NOTE_TEXT_COLOR}
                                                        style="stroke"
                                                        strokeWidth={1.5}
                                                    />
                                                )
                                            })}
                                        </Group>
                                    )
                                })()}
                            </Group>
                        )
                    })
                })}
            </Canvas>
        </Pressable>
        </View>
    )
}
