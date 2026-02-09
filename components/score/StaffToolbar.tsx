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
    onDelete: () => void
    onAddMeasure: () => void
    onMoveLeft: () => void
    onMoveRight: () => void
    selectedInfo: string
    currentOctave: number
    onOctaveChange: (octave: number) => void
    currentDuration: number
    onDurationChange: (duration: number) => void
    currentAccidental: string
    onAccidentalChange: (accidental: string) => void
}

export function StaffToolbar({
    onNoteInput,
    onDelete,
    onAddMeasure,
    onMoveLeft,
    onMoveRight,
    selectedInfo,
    currentOctave,
    onOctaveChange,
    currentDuration,
    onDurationChange,
    currentAccidental,
    onAccidentalChange,
}: Props) {
    return (
        <View style={styles.container}>
            {/* 选中信息 */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>{selectedInfo}</Text>
            </View>

            {/* 时值选择 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>时值</Text>
                {DURATIONS.map((d) => (
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
                ))}
            </View>

            {/* 八度选择 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>八度</Text>
                {OCTAVES.map((oct) => (
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
                ))}
            </View>

            {/* 升降号选择 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>变音</Text>
                {ACCIDENTALS.map((a) => (
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
                ))}
            </View>

            {/* 音名输入 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>音名</Text>
                {NOTE_NAMES.map((name) => (
                    <TouchableOpacity
                        key={`note-${name}`}
                        style={styles.noteBtn}
                        onPress={() => onNoteInput(`${name}${currentAccidental}${currentOctave}`, currentDuration)}
                    >
                        <Text style={styles.noteBtnText}>{name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 导航和操作 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>操作</Text>
                <TouchableOpacity style={styles.navBtn} onPress={onMoveLeft}>
                    <Text style={styles.navBtnText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={onMoveRight}>
                    <Text style={styles.navBtnText}>▶</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                    <Text style={styles.actionBtnText}>删除</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.addBtn]} onPress={onAddMeasure}>
                    <Text style={styles.addBtnText}>+ 小节</Text>
                </TouchableOpacity>
            </View>
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
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        flexWrap: "wrap",
    },
    sectionLabel: {
        fontSize: 11,
        color: "#9ca3af",
        width: 32,
        marginRight: 4,
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
    actionBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#ffffff",
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
