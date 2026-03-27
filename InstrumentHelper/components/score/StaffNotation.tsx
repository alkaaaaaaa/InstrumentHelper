import React, { useCallback, useMemo, useRef, memo } from "react"
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
import { View } from "react-native"
import { Measure, Note, TimeSignature } from "../../models/Score"

// ─── 布局常量 ───
const STAFF_LINE_COUNT = 5
const HALF_STEP = 8              // 半个线间距（相邻音高之间的距离）
const LINE_SPACING = HALF_STEP * 2  // 线间距
export const BEAT_WIDTH = 70      // 每拍宽度
export const LEFT_MARGIN = 60     // 左侧留白（放谱号）
export const STAFF_LINE_SPACING = 16  // LINE_SPACING，供外部计算标注 Y 位置
const RIGHT_MARGIN = 20
const LABEL_BOTTOM_PADDING = 12   // 音名标注距 Canvas 底部的距离
const NOTE_HEAD_RX = 7            // 符头水平半径
const NOTE_HEAD_RY = 5.5          // 符头垂直半径
const STEM_LENGTH = 30            // 符杆长度
const STEM_WIDTH = 1.5
const LEDGER_LINE_HALF = 12       // 加线半宽
const NOTE_FONT_SIZE = 14
const CLEF_FONT_SIZE = 36
const GRAND_STAFF_GAP = 36
const TREBLE_FIRST_LINE_POS = 0
const BASS_FIRST_LINE_POS = -12
const CLEF_SPLIT_POS = -2

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
 * 将五线谱位置转换为音高字符串（staffPos=0 对应 E4）
 */
