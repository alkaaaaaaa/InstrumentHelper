import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"

type Props = {
    onFretInput: (fret: number) => void
    onDelete: () => void
    onAddMeasure: () => void
    onMoveLeft: () => void
    onMoveRight: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    selectedInfo: string
    currentDuration: number
    onDurationChange: (duration: number) => void
    currentBend: number
    onBendChange: (bend: number) => void
}

const BEND_OPTIONS = [
    { label: "无", value: 0 },
    { label: "½音", value: 1 },
    { label: "全音", value: 2 },
    { label: "1½", value: 3 },
]

export function EditorToolbar({
    onFretInput,
    onDelete,
    onAddMeasure,
    onMoveLeft,
    onMoveRight,
    onMoveUp,
    onMoveDown,
    selectedInfo,
    currentDuration,
    onDurationChange,
    currentBend,
    onBendChange,
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
            {renderRow("时值", [
                    { label: "全", value: 4 },
                    { label: "二分", value: 2 },
                    { label: "四分", value: 1 },
                    { label: "八分", value: 0.5 },
                    { label: "十六", value: 0.25 },
                ].map(d => (
                    <TouchableOpacity
                        key={`dur-${d.value}`}
                        style={[
                            styles.durationBtn,
                            currentDuration === d.value && styles.durationBtnActive,
                        ]}
                        onPress={() => onDurationChange(d.value)}
                    >
                        <Text
                            style={[
                                styles.durationBtnText,
                                currentDuration === d.value && styles.durationBtnTextActive,
                            ]}
                        >
                            {d.label}
                        </Text>
                    </TouchableOpacity>
                )))}

            {/* 推弦 */}
            {renderRow("推弦", BEND_OPTIONS.map(b => (
                    <TouchableOpacity
                        key={`bend-${b.value}`}
                        style={[
                            styles.bendBtn,
                            currentBend === b.value && styles.bendBtnActive,
                        ]}
                        onPress={() => onBendChange(b.value)}
                    >
                        <Text style={[
                            styles.bendBtnText,
                            currentBend === b.value && styles.bendBtnTextActive,
                        ]}>
                            {b.label}
                        </Text>
                    </TouchableOpacity>
                )))}

            {/* 方向键 */}
            {renderRow("移动", [
                <TouchableOpacity key="move-up" style={styles.navBtn} onPress={onMoveUp}>
                    <Text style={styles.navBtnText}>▲</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="move-down" style={styles.navBtn} onPress={onMoveDown}>
                    <Text style={styles.navBtnText}>▼</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="move-left" style={styles.navBtn} onPress={onMoveLeft}>
                    <Text style={styles.navBtnText}>◀</Text>
                </TouchableOpacity>,
                <TouchableOpacity key="move-right" style={styles.navBtn} onPress={onMoveRight}>
                    <Text style={styles.navBtnText}>▶</Text>
                </TouchableOpacity>,
            ])}

            {/* 品位数字输入 0-9 */}
            {renderRow("品位", Array.from({ length: 10 }).map((_, i) => (
                    <TouchableOpacity
                        key={`fret-${i}`}
                        style={styles.fretBtn}
                        onPress={() => onFretInput(i)}
                    >
                        <Text style={styles.fretBtnText}>{i}</Text>
                    </TouchableOpacity>
                )))}

            {/* 高品位 10-19 */}
            {renderRow("高品", Array.from({ length: 10 }).map((_, i) => (
                    <TouchableOpacity
                        key={`fret-${i + 10}`}
                        style={[styles.fretBtn, styles.fretBtnHigh]}
                        onPress={() => onFretInput(i + 10)}
                    >
                        <Text style={styles.fretBtnText}>{i + 10}</Text>
                    </TouchableOpacity>
                )))}

            {/* 操作按钮 */}
            {renderRow("操作", [
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
    fretBtn: {
        width: 32,
        height: 36,
        borderRadius: 6,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d1d5db",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 4,
        marginBottom: 2,
    },
    fretBtnHigh: {
        backgroundColor: "#f3f4f6",
    },
    fretBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1f2937",
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
    durationBtn: {
        paddingHorizontal: 10,
        height: 32,
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
        fontSize: 12,
        fontWeight: "600",
        color: "#1f2937",
    },
    durationBtnTextActive: {
        color: "#ffffff",
    },
    bendBtn: {
        paddingHorizontal: 12,
        height: 32,
        borderRadius: 6,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d1d5db",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
        marginBottom: 2,
    },
    bendBtnActive: {
        backgroundColor: "#e05c00",
        borderColor: "#e05c00",
    },
    bendBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1f2937",
    },
    bendBtnTextActive: {
        color: "#ffffff",
    },
})
