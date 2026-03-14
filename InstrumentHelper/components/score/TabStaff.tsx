import React, { useCallback, useMemo } from "react"
import {
    Canvas,
    Line,
    Text as SkiaText,
    RoundedRect,
    vec,
    Rect,
    Group,
    useFont,
} from "@shopify/react-native-skia"
import { Pressable } from "react-native"
import { Measure, TabNote, TimeSignature } from "../../models/Score"

// ─── 布局常量 ───
const STRING_COUNT = 6
const LINE_SPACING = 20           // 弦间距
const BEAT_WIDTH = 60             // 每拍宽度
const LEFT_MARGIN = 40            // 左侧留白（放弦号标签）
const RIGHT_MARGIN = 16
const TOP_MARGIN = 30
const BOTTOM_MARGIN = 16
const BARLINE_EXTEND = 0          // 小节线上下延伸
const NOTE_FONT_SIZE = 16
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

    // 计算每个小节的起始 X 坐标
    const measureLayout = useMemo(() => {
        let x = LEFT_MARGIN
        return measures.map((m) => {
            const startX = x
            const width = beatsPerMeasure * BEAT_WIDTH
            x += width
            return { startX, width, measure: m }
        })
    }, [measures, beatsPerMeasure])

    const totalWidth = LEFT_MARGIN + measures.length * beatsPerMeasure * BEAT_WIDTH + RIGHT_MARGIN
    const staffHeight = (STRING_COUNT - 1) * LINE_SPACING
    const totalHeight = TOP_MARGIN + staffHeight + BOTTOM_MARGIN

    // 弦的 Y 坐标（第1弦在最上面）
    const stringY = useCallback((stringNum: number) => {
        return TOP_MARGIN + (stringNum - 1) * LINE_SPACING
    }, [])

    // 拍的 X 坐标（拍中心）
    const beatX = useCallback((measureStartX: number, beat: number) => {
        return measureStartX + beat * BEAT_WIDTH + BEAT_WIDTH / 2
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
                const beat = Math.floor(relX / BEAT_WIDTH)
                if (beat < 0 || beat >= beatsPerMeasure) return

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
    }, [measureLayout, onCellSelect, beatsPerMeasure])

    if (!font || !labelFont) return null

    return (
        <Pressable onPress={handlePress}>
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
                            p1={vec(LEFT_MARGIN, y)}
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
                    const cx = beatX(layout.startX, selectedCell.beat)
                    const cy = stringY(selectedCell.string)
                    return (
                        <Group>
                            <RoundedRect
                                x={cx - BEAT_WIDTH / 2 + 4}
                                y={cy - LINE_SPACING / 2 + 2}
                                width={BEAT_WIDTH - 8}
                                height={LINE_SPACING - 4}
                                r={4}
                                color={CURSOR_COLOR}
                            />
                            <RoundedRect
                                x={cx - BEAT_WIDTH / 2 + 4}
                                y={cy - LINE_SPACING / 2 + 2}
                                width={BEAT_WIDTH - 8}
                                height={LINE_SPACING - 4}
                                r={4}
                                color={CURSOR_BORDER_COLOR}
                                style="stroke"
                                strokeWidth={1.5}
                            />
                        </Group>
                    )
                })()}

                {/* ─── 音符（品位数字） ─── */}
                {measureLayout.map((layout) => {
                    const tabNotes = layout.measure.tabNotes || []
                    return tabNotes.map((note, ni) => {
                        const cx = beatX(layout.startX, note.beat)
                        const cy = stringY(note.string)
                        const text = note.fret.toString()
                        // 估算文本宽度：单个数字约 10px，两位数约 18px
                        const textWidth = text.length === 1 ? 10 : 18
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
                            </Group>
                        )
                    })
                })}
            </Canvas>
        </Pressable>
    )
}
