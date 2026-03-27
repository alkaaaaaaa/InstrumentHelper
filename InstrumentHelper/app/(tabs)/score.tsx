import React, { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, LayoutChangeEvent, Platform, Modal, TextInput } from "react-native"
import { TabStaff } from "../../components/score/TabStaff"
import { EditorToolbar } from "../../components/score/EditorToolbar"
import { StaffNotation, BEAT_WIDTH, LEFT_MARGIN, STAFF_LINE_SPACING, staffPositionToPitch, ChordAnnotation } from "../../components/score/StaffNotation"
import { StaffToolbar } from "../../components/score/StaffToolbar"
import { ChordScaleModal } from "../../components/score/ChordScaleModal"
import { Measure, Note, TabNote, Score as ScoreType } from "../../models/Score"
import { useScorePlayer } from "../../hooks/useScorePlayer"
import { scoreApi, ScoreListItem } from "../../utils/api"

// React Native Web 的 Alert.alert 是空实现，用 window.alert/confirm 替代
function showAlert(title: string, message?: string) {
    if (Platform.OS === "web") {
        window.alert(message ? `${title}\n${message}` : title)
    } else {
        Alert.alert(title, message)
    }
}

function showConfirm(message: string, onConfirm: () => void) {
    if (Platform.OS === "web") {
        if (window.confirm(message)) onConfirm()
    } else {
        Alert.alert("确认", message, [
            { text: "取消", style: "cancel" },
            { text: "确定", style: "destructive", onPress: onConfirm },
        ])
    }
}

