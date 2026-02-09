import React, { useState, useCallback } from "react"
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native"
import { TabStaff } from "../../components/score/TabStaff"
import { EditorToolbar } from "../../components/score/EditorToolbar"
import { StaffNotation } from "../../components/score/StaffNotation"
import { StaffToolbar } from "../../components/score/StaffToolbar"
import { demoScore } from "../../data/demoScore"
import { Measure, Note, TabNote, Score as ScoreType } from "../../models/Score"

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

function StaffNotationView({ onBack }: { onBack: () => void }) {
    const [score, setScore] = useState<ScoreType>(demoScore)
    const [selectedNote, setSelectedNote] = useState<SelectedStaffNote | null>(null)
    const [currentOctave, setCurrentOctave] = useState(4)
    const [currentDuration, setCurrentDuration] = useState(1)
    const [currentAccidental, setCurrentAccidental] = useState("")

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

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>← 返回</Text>
            </TouchableOpacity>
            <ScrollView
                horizontal
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsHorizontalScrollIndicator={true}
            >
                <StaffNotation
                    measures={score.measures}
                    timeSignature={score.timeSignature}
                    selectedNote={selectedNote}
                    onNoteSelect={handleNoteSelect}
                />
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

function TabNotationEditor({ onBack }: { onBack: () => void }) {
    const [score, setScore] = useState<ScoreType>(demoScore)
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

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
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>← 返回</Text>
            </TouchableOpacity>
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

    if (mode === "staff") {
        return <StaffNotationView onBack={() => setMode("menu")} />
    }

    if (mode === "tab") {
        return <TabNotationEditor onBack={() => setMode("menu")} />
    }

    return (
        <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>乐谱编辑</Text>
            <Text style={styles.menuSubtitle}>选择乐谱类型开始编辑</Text>

            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMode("staff")}
                    activeOpacity={0.7}
                >
                    <Text style={styles.menuButtonIcon}>🎼</Text>
                    <Text style={styles.menuButtonTitle}>五线谱</Text>
                    <Text style={styles.menuButtonDesc}>标准五线谱记谱法</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMode("tab")}
                    activeOpacity={0.7}
                >
                    <Text style={styles.menuButtonIcon}>🎸</Text>
                    <Text style={styles.menuButtonTitle}>六线谱</Text>
                    <Text style={styles.menuButtonDesc}>吉他六线谱编辑器</Text>
                </TouchableOpacity>
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
    backButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#f5f5f5",
    },
    backButtonText: {
        fontSize: 16,
        color: "#007AFF",
        fontWeight: "500",
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
    menuContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        justifyContent: "center",
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
        marginBottom: 40,
    },
    buttonGroup: {
        flexDirection: "row",
        gap: 16,
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
})
