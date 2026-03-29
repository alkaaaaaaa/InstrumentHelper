import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"

// 可用的音名列表
const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"]
const OCTAVES = [3, 4, 5, 6]
const ACCIDENTALS = [
    { label: "♮", value: "", name: "还原" },
    { label: "♯", value: "#", name: "升" },
    { label: "♭", value: "b", name: "降" },
]
const DURATIONS = [
    { label: "𝅝", value: 4, name: "全" },
    { label: "𝅗𝅥", value: 2, name: "二分" },
    { label: "♩", value: 1, name: "四分" },
    { label: "♪", value: 0.5, name: "八分" },
    { label: "𝅘𝅥𝅯", value: 0.25, name: "十六" },
]

type Props = {
    onNoteInput: (pitch: string, duration: number) => void
    onConfirmAdd: () => void
    onDelete: () => void
    onAddMeasure: () => void
    onMoveLeft: () => void
    onMoveRight: () => void
    selectedInfo: string
    confirmLabel: string
    canConfirmAdd: boolean
    currentOctave: number
    onOctaveChange: (octave: number) => void
    currentDuration: number
    onDurationChange: (duration: number) => void
    currentAccidental: string
    onAccidentalChange: (accidental: string) => void
}

export function StaffToolbar({
    onNoteInput,
    onConfirmAdd,
    onDelete,
    onAddMeasure,
    onMoveLeft,
    onMoveRight,
    selectedInfo,
    confirmLabel,
    canConfirmAdd,
    currentOctave,
    onOctaveChange,
    currentDuration,
    onDurationChange,
    currentAccidental,
    onAccidentalChange,
}: Props) {
    const renderRow = (label: string, content: React.ReactNode) => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rowScroll}
            contentContainerStyle={styles.rowScrollContent}
        >
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>{label}</Text>
                {content}
            </View>
        </ScrollView>
    )

    return (
        <View style={styles.container}>
            {/* 选中信息 */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>{selectedInfo}</Text>
            </View>

            {/* 时值选择 */}
            {renderRow("时值", DURATIONS.map((d) => (
                    <TouchableOpacity
                        key={`dur-${d.value}`}
                        style={[
                            styles.durationBtn,
                            currentDuration === d.value && styles.durationBtnActive,
                        ]}
                        onPress={() => onDurationChange(d.value)}
                    >
                        <Text style={[
                            styles.durationBtnText,
                            currentDuration === d.value && styles.durationBtnTextActive,
                        ]}>
                            {d.name}
                        </Text>
                    </TouchableOpacity>
                )))}

            {/* 八度选择 */}
            {renderRow("八度", OCTAVES.map((oct) => (
                    <TouchableOpacity
                        key={`oct-${oct}`}
                        style={[
                            styles.octaveBtn,
                            currentOctave === oct && styles.octaveBtnActive,
                        ]}
                        onPress={() => onOctaveChange(oct)}
                    >
                        <Text style={[
                            styles.octaveBtnText,
                            currentOctave === oct && styles.octaveBtnTextActive,
                        ]}>
                            {oct}
                        </Text>
                    </TouchableOpacity>
                )))}

            {/* 升降号选择 */}
            {renderRow("变音", ACCIDENTALS.map((a) => (
                    <TouchableOpacity
                        key={`acc-${a.value}`}
                        style={[
                            styles.accidentalBtn,
                            currentAccidental === a.value && styles.accidentalBtnActive,
                        ]}
                        onPress={() => onAccidentalChange(a.value)}
                    >
                        <Text style={[
                            styles.accidentalBtnText,
                            currentAccidental === a.value && styles.accidentalBtnTextActive,
                        ]}>
                            {a.label}
                        </Text>
                    </TouchableOpacity>
                )))}

            {/* 音名输入 */}
            {renderRow("音名", NOTE_NAMES.map((name) => (
                    <TouchableOpacity
                        key={`note-${name}`}
                        style={styles.noteBtn}
                        onPress={() => onNoteInput(`${name}${currentAccidental}${currentOctave}`, currentDuration)}
                    >
                        <Text style={styles.noteBtnText}>{name}</Text>
                    </TouchableOpacity>
                )))}

            {/* 导航和操作 */}
            {renderRow("操作", [
                <TouchableOpacity
                    key="confirm-add"
                    style={[
                        styles.actionBtn,
                        styles.confirmBtn,
                        !canConfirmAdd && styles.actionBtnDisabled,
                    ]}
                    onPress={onConfirmAdd}
                    disabled={!canConfirmAdd}
                >
                    <Text style={styles.actionBtnText}>{confirmLabel}</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="move-left" style={styles.navBtn} onPress={onMoveLeft}>
                    <Text style={styles.navBtnText}>◀</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="move-right" style={styles.navBtn} onPress={onMoveRight}>
                    <Text style={styles.navBtnText}>▶</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="delete" style={styles.actionBtn} onPress={onDelete}>
                    <Text style={styles.actionBtnText}>删除</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="add-measure" style={[styles.actionBtn, styles.addBtn]} onPress={onAddMeasure}>
                    <Text style={styles.addBtnText}>+ 小节</Text>
                </TouchableOpacity>,
            ])}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f8f9fa",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    infoBar: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 6,
    },
    infoText: {
        fontSize: 12,
        color: "#6b7280",
        fontFamily: "monospace",
    },
    rowScroll: {
        marginBottom: 6,
    },
    rowScrollContent: {
        paddingRight: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 40,
    },
    sectionLabel: {
        fontSize: 11,
        color: "#9ca3af",
        width: 36,
        marginRight: 8,
    },
    durationBtn: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 6,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d1d5db",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
        marginBottom: 2,
    },
    durationBtnActive: {
        backgroundColor: "#3b82f6",
        borderColor: "#3b82f6",
    },
    durationBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1f2937",
    },
    durationBtnTextActive: {
        color: "#ffffff",
    },
    octaveBtn: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d1d5db",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
    },
    octaveBtnActive: {
        backgroundColor: "#8b5cf6",
        borderColor: "#8b5cf6",
    },
    octaveBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1f2937",
    },
    octaveBtnTextActive: {
        color: "#ffffff",
    },
    noteBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d1d5db",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
        marginBottom: 2,
    },
    noteBtnText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1f2937",
    },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
    },
    navBtnText: {
        fontSize: 14,
        color: "#374151",
    },
    actionBtn: {
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 6,
        backgroundColor: "#ef4444",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    actionBtnDisabled: {
        opacity: 0.5,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#ffffff",
    },
    confirmBtn: {
        backgroundColor: "#16a34a",
    },
    addBtn: {
        backgroundColor: "#3b82f6",
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#ffffff",
    },
    accidentalBtn: {
        width: 44,
        height: 36,
        borderRadius: 6,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d1d5db",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
    },
    accidentalBtnActive: {
        backgroundColor: "#f59e0b",
        borderColor: "#f59e0b",
    },
    accidentalBtnText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1f2937",
    },
    accidentalBtnTextActive: {
        color: "#ffffff",
    },
})