function SaveTitleModal({
    visible,
    initialTitle,
    isSaving,
    onCancel,
    onSave,
}: {
    visible: boolean
    initialTitle: string
    isSaving: boolean
    onCancel: () => void
    onSave: (title: string) => void
}) {
    const [title, setTitle] = useState(initialTitle)

    useEffect(() => {
        if (visible) setTitle(initialTitle)
    }, [visible, initialTitle])

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={saveTitleStyles.overlay}>
                <View style={saveTitleStyles.card}>
                    <Text style={saveTitleStyles.cardTitle}>保存乐谱</Text>
                    <TextInput
                        style={saveTitleStyles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="请输入乐谱名称"
                        placeholderTextColor="#aaa"
                        autoFocus
                        maxLength={60}
                        onSubmitEditing={() => onSave(title.trim() || "未命名乐谱")}
                    />
                    <View style={saveTitleStyles.btnRow}>
                        <TouchableOpacity
                            style={saveTitleStyles.cancelBtn}
                            onPress={onCancel}
                            disabled={isSaving}
                        >
                            <Text style={saveTitleStyles.cancelBtnText}>取消</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[saveTitleStyles.confirmBtn, isSaving && { opacity: 0.5 }]}
                            onPress={() => onSave(title.trim() || "未命名乐谱")}
                            disabled={isSaving}
                        >
                            <Text style={saveTitleStyles.confirmBtnText}>
                                {isSaving ? "保存中..." : "保存"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const DEFAULT_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"]

type SelectedCell = {
    measureIndex: number
    beat: number
    string: number
}

type ScoreMode = "menu" | "staff" | "tab"

type SelectedStaffNote = {
    measureIndex: number
    beat: number
    staffPos?: number  // 点击时从 Y 坐标换算的谱线位置
}

// 计算六线谱小节中已占用的总时值（按拍计）
// 规则：同一拍多根弦只按该拍最大时值计算一次
function getTabMeasureDuration(tabNotes: TabNote[] | undefined): number {
    if (!tabNotes || tabNotes.length === 0) return 0
    const beatMap = new Map<number, number>()
    for (const n of tabNotes) {
        const d = n.duration ?? 1
        const prev = beatMap.get(n.beat) ?? 0
        if (d > prev) beatMap.set(n.beat, d)
    }
    let total = 0
    for (const v of beatMap.values()) total += v
    return total
}

function getTabMeasureBeatSpan(tabNotes: TabNote[] | undefined): number {
    if (!tabNotes || tabNotes.length === 0) return 1
    const maxNoteEnd = Math.max(...tabNotes.map(n => n.beat + (n.duration ?? 1)))
    return Math.max(1, Math.ceil(maxNoteEnd))
}

const emptyScore: ScoreType = {
    bpm: 120,
    timeSignature: { beats: 4, beatValue: 4 },
    measures: [
        { index: 0, notes: [], tabNotes: [] },
    ],
}

function StaffNotationView({ onBack, initialScore, scoreId }: { onBack: () => void; initialScore?: ScoreType; scoreId?: string }) {
    const [score, setScore] = useState<ScoreType>(initialScore || emptyScore)
    const [currentScoreId, setCurrentScoreId] = useState<string | undefined>(scoreId)
    const [saving, setSaving] = useState(false)
    const [saveModalVisible, setSaveModalVisible] = useState(false)
    const [selectedNote, setSelectedNote] = useState<SelectedStaffNote | null>(null)
    const [currentOctave, setCurrentOctave] = useState(4)
    const [currentDuration, setCurrentDuration] = useState(1)
    const [currentAccidental, setCurrentAccidental] = useState("")
    const [selectedStaffPos, setSelectedStaffPos] = useState(0)
    const [chordModalVisible, setChordModalVisible] = useState(false)
    const [chordAnnotations, setChordAnnotations] = useState<ChordAnnotation[]>([])
    const [analyzing, setAnalyzing] = useState(false)

    const { playbackState, currentPosition, play, pause, stop, togglePlayPause, seekTo } = useScorePlayer(score)
    const scrollViewRef = useRef<ScrollView>(null)
    const [canvasHeight, setCanvasHeight] = useState(0)

    const canvasHeightSet = useRef(false)
    const handleScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height
        if (h > 0 && !canvasHeightSet.current) {
            canvasHeightSet.current = true
            setCanvasHeight(h)
        }
    }, [])

    const handleSave = useCallback(async (title: string) => {
        setSaving(true)
        try {
            const payload = {
                title,
                bpm: score.bpm,
                timeSignature: score.timeSignature,
                tuning: score.tuning,
                measures: score.measures,
            }
            if (currentScoreId) {
                const updated = await scoreApi.update(currentScoreId, payload)
                setScore(prev => ({ ...prev, ...updated }))
                setSaveModalVisible(false)
                showAlert("保存成功", "乐谱已更新")
            } else {
                const created = await scoreApi.create(payload)
                setCurrentScoreId(created._id)
                setScore(prev => ({ ...prev, ...created }))
                setSaveModalVisible(false)
                showAlert("保存成功", "乐谱已创建")
            }
        } catch (e) {
            showAlert("保存失败", "请检查网络连接和后端服务")
        } finally {
            setSaving(false)
        }
    }, [score, currentScoreId])

    const beatsPerMeasure = score.timeSignature.beats

    const handleNoteSelect = useCallback((note: SelectedStaffNote) => {
        setSelectedNote(note)
        seekTo(note.measureIndex, note.beat)
        // 同步竖向光标（幽灵音符/小高亮的音高位置）
        if (note.staffPos !== undefined) {
            setSelectedStaffPos(note.staffPos)
        }
    }, [seekTo])

    const handleNoteInput = useCallback((pitch: string, duration: number) => {
        if (!selectedNote) return

        setScore(prev => {
            const newMeasures = prev.measures.map(m => {
                if (m.index !== selectedNote.measureIndex) return m

                const notes = [...m.notes]
                // 移除同一拍位置的同音高音符（替换）
                const filtered = notes.filter(
                    n => !(n.start === selectedNote.beat && n.pitch === pitch)
                )
                const newNote: Note = {
                    pitch,
                    start: selectedNote.beat,
                    duration,
                }
                filtered.push(newNote)
                // 按 start 排序
                filtered.sort((a, b) => a.start - b.start)
                return { ...m, notes: filtered }
            })
            return { ...prev, measures: newMeasures }
        })
        // 不再自动前进光标，保持在当前拍位
    }, [selectedNote])

    // Refs 持有最新值，供 keydown 处理器读取，避免 stale closure 导致 Enter 随机失效
    const selectedStaffPosRef = useRef(selectedStaffPos)
    const currentAccidentalRef = useRef(currentAccidental)
    const currentDurationRef = useRef(currentDuration)
    const handleNoteInputRef = useRef(handleNoteInput)
    selectedStaffPosRef.current = selectedStaffPos
    currentAccidentalRef.current = currentAccidental
    currentDurationRef.current = currentDuration
    handleNoteInputRef.current = handleNoteInput

    const handleDelete = useCallback(() => {
        if (!selectedNote) return

        setScore(prev => {
            const newMeasures = prev.measures.map(m => {
                if (m.index !== selectedNote.measureIndex) return m
                const notes = m.notes.filter(n => n.start !== selectedNote.beat)
                return { ...m, notes }
            })
            return { ...prev, measures: newMeasures }
        })
    }, [selectedNote])

    const handleAddMeasure = useCallback(() => {
        setScore(prev => {
            const newIndex = prev.measures.length
            const newMeasure: Measure = {
                index: newIndex,
                notes: [],
                tabNotes: [],
            }
            return { ...prev, measures: [...prev.measures, newMeasure] }
        })
    }, [])

    const handleAnalyze = useCallback(async () => {
        setAnalyzing(true)
        setChordAnnotations([])
        type BeatGroup = { measureIndex: number; beat: number; notes: Note[] }
        const groups: BeatGroup[] = []
        for (const m of score.measures) {
            const beatMap = new Map<number, Note[]>()
            for (const n of m.notes || []) {
                if (!beatMap.has(n.start)) beatMap.set(n.start, [])
                beatMap.get(n.start)!.push(n)
            }
            for (const [beat, notes] of beatMap) {
                if (notes.length >= 2) {
                    groups.push({ measureIndex: m.index, beat, notes })
                }
            }
        }
        const results: ChordAnnotation[] = []
        for (const g of groups) {
            try {
                const res = await scoreApi.analyzeChord({
                    notes: g.notes,
                    tuning: score.tuning ?? DEFAULT_TUNING,
                })
                if (res.type !== "unknown") {
                    results.push({ measureIndex: g.measureIndex, beat: g.beat, label: res.name })
                }
            } catch { }
        }
        setChordAnnotations(results)
        setAnalyzing(false)
        if (results.length === 0) {
            showAlert("分析完成", "未检测到和弦（需要同一拍有 2 个以上音符）")
        }
    }, [score.measures, score.tuning])

    const handleMoveLeft = useCallback(() => {
        setSelectedNote(prev => {
            let next: SelectedStaffNote | null = null
            const step = currentDurationRef.current
            if (!prev) {
                next = { measureIndex: 0, beat: 0 }
            } else if (prev.beat > 0) {
                const newBeat = Math.round((prev.beat - step) * 10000) / 10000
                next = { ...prev, beat: Math.max(0, newBeat) }
            } else if (prev.measureIndex > 0) {
                const prevMeasure = score.measures.find(m => m.index === prev.measureIndex - 1)
                const prevNotes = prevMeasure?.notes || []
                // 跳到上一小节最后一个音符的起始位置
                const targetBeat = prevNotes.length > 0
                    ? Math.max(...prevNotes.map(n => n.start))
                    : 0
                next = { measureIndex: prev.measureIndex - 1, beat: targetBeat }
            } else {
                next = prev
            }
            if (next && next !== prev) {
                seekTo(next.measureIndex, next.beat)
            }
            return next
        })
    }, [score.measures, seekTo])

    const handleMoveRight = useCallback(() => {
        if (!selectedNote) {
            setSelectedNote({ measureIndex: 0, beat: 0 })
            seekTo(0, 0)
            return
        }
        const step = currentDurationRef.current
        const currentMeasure = score.measures.find(m => m.index === selectedNote.measureIndex)
        const notes = currentMeasure?.notes || []
        const maxNoteEnd = notes.length > 0
            ? Math.max(...notes.map(n => n.start + n.duration))
            : 0
        const measureFull = maxNoteEnd >= beatsPerMeasure

        // 小节未满：按当前时值步进，若下一位置仍在已有内容范围内则留在本小节
        const nextBeat = Math.round((selectedNote.beat + step) * 10000) / 10000
        if (!measureFull && nextBeat <= maxNoteEnd) {
            const next = { ...selectedNote, beat: nextBeat }
            setSelectedNote(next)
            seekTo(next.measureIndex, next.beat)
            return
        }
        // 跳到下一个已有小节
        if (selectedNote.measureIndex < score.measures.length - 1) {
            const next = { measureIndex: selectedNote.measureIndex + 1, beat: 0 }
            setSelectedNote(next)
            seekTo(next.measureIndex, next.beat)
            return
        }
        // 已在最后一个小节且无法继续移动：自动添加新小节并跳转
        const newIndex = score.measures.length
        setScore(prev => ({
            ...prev,
            measures: [...prev.measures, { index: prev.measures.length, notes: [], tabNotes: [] }],
        }))
        setSelectedNote({ measureIndex: newIndex, beat: 0 })
        seekTo(newIndex, 0)
    }, [beatsPerMeasure, score.measures, selectedNote, seekTo])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 仅处理我们关心的按键
            const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Delete", "Backspace", " "]
            if (!handled.includes(e.key)) return

            // capture 阶段 + stopPropagation：确保任何已获焦的按钮（如"分析"）
            // 无法通过自己的 keydown 处理器拦截这些按键
            e.preventDefault()
            e.stopPropagation()

            if (e.key === "ArrowLeft") {
                handleMoveLeft()
            } else if (e.key === "ArrowRight") {
                handleMoveRight()
            } else if (e.key === "ArrowUp") {
                setSelectedStaffPos(prev => Math.min(prev + 1, 16))
            } else if (e.key === "ArrowDown") {
                setSelectedStaffPos(prev => Math.max(prev - 1, -8))
            } else if (e.key === "Enter") {
                // 通过 ref 读取最新值，避免 stale closure
                const pitch = staffPositionToPitch(selectedStaffPosRef.current, currentAccidentalRef.current)
                handleNoteInputRef.current(pitch, currentDurationRef.current)
            } else if (e.key === "Delete" || e.key === "Backspace") {
                handleDelete()
            } else if (e.key === " ") {
                togglePlayPause()
            }
        }
        // true = capture 阶段，先于任何元素的 keydown 处理器执行
        window.addEventListener("keydown", handleKeyDown, true)
        return () => window.removeEventListener("keydown", handleKeyDown, true)
    }, [handleMoveLeft, handleMoveRight, handleDelete, togglePlayPause])

    const accidentalLabel = currentAccidental === "#" ? "♯" : currentAccidental === "b" ? "♭" : ""
    const currentPitchLabel = staffPositionToPitch(selectedStaffPos, currentAccidental)
    const selectedInfo = selectedNote
        ? `小节 ${selectedNote.measureIndex + 1} | 拍 ${selectedNote.beat + 1} | 音高 ${currentPitchLabel} | 时值 ${currentDuration}${accidentalLabel ? ` | ${accidentalLabel}` : ""}`
        : "点击五线谱选择位置，用 ↑↓ 调整音高，Enter 添加音符"

    // 每个小节的动态起始 X（与 StaffNotation 内部 measureLayout 保持一致）
    const measureStartXs = useMemo(() => {
        const result: number[] = []
        let x = LEFT_MARGIN
        for (const m of score.measures) {
            result.push(x)
            const notes = m.notes || []
            const maxNoteEnd = notes.length > 0
                ? Math.max(...notes.map(n => n.start + n.duration))
                : 0
            const isFull = maxNoteEnd >= beatsPerMeasure
            // 小节满时固定为 beatsPerMeasure 宽，否则按实际音符末尾向上取整
            const beatSpan = isFull ? beatsPerMeasure : Math.max(1, Math.ceil(maxNoteEnd))
            x += beatSpan * BEAT_WIDTH
        }
        return result
    }, [score.measures, beatsPerMeasure])

    // 播放时自动滚动到当前位置
    useEffect(() => {
        if (currentPosition && scrollViewRef.current) {
            const measureX = measureStartXs[currentPosition.measureIndex] ?? LEFT_MARGIN
            const x = measureX + currentPosition.beat * BEAT_WIDTH
            scrollViewRef.current.scrollTo({ x: Math.max(0, x - 150), animated: true })
        }
    }, [currentPosition, measureStartXs])

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← 返回</Text>
                </TouchableOpacity>
                <Text style={styles.scoreTitle} numberOfLines={1}>
                    {score.title || "未命名乐谱"}
                </Text>
                <View style={styles.playbackControls}>
                    <TouchableOpacity
                        style={[
                            styles.playBtn,
                            playbackState === "playing" && styles.playBtnActive,
                        ]}
                        onPress={togglePlayPause}
                    >
                        <Text style={[
                            styles.playBtnText,
                            playbackState === "playing" && styles.playBtnTextActive,
                        ]}>
                            {playbackState === "playing" ? "⏸ 暂停" : "▶ 播放"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.stopBtn, playbackState === "stopped" && { opacity: 0 }]}
                        onPress={stop}
                        disabled={playbackState === "stopped"}
                    >
                        <Text style={styles.stopBtnText}>⏹ 停止</Text>
                    </TouchableOpacity>
                    <Text style={styles.bpmText}>{score.bpm} BPM</Text>
                    <TouchableOpacity
                        style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
                        onPress={(e) => {
                            handleAnalyze()
                            ;(e?.target as any)?.blur?.()
                        }}
                        disabled={analyzing}
                    >
                        <Text style={styles.analyzeBtnText}>
                            {analyzing ? "分析中..." : "🔍 分析"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.chordBtn}
                        onPress={(e) => {
                            setChordModalVisible(true)
                            ;(e?.target as any)?.blur?.()
                        }}
                    >
                        <Text style={styles.chordBtnText}>🎹 和弦</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={(e) => {
                            setSaveModalVisible(true)
                            ;(e?.target as any)?.blur?.()
                        }}
                        disabled={saving}
                    >
                        <Text style={styles.saveBtnText}>💾 保存</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <SaveTitleModal
                visible={saveModalVisible}
                initialTitle={score.title || ""}
                isSaving={saving}
                onCancel={() => setSaveModalVisible(false)}
                onSave={handleSave}
            />
            <ScrollView
                ref={scrollViewRef}
                horizontal
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsHorizontalScrollIndicator={true}
                onLayout={handleScrollViewLayout}
            >
                <View style={{ position: "relative" }}>
                    <StaffNotation
                        measures={score.measures}
                        timeSignature={score.timeSignature}
                        selectedNote={selectedNote}
                        onNoteSelect={handleNoteSelect}
                        height={canvasHeight}
                        selectedStaffPos={selectedStaffPos}
                        noteResolution={currentDuration}
                    />
                    {/* 和弦标注：渲染为普通 View，不影响 Skia canvas，避免触发重渲染导致音符消失 */}
                    {chordAnnotations.map((ann) => {
                        const measureX = measureStartXs[ann.measureIndex]
                        if (measureX == null || canvasHeight === 0) return null
                        const cx = measureX + ann.beat * BEAT_WIDTH + BEAT_WIDTH / 2
                        // 标注位置：canvas 顶部往下约 8px（五线谱第5线上方）
                        const labelTop = 8
                        return (
                            <View
                                key={`chord-${ann.measureIndex}-${ann.beat}`}
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    left: cx - 30,
                                    top: labelTop,
                                    backgroundColor: "rgba(99, 102, 241, 0.15)",
                                    borderRadius: 4,
                                    paddingHorizontal: 5,
                                    paddingVertical: 2,
                                }}
                            >
                                <Text style={{ color: "#6366f1", fontSize: 11, fontWeight: "600" }}>
                                    {ann.label}
                                </Text>
                            </View>
                        )
                    })}
                    {currentPosition && canvasHeight > 0 && (() => {
                        const measureX = measureStartXs[currentPosition.measureIndex] ?? LEFT_MARGIN
                        const playbackX = measureX + currentPosition.beat * BEAT_WIDTH + BEAT_WIDTH / 2
                        return (
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: 2,
                                    height: canvasHeight,
                                    backgroundColor: "rgba(255,192,203, 0.5)",
                                    transform: [{ translateX: playbackX - 1 }],
                                }}
                            />
                        )
                    })()}
                </View>
            </ScrollView>
            <StaffToolbar
                onNoteInput={handleNoteInput}
                onDelete={handleDelete}
                onAddMeasure={handleAddMeasure}
                onMoveLeft={handleMoveLeft}
                onMoveRight={handleMoveRight}
                selectedInfo={selectedInfo}
                currentOctave={currentOctave}
                onOctaveChange={setCurrentOctave}
                currentDuration={currentDuration}
                onDurationChange={setCurrentDuration}
                currentAccidental={currentAccidental}
                onAccidentalChange={setCurrentAccidental}
            />
            <ChordScaleModal
                visible={chordModalVisible}
                onClose={() => setChordModalVisible(false)}
                measure={score.measures[currentPosition?.measureIndex ?? selectedNote?.measureIndex ?? 0] ?? null}
                tuning={score.tuning ?? DEFAULT_TUNING}
                measureIndex={currentPosition?.measureIndex ?? selectedNote?.measureIndex ?? 0}
                currentBeat={currentPosition?.beat ?? selectedNote?.beat ?? null}
            />
        </View>
    )
}

