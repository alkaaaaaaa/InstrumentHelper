import React, { useState, useCallback, useRef, useEffect } from "react"
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, LayoutChangeEvent } from "react-native"
import { TabStaff } from "../../components/score/TabStaff"
import { EditorToolbar } from "../../components/score/EditorToolbar"
import { StaffNotation, BEAT_WIDTH, LEFT_MARGIN } from "../../components/score/StaffNotation"
import { StaffToolbar } from "../../components/score/StaffToolbar"
import { Measure, Note, TabNote, Score as ScoreType } from "../../models/Score"
import { useScorePlayer } from "../../hooks/useScorePlayer"
import { scoreApi, ScoreListItem } from "../../utils/api"

type SelectedCell = {
    measureIndex: number
    beat: number
    string: number
}

type ScoreMode = "menu" | "staff" | "tab"

type SelectedStaffNote = {
    measureIndex: number
    beat: number
}

const emptyScore: ScoreType = {
    bpm: 120,
    timeSignature: { beats: 4, beatValue: 4 },
    measures: [
        { index: 0, notes: [], tabNotes: [] },
        { index: 1, notes: [], tabNotes: [] },
        { index: 2, notes: [], tabNotes: [] },
        { index: 3, notes: [], tabNotes: [] },
    ],
}

function StaffNotationView({ onBack, initialScore, scoreId }: { onBack: () => void; initialScore?: ScoreType; scoreId?: string }) {
    const [score, setScore] = useState<ScoreType>(initialScore || emptyScore)
    const [currentScoreId, setCurrentScoreId] = useState<string | undefined>(scoreId)
    const [saving, setSaving] = useState(false)
    const [selectedNote, setSelectedNote] = useState<SelectedStaffNote | null>(null)
    const [currentOctave, setCurrentOctave] = useState(4)
    const [currentDuration, setCurrentDuration] = useState(1)
    const [currentAccidental, setCurrentAccidental] = useState("")

    const { playbackState, currentPosition, play, pause, stop, togglePlayPause } = useScorePlayer(score)
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

    const handleSave = useCallback(async () => {
        setSaving(true)
        try {
            const payload = {
                title: score.title || "未命名乐谱",
                bpm: score.bpm,
                timeSignature: score.timeSignature,
                tuning: score.tuning,
                measures: score.measures,
            }
            if (currentScoreId) {
                const updated = await scoreApi.update(currentScoreId, payload)
                setScore(prev => ({ ...prev, ...updated }))
                Alert.alert("保存成功", "乐谱已更新")
            } else {
                const created = await scoreApi.create(payload)
                setCurrentScoreId(created._id)
                setScore(prev => ({ ...prev, ...created }))
                Alert.alert("保存成功", "乐谱已创建")
            }
        } catch (e) {
            Alert.alert("保存失败", "请检查网络连接和后端服务")
        } finally {
            setSaving(false)
        }
    }, [score, currentScoreId])

    const beatsPerMeasure = score.timeSignature.beats

    const handleNoteSelect = useCallback((note: SelectedStaffNote) => {
        setSelectedNote(note)
    }, [])

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

        // 自动前进到下一拍
        setSelectedNote(prev => {
            if (!prev) return null
            const nextBeat = prev.beat + 1
            if (nextBeat < beatsPerMeasure) {
                return { ...prev, beat: nextBeat }
            }
            const nextMeasureIdx = prev.measureIndex + 1
            if (nextMeasureIdx < score.measures.length) {
                return { measureIndex: nextMeasureIdx, beat: 0 }
            }
            return prev
        })
    }, [selectedNote, beatsPerMeasure, score.measures.length])

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

    const handleMoveLeft = useCallback(() => {
        setSelectedNote(prev => {
            if (!prev) return { measureIndex: 0, beat: 0 }
            if (prev.beat > 0) return { ...prev, beat: prev.beat - 1 }
            if (prev.measureIndex > 0) {
                return { measureIndex: prev.measureIndex - 1, beat: beatsPerMeasure - 1 }
            }
            return prev
        })
    }, [beatsPerMeasure])

    const handleMoveRight = useCallback(() => {
        setSelectedNote(prev => {
            if (!prev) return { measureIndex: 0, beat: 0 }
            if (prev.beat < beatsPerMeasure - 1) return { ...prev, beat: prev.beat + 1 }
            if (prev.measureIndex < score.measures.length - 1) {
                return { measureIndex: prev.measureIndex + 1, beat: 0 }
            }
            return prev
        })
    }, [beatsPerMeasure, score.measures.length])

    const accidentalLabel = currentAccidental === "#" ? "♯" : currentAccidental === "b" ? "♭" : ""
    const selectedInfo = selectedNote
        ? `小节 ${selectedNote.measureIndex + 1} | 拍 ${selectedNote.beat + 1} | 八度 ${currentOctave} | 时值 ${currentDuration}${accidentalLabel ? ` | ${accidentalLabel}` : ""}`
        : "点击五线谱选择位置"

    // 播放时自动滚动到当前位置
    const beatsPerMeasureForScroll = score.timeSignature.beats
    useEffect(() => {
        if (currentPosition && scrollViewRef.current) {
            const x = LEFT_MARGIN + currentPosition.measureIndex * beatsPerMeasureForScroll * BEAT_WIDTH + currentPosition.beat * BEAT_WIDTH
            scrollViewRef.current.scrollTo({ x: Math.max(0, x - 150), animated: true })
        }
    }, [currentPosition, beatsPerMeasureForScroll])

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← 返回</Text>
                </TouchableOpacity>
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
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={styles.saveBtnText}>
                            {saving ? "保存中..." : "💾 保存"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
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
                    />
                    {currentPosition && canvasHeight > 0 && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                width: BEAT_WIDTH - 8,
                                height: canvasHeight,
                                backgroundColor: "rgba(34, 197, 94, 0.25)",
                                borderWidth: 1.5,
                                borderColor: "rgba(34, 197, 94, 0.8)",
                                transform: [{ translateX: LEFT_MARGIN + currentPosition.measureIndex * beatsPerMeasure * BEAT_WIDTH + currentPosition.beat * BEAT_WIDTH - BEAT_WIDTH / 2 + 4 }],
                            }}
                        />
                    )}
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
        </View>
    )
}