export function staffPositionToPitch(staffPos: number, accidental: string = ""): string {
    const refAbsolutePos = 4 * 7 + 2  // E4
    const absolutePos = refAbsolutePos + staffPos
    const octave = Math.floor(absolutePos / 7)
    const noteIndex = ((absolutePos % 7) + 7) % 7
    const noteNames = ["C", "D", "E", "F", "G", "A", "B"]
    return `${noteNames[noteIndex]}${accidental}${octave}`
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
function getLedgerLines(staffPos: number, firstLinePos: number): number[] {
    const lines: number[] = []
    const topLinePos = firstLinePos + 8
    if (staffPos < firstLinePos) {
        // 下加线：位置 firstLinePos-2, firstLinePos-4 ...
        for (let p = firstLinePos - 2; p >= staffPos; p -= 2) {
            lines.push(p)
        }
    } else if (staffPos > topLinePos) {
        // 上加线：位置 topLinePos+2, topLinePos+4 ...
        for (let p = topLinePos + 2; p <= staffPos; p += 2) {
            lines.push(p)
        }
    }
    return lines
}

function getClefForStaffPos(staffPos: number): "treble" | "bass" {
    return staffPos >= CLEF_SPLIT_POS ? "treble" : "bass"
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
    clef?: "treble" | "bass"
    staffPos?: number  // 点击时从 Y 坐标换算出的谱线位置
}

export type ChordAnnotation = {
    measureIndex: number
    beat: number
    clef: "treble" | "bass"
    label: string
}

type Props = {
    measures: Measure[]
    timeSignature: TimeSignature
    selectedNote: SelectedNote | null
    onNoteSelect?: (note: SelectedNote) => void
    height: number
    selectedStaffPos?: number
    /** 当前选中的时值（以拍为单位），用于点击时的音符对齐精度。默认 1（四分音符）*/
    noteResolution?: number
}

function StaffNotationComponent({
    measures,
    timeSignature,
    selectedNote,
    onNoteSelect,
    height,
    selectedStaffPos,
    noteResolution = 1,
}: Props) {
    const font = useFont(fontFile, NOTE_FONT_SIZE)
    const clefFont = useFont(fontFile, CLEF_FONT_SIZE)

    const beatsPerMeasure = timeSignature.beats

    // 稳定布局：不含光标，仅由音符决定宽度，用于计算画布总宽（防止光标移动时画布 resize）
    const stableMeasureLayout = useMemo(() => {
        let x = LEFT_MARGIN
        return measures.map((m) => {
            const startX = x
            const notes = m.notes || []
            const maxNoteEnd = notes.length > 0
                ? Math.max(...notes.map(n => n.start + n.duration))
                : 0
            const isFull = maxNoteEnd >= beatsPerMeasure
            // 小节满时固定为 beatsPerMeasure 宽，否则按音符末尾向上取整
            const beatSpan = isFull ? beatsPerMeasure : Math.max(1, Math.ceil(maxNoteEnd))
            const width = beatSpan * BEAT_WIDTH
            x += width
            return { startX, width, beatSpan, measure: m }
        })
    }, [measures, beatsPerMeasure])

    // 视觉布局：含光标扩展，用于绘制小节线 / 音符 / 幽灵音符（不影响画布宽度）
    // ⚠️ 故意不用 useMemo：每次渲染都返回新引用，确保 Skia canvas 总是重绘
    // （若用 useMemo，chordAnnotations 等其他 prop 变化触发重渲染时 Skia 会因引用未变而跳过重绘）
    const measureLayout = (() => {
        let x = LEFT_MARGIN
        return measures.map((m) => {
            const startX = x
            const notes = m.notes || []
            const maxNoteEnd = notes.length > 0
                ? Math.max(...notes.map(n => n.start + n.duration))
                : 0
            const isFull = maxNoteEnd >= beatsPerMeasure
            let beatSpan = isFull ? beatsPerMeasure : Math.max(1, Math.ceil(maxNoteEnd))
            // 光标在该小节时，确保符头中心（beat + slotSize/2）严格在小节内
            if (!isFull && selectedNote && selectedNote.measureIndex === m.index) {
                const cursorCenterBeat = selectedNote.beat + noteResolution / 2
                if (cursorCenterBeat >= beatSpan) {
                    beatSpan = Math.ceil(selectedNote.beat + noteResolution)
                }
            }
            const width = beatSpan * BEAT_WIDTH
            x += width
            return { startX, width, beatSpan, measure: m }
        })
    })()

    // handlePress 通过 ref 读取最新 measureLayout，避免把它放入 useCallback 依赖
    const measureLayoutRef = useRef(measureLayout)
    measureLayoutRef.current = measureLayout

    // 渲染计数器：每次 StaffNotationComponent 重渲染都递增，
    // 用于 Canvas 顶层 Group 的 key，强制 Skia 完整重绘，
    // 防止 canvas 被清空后因子节点 props 未变而跳过重画导致音符消失
    const renderTickRef = useRef(0)
    renderTickRef.current += 1

    // 画布宽度取稳定布局和视觉布局（含光标扩展）的较大值，不额外添加空白缓冲
    const stableWidth = stableMeasureLayout.reduce((sum, l) => sum + l.width, LEFT_MARGIN) + RIGHT_MARGIN
    const visualWidth = measureLayout.reduce((sum, l) => sum + l.width, LEFT_MARGIN) + RIGHT_MARGIN
    const totalWidth = Math.max(stableWidth, visualWidth)
    const staffHeight = (STAFF_LINE_COUNT - 1) * LINE_SPACING
    const grandStaffHeight = staffHeight * 2 + GRAND_STAFF_GAP
    const totalHeight = height

    // 双谱表垂直居中：trebleTopY / bassTopY 都是各自第5线（最高线）的 Y 坐标
    // 留出底部标注区域（NOTE_FONT_SIZE + LABEL_BOTTOM_PADDING），剩余空间居中
    const labelAreaHeight = NOTE_FONT_SIZE + LABEL_BOTTOM_PADDING + 8
    const availableHeight = totalHeight - labelAreaHeight
    const trebleTopY = Math.max(20, (availableHeight - grandStaffHeight) / 2)
    const bassTopY = trebleTopY + staffHeight + GRAND_STAFF_GAP

    // 指定谱表第 N 线的 Y 坐标（从上到下：第5线、第4线...第1线）
    const staffLineY = useCallback((lineNum: number, staffTop: number) => {
        // lineNum: 1(底线) ~ 5(顶线)
        return staffTop + staffHeight - (lineNum - 1) * LINE_SPACING
    }, [staffHeight])

    const trebleLineY = useCallback((lineNum: number) => {
        return staffLineY(lineNum, trebleTopY)
    }, [staffLineY, trebleTopY])

    const bassLineY = useCallback((lineNum: number) => {
        return staffLineY(lineNum, bassTopY)
    }, [staffLineY, bassTopY])

    const trebleFirstLineY = useMemo(() => trebleLineY(1), [trebleLineY])
    const bassFirstLineY = useMemo(() => bassLineY(1), [bassLineY])

    // 双谱表的音高位置到 Y 映射：
    // 高音谱号以 E4(pos=0) 为第一线；低音谱号以 G2(pos=-12) 为第一线
    const staffPosToY = useCallback((staffPos: number, clef?: "treble" | "bass") => {
        const targetClef = clef ?? getClefForStaffPos(staffPos)
        if (targetClef === "treble") {
            return trebleFirstLineY - (staffPos - TREBLE_FIRST_LINE_POS) * HALF_STEP
        }
        return bassFirstLineY - (staffPos - BASS_FIRST_LINE_POS) * HALF_STEP
    }, [trebleFirstLineY, bassFirstLineY])

    // 拍的 X 坐标（符头中心）
    // slotSize：该拍位占用的时值宽度（四分=1, 八分=0.5...），用于将符头居中在自身时值槽内
    const beatX = useCallback((measureStartX: number, beat: number, slotSize: number = 1) => {
        return measureStartX + beat * BEAT_WIDTH + slotSize * BEAT_WIDTH / 2
    }, [])

    // 用于在 handlePress 中将 locationY 换算成 staffPos
    const trebleFirstLineYRef = useRef(0)
    const bassFirstLineYRef = useRef(0)
    trebleFirstLineYRef.current = trebleFirstLineY
    bassFirstLineYRef.current = bassFirstLineY

    // 处理点击：同时捕获 X(beat) 和 Y(staffPos)
    // 使用 Responder 系统（onResponderGrant），其 nativeEvent 在 web/native 均有 locationX/locationY
    const handlePress = useCallback((evt: any) => {
        if (!onNoteSelect) return
        const ne = evt?.nativeEvent
        // locationX/locationY 来自 Responder 系统（web 上映射自 offsetX/offsetY）
        const locationX: number | undefined = ne?.locationX ?? ne?.offsetX
        const locationY: number | undefined = ne?.locationY ?? ne?.offsetY
        if (locationX == null) return

        for (const layout of measureLayoutRef.current) {
            const mEndX = layout.startX + layout.width
            if (locationX >= layout.startX && locationX < mEndX) {
                const relX = locationX - layout.startX
                // 按当前时值（noteResolution）对齐拍位，支持八分音符等分数拍
                const resolution = noteResolution
                const beat = Math.round(Math.floor(relX / (BEAT_WIDTH * resolution)) * resolution * 10000) / 10000
                if (beat < 0 || beat >= layout.beatSpan) return

                // 将 Y 坐标换算为最近的谱线位置
                const staffPos = locationY != null
                    ? (() => {
                        const splitY = (trebleLineY(1) + bassLineY(5)) / 2
                        if (locationY <= splitY) {
                            return Math.round((trebleFirstLineYRef.current - locationY) / HALF_STEP + TREBLE_FIRST_LINE_POS)
                        }
                        return Math.round((bassFirstLineYRef.current - locationY) / HALF_STEP + BASS_FIRST_LINE_POS)
                    })()
                    : undefined
                const clef: "treble" | "bass" | undefined = locationY != null
                    ? ((locationY <= (trebleLineY(1) + bassLineY(5)) / 2) ? "treble" : "bass")
                    : undefined

                onNoteSelect({
                    measureIndex: layout.measure.index,
                    beat,
                    clef,
                    staffPos,
                })
                return
            }
        }
    }, [onNoteSelect, noteResolution, trebleLineY, bassLineY])

    if (height === 0) return null

    return (
        <View style={{ width: totalWidth, position: "relative" }}>
            <Canvas style={{ width: totalWidth, height: totalHeight }}>
                {/* key 随每次渲染递增，强制 Skia 销毁并重建所有子节点，保证完整重绘 */}
                <Group key={renderTickRef.current}>
                {/* ─── 高音谱号标记 ─── */}
                {clefFont && (
                    <SkiaText
                        x={10}
                        y={trebleLineY(3) + 6}
                        text="G"
                        font={clefFont}
                        color="#6b7280"
                    />
                )}
                {clefFont && (
                    <SkiaText
                        x={12}
                        y={bassLineY(3) + 8}
                        text="F"
                        font={clefFont}
                        color="#6b7280"
                    />
                )}

                {/* ─── 拍号 ─── */}
                {font && (
                    <SkiaText
                        x={LEFT_MARGIN - 22}
                        y={trebleLineY(4) + NOTE_FONT_SIZE / 3}
                        text={timeSignature.beats.toString()}
                        font={font}
                        color="#6b7280"
                    />
                )}
                {font && (
                    <SkiaText
                        x={LEFT_MARGIN - 22}
                        y={trebleLineY(2) + NOTE_FONT_SIZE / 3}
                        text={timeSignature.beatValue.toString()}
                        font={font}
                        color="#6b7280"
                    />
                )}
                {font && (
                    <SkiaText
                        x={LEFT_MARGIN - 22}
                        y={bassLineY(4) + NOTE_FONT_SIZE / 3}
                        text={timeSignature.beats.toString()}
                        font={font}
                        color="#6b7280"
                    />
                )}
                {font && (
                    <SkiaText
                        x={LEFT_MARGIN - 22}
                        y={bassLineY(2) + NOTE_FONT_SIZE / 3}
                        text={timeSignature.beatValue.toString()}
                        font={font}
                        color="#6b7280"
                    />
                )}

                {/* ─── 五条线 ─── */}
                {Array.from({ length: STAFF_LINE_COUNT }).map((_, i) => {
                    const lineNum = i + 1
                    const y = trebleLineY(lineNum)
                    return (
                        <Line
                            key={`treble-staff-line-${i}`}
                            p1={vec(LEFT_MARGIN, y)}
                            p2={vec(totalWidth - RIGHT_MARGIN, y)}
                            color={LINE_COLOR}
                            strokeWidth={1}
                        />
                    )
                })}
                {Array.from({ length: STAFF_LINE_COUNT }).map((_, i) => {
                    const lineNum = i + 1
                    const y = bassLineY(lineNum)
                    return (
                        <Line
                            key={`bass-staff-line-${i}`}
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
                                p1={vec(layout.startX, trebleLineY(5))}
                                p2={vec(layout.startX, bassLineY(1))}
                                color={BARLINE_COLOR}
                                strokeWidth={2}
                            />
                        )}
                        <Line
                            p1={vec(layout.startX + layout.width, trebleLineY(5))}
                            p2={vec(layout.startX + layout.width, bassLineY(1))}
                            color={BARLINE_COLOR}
                            strokeWidth={i === measureLayout.length - 1 ? 2 : 1}
                        />
                    </React.Fragment>
                ))}


                {/* ─── 选中高亮 ─── */}
                {selectedNote && (() => {
                    const layout = measureLayout.find(l => l.measure.index === selectedNote.measureIndex)
                    if (!layout) return null
                    const slotW = noteResolution * BEAT_WIDTH
                    const cx = beatX(layout.startX, selectedNote.beat, noteResolution)
                    const activeStaffPos = selectedStaffPos ?? selectedNote.staffPos ?? TREBLE_FIRST_LINE_POS
                    const activeClef = selectedNote.clef ?? getClefForStaffPos(activeStaffPos)
                    const highlightTop = activeClef === "treble" ? trebleLineY(5) : bassLineY(5)
                    return (
                        <Group>
                            <Rect
                                x={cx - slotW / 2 + 4}
                                y={highlightTop - 10}
                                width={slotW - 8}
                                height={staffHeight + 20}
                                color={SELECTED_COLOR}
                            />
                            <Rect
                                x={cx - slotW / 2 + 4}
                                y={highlightTop - 10}
                                width={slotW - 8}
                                height={staffHeight + 20}
                                color={SELECTED_BORDER}
                                style="stroke"
                                strokeWidth={1.5}
                            />
                        </Group>
                    )
                })()}

                {/* ─── 幽灵音符（键盘纵向光标预览） ─── */}
                {selectedNote && selectedStaffPos !== undefined && (() => {
                    const layout = measureLayout.find(l => l.measure.index === selectedNote.measureIndex)
                    if (!layout) return null
                    const cx = beatX(layout.startX, selectedNote.beat, noteResolution)
                    const clef = selectedNote.clef ?? getClefForStaffPos(selectedStaffPos)
                    const cy = staffPosToY(selectedStaffPos, clef)
                    const firstLinePos = clef === "treble" ? TREBLE_FIRST_LINE_POS : BASS_FIRST_LINE_POS
                    const ghostLedger = getLedgerLines(selectedStaffPos, firstLinePos)
                    return (
                        <Group>
                            {ghostLedger.map((lp) => {
                                const ly = staffPosToY(lp, clef)
                                return (
                                    <Line
                                        key={`ghost-ledger-${lp}`}
                                        p1={vec(cx - LEDGER_LINE_HALF, ly)}
                                        p2={vec(cx + LEDGER_LINE_HALF, ly)}
                                        color="rgba(59, 130, 246, 0.5)"
                                        strokeWidth={1}
                                    />
                                )
                            })}
                            <Oval
                                x={cx - NOTE_HEAD_RX}
                                y={cy - NOTE_HEAD_RY}
                                width={NOTE_HEAD_RX * 2}
                                height={NOTE_HEAD_RY * 2}
                                color="rgba(59, 130, 246, 0.55)"
                                style="fill"
                            />
                        </Group>
                    )
                })()}

                {/* ─── 被选中音符的小高亮框（点击位置有音符时显示） ─── */}
                {selectedNote && selectedStaffPos !== undefined && (() => {
                    const layout = measureLayout.find(l => l.measure.index === selectedNote.measureIndex)
                    if (!layout) return null
                    const notes = layout.measure.notes || []
                    const activeClef = selectedNote.clef ?? getClefForStaffPos(selectedStaffPos)
                    const matched = notes.find(
                        n => n.start === selectedNote.beat
                            && pitchToStaffPosition(n.pitch) === selectedStaffPos
                            && (n.clef ?? getClefForStaffPos(pitchToStaffPosition(n.pitch))) === activeClef
                    )
                    if (!matched) return null
                    const cx = beatX(layout.startX, matched.start, matched.duration)
                    const cy = staffPosToY(selectedStaffPos, activeClef)
                    return (
                        <Rect
                            x={cx - NOTE_HEAD_RX - 5}
                            y={cy - NOTE_HEAD_RY - 5}
                            width={NOTE_HEAD_RX * 2 + 10}
                            height={NOTE_HEAD_RY * 2 + 10}
                            color="rgba(59, 130, 246, 0.75)"
                            style="stroke"
                            strokeWidth={2}
                        />
                    )
                })()}

                {/* ─── 音符渲染 ─── */}
                {measureLayout.map((layout) => {
                    const notes = layout.measure.notes || []
                    return notes.map((note, ni) => {
                        const cx = beatX(layout.startX, note.start, note.duration)
                        const staffPos = pitchToStaffPosition(note.pitch)
                        const noteClef = note.clef ?? getClefForStaffPos(staffPos)
                        const cy = staffPosToY(staffPos, noteClef)
                        const appearance = getNoteAppearance(note.duration)
                        const firstLinePos = noteClef === "treble" ? TREBLE_FIRST_LINE_POS : BASS_FIRST_LINE_POS
                        const ledgerLines = getLedgerLines(staffPos, firstLinePos)
                        const parsed = parsePitch(note.pitch)
                        const accidental = parsed?.accidental || ""

                        // 符杆方向：对应谱表第三线以上朝下，以下朝上
                        const stemPivotPos = firstLinePos + 4
                        const stemUp = staffPos < stemPivotPos

                        return (
                            <Group key={`note-${layout.measure.index}-${ni}`}>
                                {/* 加线 */}
                                {ledgerLines.map((lp) => {
                                    const ly = staffPosToY(lp, noteClef)
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
                </Group>
                </Canvas>
            {/* 透明遮罩层：绝对定位在 Canvas 上方接收点击。
                使用 Responder 系统而非 Pressable.onPress，
                因为后者在 web 上的 nativeEvent 缺少 locationX/locationY。 */}
            <View
                onStartShouldSetResponder={() => true}
                onResponderGrant={handlePress}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: totalWidth,
                    height: totalHeight,
                    // @ts-ignore — web-only，让鼠标显示为指针
                    cursor: "pointer",
                }}
            />
        </View>
    )
}

export const StaffNotation = memo(StaffNotationComponent)