function TabNotationEditor({ onBack, initialScore, scoreId }: { onBack: () => void; initialScore?: ScoreType; scoreId?: string }) {
    const [score, setScore] = useState<ScoreType>(initialScore || emptyScore)
    const [currentScoreId, setCurrentScoreId] = useState<string | undefined>(scoreId)
    const [saving, setSaving] = useState(false)
    const [saveModalVisible, setSaveModalVisible] = useState(false)
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
    const [chordModalVisible, setChordModalVisible] = useState(false)
    const [currentDuration, setCurrentDuration] = useState(1)
    // 数字键多位输入缓存（例如按 1 再按 2 组成 12）
    const fretInputBufferRef = useRef<{ value: string; timer: number | null }>({ value: "", timer: null })

    const handleSave = useCallback(async (title: string) => {
        setSaving(true)
        try {
            const payload = {
                title,
                bpm: score.bpm,
                timeSignature: score.timeSignature,
                tuning: score.tuning,
                measures: score.measures,
            }
            if (currentScoreId) {
                const updated = await scoreApi.update(currentScoreId, payload)
                setScore(prev => ({ ...prev, ...updated }))
                setSaveModalVisible(false)
                showAlert("保存成功", "乐谱已更新")
            } else {
                const created = await scoreApi.create(payload)
                setCurrentScoreId(created._id)
                setScore(prev => ({ ...prev, ...created }))
                setSaveModalVisible(false)
                showAlert("保存成功", "乐谱已创建")
            }
        } catch (e) {
            showAlert("保存失败", "请检查网络连接和后端服务")
        } finally {
            setSaving(false)
        }
    }, [score, currentScoreId])

    const beatsPerMeasure = score.timeSignature.beats

    const handleCellSelect = useCallback((cell: SelectedCell) => {
        setSelectedCell(cell)
    }, [])

    const handleFretInput = useCallback((fret: number) => {
        if (!selectedCell) return

        setScore(prev => {
            const newMeasures = prev.measures.map(m => {
                if (m.index !== selectedCell.measureIndex) return m

                const tabNotes = [...(m.tabNotes || [])]
                const existingIdx = tabNotes.findIndex(
                    n => n.beat === selectedCell.beat && n.string === selectedCell.string
                )

                const newNote: TabNote = {
                    string: selectedCell.string,
                    fret,
                    beat: selectedCell.beat,
                    duration: currentDuration,
                }

                if (existingIdx >= 0) {
                    tabNotes[existingIdx] = newNote
                } else {
                    tabNotes.push(newNote)
                }

                return { ...m, tabNotes }
            })
            return { ...prev, measures: newMeasures }
        })
        // 不再自动移动光标，保持在当前格子
    }, [selectedCell, currentDuration])

    const handleDurationChange = useCallback((duration: number) => {
        setCurrentDuration(duration)
        if (!selectedCell) return

        // 更新选中格子上的六线谱音符时值
        setScore(prev => {
            const newMeasures = prev.measures.map(m => {
                if (m.index !== selectedCell.measureIndex) return m
                const tabNotes = [...(m.tabNotes || [])]
                const idx = tabNotes.findIndex(
                    n => n.beat === selectedCell.beat && n.string === selectedCell.string
                )
                if (idx >= 0) {
                    tabNotes[idx] = { ...tabNotes[idx], duration }
                }
                return { ...m, tabNotes }
            })
            return { ...prev, measures: newMeasures }
        })
    }, [selectedCell])

    const handleDelete = useCallback(() => {
        if (!selectedCell) return

        setScore(prev => {
            const newMeasures = prev.measures.map(m => {
                if (m.index !== selectedCell.measureIndex) return m
                const tabNotes = (m.tabNotes || []).filter(
                    n => !(n.beat === selectedCell.beat && n.string === selectedCell.string)
                )
                return { ...m, tabNotes }
            })
            return { ...prev, measures: newMeasures }
        })
    }, [selectedCell])

    const handleAddMeasure = useCallback(() => {
        setScore(prev => {
            const newIndex = prev.measures.length
            const newMeasure: Measure = {
                index: newIndex,
                notes: [],
                tabNotes: [],
            }
            return { ...prev, measures: [...prev.measures, newMeasure] }
        })
    }, [])

    const handleMoveLeft = useCallback(() => {
        setSelectedCell(prev => {
            if (!prev) return { measureIndex: 0, beat: 0, string: 1 }
            if (prev.beat > 0) return { ...prev, beat: prev.beat - 1 }
            if (prev.measureIndex > 0) {
                const prevMeasure = score.measures.find(m => m.index === prev.measureIndex - 1)
                const prevTabNotes = prevMeasure?.tabNotes || []
                const prevBeatSpan = getTabMeasureBeatSpan(prevTabNotes)
                const prevIsFull = getTabMeasureDuration(prevTabNotes) >= beatsPerMeasure
                // 跳到前一小节的实际光标位置，不超出其可见范围
                const targetBeat = prevIsFull
                    ? beatsPerMeasure - 1
                    : Math.max(0, prevBeatSpan - 1)
                return { ...prev, measureIndex: prev.measureIndex - 1, beat: targetBeat }
            }
            return prev
        })
    }, [beatsPerMeasure, score.measures])

    const handleMoveRight = useCallback(() => {
        if (!selectedCell) {
            setSelectedCell({ measureIndex: 0, beat: 0, string: 1 })
            return
        }
        const currentMeasure = score.measures.find(m => m.index === selectedCell.measureIndex)
        const tabNotes = currentMeasure?.tabNotes || []
        const beatSpan = getTabMeasureBeatSpan(tabNotes)
        const measureFull = getTabMeasureDuration(tabNotes) >= beatsPerMeasure

        // 小节未满时，先在当前已可见范围内移动
        if (!measureFull && selectedCell.beat + 1 < beatSpan) {
            setSelectedCell({ ...selectedCell, beat: selectedCell.beat + 1 })
            return
        }
        // 小节未满但已经到当前可见末尾时，继续在本小节扩出下一格
        if (!measureFull) {
            setSelectedCell({ ...selectedCell, beat: selectedCell.beat + 1 })
            return
        }
        // 跳到下一个已有小节
        if (selectedCell.measureIndex < score.measures.length - 1) {
            setSelectedCell({ ...selectedCell, measureIndex: selectedCell.measureIndex + 1, beat: 0 })
            return
        }
        // 已在最后一个已满小节：自动添加新小节并跳转
        const newIndex = score.measures.length
        setScore(prev => ({
            ...prev,
            measures: [...prev.measures, { index: prev.measures.length, notes: [], tabNotes: [] }],
        }))
        setSelectedCell({ measureIndex: newIndex, beat: 0, string: selectedCell.string })
    }, [beatsPerMeasure, score.measures, selectedCell])

    const handleMoveUp = useCallback(() => {
        setSelectedCell(prev => {
            if (!prev) return { measureIndex: 0, beat: 0, string: 1 }
            if (prev.string > 1) return { ...prev, string: prev.string - 1 }
            return prev
        })
    }, [])

    const handleMoveDown = useCallback(() => {
        setSelectedCell(prev => {
            if (!prev) return { measureIndex: 0, beat: 0, string: 1 }
            if (prev.string < 6) return { ...prev, string: prev.string + 1 }
            return prev
        })
    }, [])

    useEffect(() => {
        const flushBuffer = () => {
            const buf = fretInputBufferRef.current
            if (!buf.value) return
            const fret = parseInt(buf.value, 10)
            if (!Number.isNaN(fret) && fret >= 0 && fret <= 24) {
                handleFretInput(fret)
            }
            if (buf.timer != null) {
                window.clearTimeout(buf.timer)
            }
            fretInputBufferRef.current = { value: "", timer: null }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // 数字键 0-9 组合成 0–24 品位
            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault()
                e.stopPropagation()
                const buf = fretInputBufferRef.current

                // 新输入：在旧 buffer 基础上追加一位
                const nextValue = (buf.value + e.key).slice(0, 2) // 最多两位即可覆盖 0–24
                const fret = parseInt(nextValue, 10)

                // 先清除旧的延时提交
                if (buf.timer != null) {
                    window.clearTimeout(buf.timer)
                }

                // 如果超出 24，就用当前单个数字作为新的开始
                if (Number.isNaN(fret) || fret > 24) {
                    const singleFret = parseInt(e.key, 10)
                    if (!Number.isNaN(singleFret) && singleFret >= 0 && singleFret <= 24) {
                        handleFretInput(singleFret)
                    }
                    fretInputBufferRef.current = { value: "", timer: null }
                    return
                }

                // 如果已经是两位数（10–24），立即提交
                if (nextValue.length === 2 || nextValue === "0") {
                    handleFretInput(fret)
                    fretInputBufferRef.current = { value: "", timer: null }
                    return
                }

                // 一位数（1–9）先暂存，等待下一位或超时
                const timer = window.setTimeout(() => {
                    flushBuffer()
                }, 400) // 400ms 内未按下一位就按单个品位提交

                fretInputBufferRef.current = { value: nextValue, timer }
                return
            }

            if (e.key === "ArrowLeft") {
                e.preventDefault()
                e.stopPropagation()
                flushBuffer()
                handleMoveLeft()
            } else if (e.key === "ArrowRight") {
                e.preventDefault()
                e.stopPropagation()
                flushBuffer()
                handleMoveRight()
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                e.stopPropagation()
                flushBuffer()
                handleMoveUp()
            } else if (e.key === "ArrowDown") {
                e.preventDefault()
                e.stopPropagation()
                flushBuffer()
                handleMoveDown()
            } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault()
                e.stopPropagation()
                flushBuffer()
                handleDelete()
            }
        }
        window.addEventListener("keydown", handleKeyDown, true)
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true)
            const buf = fretInputBufferRef.current
            if (buf.timer != null) {
                window.clearTimeout(buf.timer)
            }
        }
    }, [handleFretInput, handleMoveLeft, handleMoveRight, handleMoveUp, handleMoveDown, handleDelete])

    const selectedInfo = selectedCell
        ? (() => {
            const measure = score.measures[selectedCell.measureIndex]
            const used = getTabMeasureDuration(measure?.tabNotes)
            const full = used >= beatsPerMeasure
            const status = full ? "已满" : (used === 0 ? "空" : "未满")
            return `小节 ${selectedCell.measureIndex + 1} | 拍 ${selectedCell.beat + 1} | 弦 ${selectedCell.string} | 已用 ${used}/${beatsPerMeasure} 拍（${status}）`
        })()
        : "点击六线谱选择位置"

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← 返回</Text>
                </TouchableOpacity>
                <Text style={styles.scoreTitle} numberOfLines={1}>
                    {score.title || "未命名乐谱"}
                </Text>
                <View style={styles.playbackControls}>
                    <TouchableOpacity
                        style={styles.chordBtn}
                        onPress={() => setChordModalVisible(true)}
                    >
                        <Text style={styles.chordBtnText}>🎹 和弦</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={() => setSaveModalVisible(true)}
                        disabled={saving}
                    >
                        <Text style={styles.saveBtnText}>💾 保存</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <SaveTitleModal
                visible={saveModalVisible}
                initialTitle={score.title || ""}
                isSaving={saving}
                onCancel={() => setSaveModalVisible(false)}
                onSave={handleSave}
            />
            <ScrollView
                horizontal
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsHorizontalScrollIndicator={true}
            >
                <TabStaff
                    measures={score.measures}
                    timeSignature={score.timeSignature}
                    selectedCell={selectedCell}
                    onCellSelect={handleCellSelect}
                />
            </ScrollView>
            <EditorToolbar
                onFretInput={handleFretInput}
                onDelete={handleDelete}
                onAddMeasure={handleAddMeasure}
                onMoveLeft={handleMoveLeft}
                onMoveRight={handleMoveRight}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                selectedInfo={selectedInfo}
                currentDuration={currentDuration}
                onDurationChange={handleDurationChange}
            />
            <ChordScaleModal
                visible={chordModalVisible}
                onClose={() => setChordModalVisible(false)}
                measure={score.measures[selectedCell?.measureIndex ?? 0] ?? null}
                tuning={score.tuning ?? DEFAULT_TUNING}
                measureIndex={selectedCell?.measureIndex ?? 0}
                currentBeat={selectedCell?.beat ?? null}
            />
        </View>
    )
}