function TabNotationEditor({ onBack, initialScore, scoreId }: { onBack: () => void; initialScore?: ScoreType; scoreId?: string }) {
    const [score, setScore] = useState<ScoreType>(initialScore || emptyScore)
    const [currentScoreId, setCurrentScoreId] = useState<string | undefined>(scoreId)
    const [saving, setSaving] = useState(false)
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

    const handleSave = useCallback(async () => {
        setSaving(true)
        try {
            const payload = {
                title: score.title || "未命名乐谱",
                bpm: score.bpm,
                timeSignature: score.timeSignature,
                tuning: score.tuning,
                measures: score.measures,
            }
            if (currentScoreId) {
                const updated = await scoreApi.update(currentScoreId, payload)
                setScore(prev => ({ ...prev, ...updated }))
                Alert.alert("保存成功", "乐谱已更新")
            } else {
                const created = await scoreApi.create(payload)
                setCurrentScoreId(created._id)
                setScore(prev => ({ ...prev, ...created }))
                Alert.alert("保存成功", "乐谱已创建")
            }
        } catch (e) {
            Alert.alert("保存失败", "请检查网络连接和后端服务")
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

        setSelectedCell(prev => {
            if (!prev) return null
            const nextBeat = prev.beat + 1
            if (nextBeat < beatsPerMeasure) {
                return { ...prev, beat: nextBeat }
            }
            const nextMeasureIdx = prev.measureIndex + 1
            if (nextMeasureIdx < score.measures.length) {
                return { measureIndex: nextMeasureIdx, beat: 0, string: prev.string }
            }
            return prev
        })
    }, [selectedCell, beatsPerMeasure, score.measures.length])

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
                return { ...prev, measureIndex: prev.measureIndex - 1, beat: beatsPerMeasure - 1 }
            }
            return prev
        })
    }, [beatsPerMeasure])

    const handleMoveRight = useCallback(() => {
        setSelectedCell(prev => {
            if (!prev) return { measureIndex: 0, beat: 0, string: 1 }
            if (prev.beat < beatsPerMeasure - 1) return { ...prev, beat: prev.beat + 1 }
            if (prev.measureIndex < score.measures.length - 1) {
                return { ...prev, measureIndex: prev.measureIndex + 1, beat: 0 }
            }
            return prev
        })
    }, [beatsPerMeasure, score.measures.length])

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

    const selectedInfo = selectedCell
        ? `小节 ${selectedCell.measureIndex + 1} | 拍 ${selectedCell.beat + 1} | 弦 ${selectedCell.string}`
        : "点击六线谱选择位置"

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← 返回</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveBtnText}>
                        {saving ? "保存中..." : "💾 保存"}
                    </Text>
                </TouchableOpacity>
            </View>
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
            Alert.alert("加载失败", "无法加载乐谱数据")
        }
    }, [])

    const handleDeleteScore = useCallback((item: ScoreListItem) => {
        Alert.alert("删除确认", `确定要删除「${item.title}」吗？`, [
            { text: "取消", style: "cancel" },
            {
                text: "删除", style: "destructive", onPress: async () => {
                    try {
                        await scoreApi.delete(item._id)
                        setScoreList(prev => prev.filter(s => s._id !== item._id))
                    } catch {
                        Alert.alert("删除失败", "请检查网络连接")
                    }
                }
            },
        ])
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
