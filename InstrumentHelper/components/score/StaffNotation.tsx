import React, { useCallback, useMemo, memo } from "react"
import {
    Canvas,
    Line,
    Text as SkiaText,
    Oval,
    Rect,
    Group,
    Path,
    useFont,
    vec,
} from "@shopify/react-native-skia"
import { Pressable, View } from "react-native"
import { Measure, Note, TimeSignature } from "../../models/Score"

// ─── 布局常量 ───
const STAFF_LINE_COUNT = 5
const HALF_STEP = 8              // 半个线间距（相邻音高之间的距离）
const LINE_SPACING = HALF_STEP * 2  // 线间距
export const BEAT_WIDTH = 70      // 每拍宽度
export const LEFT_MARGIN = 60     // 左侧留白（放谱号）
const RIGHT_MARGIN = 20
const LABEL_BOTTOM_PADDING = 12   // 音名标注距 Canvas 底部的距离
const NOTE_HEAD_RX = 7            // 符头水平半径
const NOTE_HEAD_RY = 5.5          // 符头垂直半径
const STEM_LENGTH = 30            // 符杆长度
const STEM_WIDTH = 1.5
const LEDGER_LINE_HALF = 12       // 加线半宽
const NOTE_FONT_SIZE = 14
const CLEF_FONT_SIZE = 36

// 颜色
const LINE_COLOR = "#9ca3af"
const NOTE_COLOR = "#1a1a1a"
const BARLINE_COLOR = "#6b7280"
const SELECTED_COLOR = "rgba(59, 130, 246, 0.3)"
const SELECTED_BORDER = "rgba(59, 130, 246, 0.8)"
const PLAYBACK_COLOR = "rgba(34, 197, 94, 0.25)"
const PLAYBACK_BORDER = "rgba(34, 197, 94, 0.8)"
const LEDGER_LINE_COLOR = "#9ca3af"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontFile = require("../../assets/FiraCode-VariableFont_wght.ttf")

// ─── 音高映射 ───
// 五线谱高音谱号：从下往上，第一线是 E4，第一间是 F4，第二线是 G4 ...
// 我们用一个数字表示音高在五线谱上的位置（以半个线间距为单位）
// 位置 0 = 第一线(E4)，位置 1 = 第一间(F4)，位置 2 = 第二线(G4) ...

// 音名到基础位置的映射（C大调，一个八度内）
const NOTE_NAME_POSITION: Record<string, number> = {
    "C": 0,
    "D": 1,
    "E": 2,
    "F": 3,
    "G": 4,
    "A": 5,
    "B": 6,
}

/**
 * 解析 pitch 字符串，返回音名、变音记号、八度
 */
