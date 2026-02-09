import React, { useState, useCallback } from "react"
import { View, ScrollView, StyleSheet } from "react-native"
import { TabStaff } from "../../components/score/TabStaff"
import { EditorToolbar } from "../../components/score/EditorToolbar"
import { demoScore } from "../../data/demoScore"
import { Measure, TabNote, Score as ScoreType } from "../../models/Score"

type SelectedCell = {
    measureIndex: number
    beat: number
    string: number
}

export default function Score() {
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 20,
        alignItems: "center",
    },
})
