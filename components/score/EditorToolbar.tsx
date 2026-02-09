import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"

type Props = {
    onFretInput: (fret: number) => void
    onDelete: () => void
    onAddMeasure: () => void
    onMoveLeft: () => void
    onMoveRight: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    selectedInfo: string
}

export function EditorToolbar({
    onFretInput,
    onDelete,
    onAddMeasure,
    onMoveLeft,
    onMoveRight,
    onMoveUp,
    onMoveDown,
    selectedInfo,
}: Props) {
    return (
        <View style={styles.container}>
            {/* 选中信息 */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>{selectedInfo}</Text>
            </View>

            {/* 方向键 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>移动</Text>
                <TouchableOpacity style={styles.navBtn} onPress={onMoveUp}>
                    <Text style={styles.navBtnText}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={onMoveDown}>
                    <Text style={styles.navBtnText}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={onMoveLeft}>
                    <Text style={styles.navBtnText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={onMoveRight}>
                    <Text style={styles.navBtnText}>▶</Text>
                </TouchableOpacity>
            </View>

            {/* 品位数字输入 0-9 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>品位</Text>
                {Array.from({ length: 10 }).map((_, i) => (
                    <TouchableOpacity
                        key={`fret-${i}`}
                        style={styles.fretBtn}
                        onPress={() => onFretInput(i)}
                    >
                        <Text style={styles.fretBtnText}>{i}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 高品位 10-19 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>高品</Text>
                {Array.from({ length: 10 }).map((_, i) => (
                    <TouchableOpacity
                        key={`fret-${i + 10}`}
                        style={[styles.fretBtn, styles.fretBtnHigh]}
                        onPress={() => onFretInput(i + 10)}
                    >
                        <Text style={styles.fretBtnText}>{i + 10}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 操作按钮 */}
            <View style={styles.row}>
                <Text style={styles.sectionLabel}>操作</Text>
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
})