function parsePitch(pitch: string): { noteName: string; accidental: string; octave: number } | null {
    const match = pitch.match(/^([A-G])(#|b)?(\d+)$/)
    if (!match) return null
    return {
        noteName: match[1],
        accidental: match[2] || "",
        octave: parseInt(match[3], 10),
    }
}

/**
 * 将 pitch 字符串（如 "E4", "C#5"）转换为五线谱上的位置
 * 返回值：相对于第一线(E4)的半线间距偏移量
 * 升降号不影响线间位置（C#4 和 C4 在同一位置，只是左侧多一个 # 符号）
 */
function pitchToStaffPosition(pitch: string): number {
    const parsed = parsePitch(pitch)
    if (!parsed) return 0

    const { noteName, octave } = parsed

    // E4 作为参考点（第一线），位置 = 0
    const refOctave = 4
    const refNotePos = NOTE_NAME_POSITION["E"] // E = 2

    const notePos = NOTE_NAME_POSITION[noteName]
    if (notePos === undefined) return 0

    // 计算相对于 C0 的绝对位置
    const absolutePos = octave * 7 + notePos
    const refAbsolutePos = refOctave * 7 + refNotePos

    return absolutePos - refAbsolutePos
}

/**
 * 判断某个位置是否需要加线
 * 返回需要绘制的加线位置数组
 */
function getLedgerLines(staffPos: number): number[] {
    const lines: number[] = []
    if (staffPos < 0) {
        // 下加线：位置 -2, -4, -6 ... (即 D4, C4 下方的线, B3 ...)
        for (let p = -2; p >= staffPos; p -= 2) {
            lines.push(p)
        }
    } else if (staffPos > 8) {
        // 上加线：位置 10, 12, 14 ... (即 G5 上方)
        for (let p = 10; p <= staffPos; p += 2) {
            lines.push(p)
        }
    }
    return lines
}

// 音符时值对应的显示方式
type NoteAppearance = {
    filled: boolean    // 符头是否填充
    hasStem: boolean   // 是否有符杆
    flags: number      // 符尾数量（八分音符=1, 十六分=2）
}

function getNoteAppearance(duration: number): NoteAppearance {
    if (duration >= 4) return { filled: false, hasStem: false, flags: 0 }  // 全音符
    if (duration >= 2) return { filled: true, hasStem: true, flags: 0 }   // 二分音符
    if (duration >= 1) return { filled: true, hasStem: true, flags: 0 }    // 四分音符
    if (duration >= 0.5) return { filled: true, hasStem: true, flags: 1 }  // 八分音符
    return { filled: true, hasStem: true, flags: 2 }                       // 十六分音符
}

// ─── 选中状态 ───
type SelectedNote = {
    measureIndex: number
    beat: number
}

type Props = {
    measures: Measure[]
    timeSignature: TimeSignature
    selectedNote: SelectedNote | null
    onNoteSelect?: (note: SelectedNote) => void
    height: number
}

function StaffNotationComponent({
    measures,
    timeSignature,
    selectedNote,
    onNoteSelect,
    height,
}: Props) {
    const font = useFont(fontFile, NOTE_FONT_SIZE)
    const clefFont = useFont(fontFile, CLEF_FONT_SIZE)

    const beatsPerMeasure = timeSignature.beats

    // 计算每个小节的起始 X 坐标
    // 宽度规则：空小节=1拍；每加一个音符展开到"已用时值+1"列；满拍时固定为 beatsPerMeasure 列
    const measureLayout = useMemo(() => {
        let x = LEFT_MARGIN
        return measures.map((m) => {
            const startX = x
            const totalDuration = (m.notes || []).reduce((sum, n) => sum + n.duration, 0)
            const isFull = totalDuration >= beatsPerMeasure
            const beatSpan = isFull ? beatsPerMeasure : Math.max(1, totalDuration + 1)
            const width = beatSpan * BEAT_WIDTH
            x += width
            return { startX, width, beatSpan, measure: m }
        })
    }, [measures, beatsPerMeasure])

    const totalWidth = measureLayout.reduce((sum, l) => sum + l.width, LEFT_MARGIN) + RIGHT_MARGIN
    const staffHeight = (STAFF_LINE_COUNT - 1) * LINE_SPACING
    const totalHeight = height

    // 五线谱垂直居中：staffTopY 是第5线（最高线）的 Y 坐标
    // 留出底部标注区域（NOTE_FONT_SIZE + LABEL_BOTTOM_PADDING），剩余空间居中
    const labelAreaHeight = NOTE_FONT_SIZE + LABEL_BOTTOM_PADDING + 8
    const availableHeight = totalHeight - labelAreaHeight
    const staffTopY = Math.max(20, (availableHeight - staffHeight) / 2)

    // 五线谱第 N 线的 Y 坐标（从上到下：第5线、第4线...第1线）
    // 第1线在下方，第5线在上方
    const staffLineY = useCallback((lineNum: number) => {
        // lineNum: 1(底线) ~ 5(顶线)
        return staffTopY + staffHeight - (lineNum - 1) * LINE_SPACING
    }, [staffHeight, staffTopY])

    // 将五线谱位置转换为 Y 坐标
    // staffPos=0 对应第一线(E4)
    const staffPosToY = useCallback((staffPos: number) => {
        const firstLineY = staffLineY(1)
        return firstLineY - staffPos * HALF_STEP
    }, [staffLineY])

    // 拍的 X 坐标（拍中心）
    const beatX = useCallback((measureStartX: number, beat: number) => {
        return measureStartX + beat * BEAT_WIDTH + BEAT_WIDTH / 2
    }, [])

    // 处理点击
    const handlePress = useCallback((evt: { nativeEvent: { locationX: number; locationY: number } }) => {
        const { locationX } = evt.nativeEvent
        if (!onNoteSelect) return

        for (const layout of measureLayout) {
            const mEndX = layout.startX + layout.width
            if (locationX >= layout.startX && locationX < mEndX) {
                const relX = locationX - layout.startX
                const beat = Math.floor(relX / BEAT_WIDTH)
                if (beat < 0 || beat >= layout.beatSpan) return

                onNoteSelect({
                    measureIndex: layout.measure.index,
                    beat,
                })
                return
            }
        }
    }, [measureLayout, onNoteSelect])

    if (height === 0) return null

    return (
        <View style={{ flex: 1 }}>
            <Pressable onPress={handlePress}>
                <Canvas style={{ width: totalWidth, height: totalHeight }}>
                {/* ─── 高音谱号标记 ─── */}
                {clefFont && (
                    <SkiaText
                        x={10}
                        y={staffLineY(3) + 6}
                        text="G"
                        font={clefFont}
                        color="#6b7280"
                    />
                )}

                {/* ─── 拍号 ─── */}
                {font && (
                    <SkiaText
                        x={LEFT_MARGIN - 22}
                        y={staffLineY(4) + NOTE_FONT_SIZE / 3}
                        text={timeSignature.beats.toString()}
                        font={font}
                        color="#6b7280"
                    />
                )}
                {font && (
                    <SkiaText
                        x={LEFT_MARGIN - 22}
                        y={staffLineY(2) + NOTE_FONT_SIZE / 3}
                        text={timeSignature.beatValue.toString()}
                        font={font}
                        color="#6b7280"
                    />
                )}

                {/* ─── 五条线 ─── */}
                {Array.from({ length: STAFF_LINE_COUNT }).map((_, i) => {
                    const lineNum = i + 1
                    const y = staffLineY(lineNum)
                    return (
                        <Line
                            key={`staff-line-${i}`}
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
                        {i === 0 && (
                            <Line
                                p1={vec(layout.startX, staffLineY(5))}
                                p2={vec(layout.startX, staffLineY(1))}
                                color={BARLINE_COLOR}
                                strokeWidth={2}
                            />
                        )}
                        <Line
                            p1={vec(layout.startX + layout.width, staffLineY(5))}
                            p2={vec(layout.startX + layout.width, staffLineY(1))}
                            color={BARLINE_COLOR}
                            strokeWidth={i === measureLayout.length - 1 ? 2 : 1}
                        />
                    </React.Fragment>
                ))}


                {/* ─── 选中高亮 ─── */}
                {selectedNote && (() => {
                    const layout = measureLayout.find(l => l.measure.index === selectedNote.measureIndex)
                    if (!layout) return null
                    const cx = beatX(layout.startX, selectedNote.beat)
                    return (
                        <Group>
                            <Rect
                                x={cx - BEAT_WIDTH / 2 + 4}
                                y={staffLineY(5) - 10}
                                width={BEAT_WIDTH - 8}
                                height={staffHeight + 20}
                                color={SELECTED_COLOR}
                            />
                            <Rect
                                x={cx - BEAT_WIDTH / 2 + 4}
                                y={staffLineY(5) - 10}
                                width={BEAT_WIDTH - 8}
                                height={staffHeight + 20}
                                color={SELECTED_BORDER}
                                style="stroke"
                                strokeWidth={1.5}
                            />
                        </Group>
                    )
                })()}

                {/* ─── 音符渲染 ─── */}
                {measureLayout.map((layout) => {
                    const notes = layout.measure.notes || []
                    return notes.map((note, ni) => {
                        const cx = beatX(layout.startX, note.start)
                        const staffPos = pitchToStaffPosition(note.pitch)
                        const cy = staffPosToY(staffPos)
                        const appearance = getNoteAppearance(note.duration)
                        const ledgerLines = getLedgerLines(staffPos)
                        const parsed = parsePitch(note.pitch)
                        const accidental = parsed?.accidental || ""

                        // 符杆方向：位置在第三线(B4, pos=4)以上朝下，以下朝上
                        const stemUp = staffPos < 4

                        return (
                            <Group key={`note-${layout.measure.index}-${ni}`}>
                                {/* 加线 */}
                                {ledgerLines.map((lp) => {
                                    const ly = staffPosToY(lp)
                                    return (
                                        <Line
                                            key={`ledger-${layout.measure.index}-${ni}-${lp}`}
                                            p1={vec(cx - LEDGER_LINE_HALF, ly)}
                                            p2={vec(cx + LEDGER_LINE_HALF, ly)}
                                            color={LEDGER_LINE_COLOR}
                                            strokeWidth={1}
                                        />
                                    )
                                })}

                                {/* 升降号（符头左侧） */}
                                {accidental !== "" && font && (
                                    <SkiaText
                                        x={cx - NOTE_HEAD_RX - 14}
                                        y={cy + NOTE_FONT_SIZE / 3}
                                        text={accidental === "#" ? "#" : "b"}
                                        font={font}
                                        color={NOTE_COLOR}
                                    />
                                )}

                                {/* 符头 */}
                                <Oval
                                    x={cx - NOTE_HEAD_RX}
                                    y={cy - NOTE_HEAD_RY}
                                    width={NOTE_HEAD_RX * 2}
                                    height={NOTE_HEAD_RY * 2}
                                    color={NOTE_COLOR}
                                    style={appearance.filled ? "fill" : "stroke"}
                                    strokeWidth={appearance.filled ? 0 : 1.5}
                                />

                                {/* 符杆（用 Rect 替代 Line，避免 Skia web 的 strokeWidth 渲染问题） */}
                                {appearance.hasStem && (() => {
                                    const stemX = (stemUp ? cx + NOTE_HEAD_RX - 1 : cx - NOTE_HEAD_RX + 1) - STEM_WIDTH / 2
                                    const stemY = stemUp ? cy - STEM_LENGTH : cy
                                    return (
                                        <Rect
                                            x={stemX}
                                            y={stemY}
                                            width={STEM_WIDTH}
                                            height={STEM_LENGTH}
                                            color={NOTE_COLOR}
                                        />
                                    )
                                })()}

                                {/* 符尾（八分音符及更短） */}
                                {appearance.flags > 0 && (() => {
                                    const stemX = stemUp ? cx + NOTE_HEAD_RX - 1 : cx - NOTE_HEAD_RX + 1
                                    const stemEndY = stemUp ? cy - STEM_LENGTH : cy + STEM_LENGTH
                                    const flagDir = stemUp ? 1 : -1

                                    return Array.from({ length: appearance.flags }).map((_, fi) => {
                                        const flagY = stemEndY + fi * 6 * flagDir
                                        const pathStr = stemUp
                                            ? `M ${stemX} ${flagY} Q ${stemX + 12} ${flagY + 8} ${stemX + 6} ${flagY + 14}`
                                            : `M ${stemX} ${flagY} Q ${stemX - 12} ${flagY - 8} ${stemX - 6} ${flagY - 14}`
                                        return (
                                            <Path
                                                key={`flag-${layout.measure.index}-${ni}-${fi}`}
                                                path={pathStr}
                                                color={NOTE_COLOR}
                                                style="stroke"
                                                strokeWidth={1.5}
                                            />
                                        )
                                    })
                                })()}

                                {/* 音名标注（固定在 Canvas 底部）
                                {font && (
                                    <SkiaText
                                        x={cx - 10}
                                        y={totalHeight - LABEL_BOTTOM_PADDING}
                                        text={note.pitch}
                                        font={font}
                                        color="#9ca3af"
                                    />
                                )} */}
                            </Group>
                        )
                    })
                })}
                </Canvas>
            </Pressable>
        </View>
    )
}

export const StaffNotation = memo(StaffNotationComponent)