export default function Score() {
    const [mode, setMode] = useState<ScoreMode>("menu")
    const [scoreList, setScoreList] = useState<ScoreListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [editingScore, setEditingScore] = useState<ScoreType | undefined>()
    const [editingScoreId, setEditingScoreId] = useState<string | undefined>()

    const loadScores = useCallback(async () => {
        setLoading(true)
        try {
            const list = await scoreApi.list()
            setScoreList(list)
        } catch {
            // silently fail - backend might not be running
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (mode === "menu") loadScores()
    }, [mode, loadScores])

    const handleOpenScore = useCallback(async (item: ScoreListItem, targetMode: ScoreMode) => {
        try {
            const full = await scoreApi.get(item._id)
            setEditingScore(full)
            setEditingScoreId(item._id)
            setMode(targetMode)
        } catch {
            showAlert("加载失败", "无法加载乐谱数据")
        }
    }, [])

    const handleDeleteScore = useCallback((item: ScoreListItem) => {
        showConfirm(`确定要删除「${item.title}」吗？`, async () => {
            try {
                await scoreApi.delete(item._id)
                setScoreList(prev => prev.filter(s => s._id !== item._id))
            } catch {
                showAlert("删除失败", "请检查网络连接")
            }
        })
    }, [])

    const handleBack = useCallback(() => {
        setEditingScore(undefined)
        setEditingScoreId(undefined)
        setMode("menu")
    }, [])

    const handleNewScore = useCallback((targetMode: ScoreMode) => {
        setEditingScore(undefined)
        setEditingScoreId(undefined)
        setMode(targetMode)
    }, [])

    if (mode === "staff") {
        return <StaffNotationView onBack={handleBack} initialScore={editingScore} scoreId={editingScoreId} />
    }

    if (mode === "tab") {
        return <TabNotationEditor onBack={handleBack} initialScore={editingScore} scoreId={editingScoreId} />
    }

    const renderScoreItem = ({ item }: { item: ScoreListItem }) => (
        <View style={styles.scoreItem}>
            <View style={styles.scoreItemInfo}>
                <Text style={styles.scoreItemTitle}>{item.title}</Text>
                <Text style={styles.scoreItemMeta}>
                    {item.bpm} BPM · {item.timeSignature.beats}/{item.timeSignature.beatValue} · {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.scoreItemActions}>
                <TouchableOpacity style={styles.scoreItemBtn} onPress={() => handleOpenScore(item, "staff")}>
                    <Text style={styles.scoreItemBtnText}>五线谱</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scoreItemBtn} onPress={() => handleOpenScore(item, "tab")}>
                    <Text style={styles.scoreItemBtnText}>六线谱</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scoreItemDeleteBtn} onPress={() => handleDeleteScore(item)}>
                    <Text style={styles.scoreItemDeleteText}>删除</Text>
                </TouchableOpacity>
            </View>
        </View>
    )

    return (
        <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>乐谱编辑</Text>
            <Text style={styles.menuSubtitle}>新建乐谱或打开已保存的乐谱</Text>

            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => handleNewScore("staff")}
                    activeOpacity={0.7}
                >
                    <Text style={styles.menuButtonIcon}>🎼</Text>
                    <Text style={styles.menuButtonTitle}>五线谱</Text>
                    <Text style={styles.menuButtonDesc}>新建五线谱</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => handleNewScore("tab")}
                    activeOpacity={0.7}
                >
                    <Text style={styles.menuButtonIcon}>🎸</Text>
                    <Text style={styles.menuButtonTitle}>六线谱</Text>
                    <Text style={styles.menuButtonDesc}>新建六线谱</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listSection}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>已保存乐谱</Text>
                    <TouchableOpacity onPress={loadScores}>
                        <Text style={styles.refreshText}>刷新</Text>
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <ActivityIndicator style={styles.loader} color="#007AFF" />
                ) : scoreList.length === 0 ? (
                    <Text style={styles.emptyText}>暂无已保存的乐谱</Text>
                ) : (
                    <FlatList
                        data={scoreList}
                        keyExtractor={item => item._id}
                        renderItem={renderScoreItem}
                        style={styles.scoreList}
                        contentContainerStyle={styles.scoreListContent}
                    />
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    backButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    backButtonText: {
        fontSize: 16,
        color: "#007AFF",
        fontWeight: "500",
    },
    scoreTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
        marginHorizontal: 8,
    },
    playbackControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    playBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#22c55e",
    },
    playBtnActive: {
        backgroundColor: "#f59e0b",
    },
    playBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ffffff",
    },
    playBtnTextActive: {
        color: "#ffffff",
    },
    stopBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#ef4444",
    },
    stopBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ffffff",
    },
    bpmText: {
        fontSize: 13,
        color: "#6b7280",
        fontWeight: "500",
        marginLeft: 4,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    placeholderIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    placeholderTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#333",
        marginBottom: 8,
    },
    placeholderSubtitle: {
        fontSize: 16,
        color: "#999",
    },
    chordBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#388E3C",
    },
    chordBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#ffffff",
    },
    saveBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#3b82f6",
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ffffff",
    },
    analyzeBtn: {
        backgroundColor: "#6366f1",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    analyzeBtnDisabled: {
        opacity: 0.5,
    },
    analyzeBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ffffff",
    },
    menuContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        paddingTop: 60,
        alignItems: "center",
        paddingHorizontal: 24,
    },
    menuTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    menuSubtitle: {
        fontSize: 15,
        color: "#888",
        marginBottom: 24,
    },
    buttonGroup: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 32,
    },
    menuButton: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: "center",
        width: 160,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    menuButtonIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    menuButtonTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    menuButtonDesc: {
        fontSize: 13,
        color: "#999",
        textAlign: "center",
    },
    listSection: {
        width: "100%",
        flex: 1,
    },
    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1a1a1a",
    },
    refreshText: {
        fontSize: 14,
        color: "#007AFF",
        fontWeight: "500",
    },
    loader: {
        marginTop: 24,
    },
    emptyText: {
        textAlign: "center",
        color: "#999",
        marginTop: 24,
        fontSize: 14,
    },
    scoreList: {
        flex: 1,
    },
    scoreListContent: {
        paddingBottom: 24,
    },
    scoreItem: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    scoreItemInfo: {
        marginBottom: 10,
    },
    scoreItemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    scoreItemMeta: {
        fontSize: 13,
        color: "#888",
    },
    scoreItemActions: {
        flexDirection: "row",
        gap: 8,
    },
    scoreItemBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: "#f0f0f0",
    },
    scoreItemBtnText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#333",
    },
    scoreItemDeleteBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: "#fef2f2",
    },
    scoreItemDeleteText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#ef4444",
    },
})

const saveTitleStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: 320,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        borderWidth: 1.5,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: "#1a1a1a",
        backgroundColor: "#f9fafb",
        marginBottom: 20,
    },
    btnRow: {
        flexDirection: "row",
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#6b7280",
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: "#3b82f6",
        alignItems: "center",
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#fff",
    },
})
