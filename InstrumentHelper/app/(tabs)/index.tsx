import { useRouter } from 'expo-router'
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native'

export default function Home() {
    const router = useRouter()

    return (
        <ImageBackground
            source={require('../../assets/background.jpg')}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.heroCard}>
                        <Text style={styles.eyebrow}>Instrument Helper</Text>
                        <Text style={styles.title}>欢迎来到你的音乐小岛</Text>
                        <Text style={styles.subtitle}>
                            像整理岛屿一样整理乐理、和弦与灵感，把练习变得更轻松一点。
                        </Text>

                        <View style={styles.buttonGroup}>
                            <Pressable
                                style={[styles.actionButton, styles.primaryButton]}
                                onPress={() => router.push('/score')}
                            >
                                <Text style={[styles.actionTitle, styles.primaryActionTitle]}>
                                    乐谱查看与编写
                                </Text>
                                <Text style={[styles.actionSubtitle, styles.primaryActionSubtitle]}>
                                    打开编辑器，继续你的谱面创作
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[styles.actionButton, styles.secondaryButton]}
                                onPress={() => router.push('/learn')}
                            >
                                <Text style={styles.actionTitle}>学习模块</Text>
                                <Text style={styles.actionSubtitle}>
                                    复习和弦、音阶和调式知识
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.tipCard}>
                        <Text style={styles.tipTitle}>今日建议</Text>
                        <Text style={styles.tipText}>
                            先学一个进行，再去编辑器里弹 2-3 次，记忆会更牢。
                        </Text>
                    </View>
                </View>
            </View>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
    backgroundImage: {
        width: '100%',
        height: '100%'
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(250, 245, 232, 0.24)'
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 32,
        justifyContent: 'center',
        gap: 18
    },
    heroCard: {
        backgroundColor: 'rgba(255, 251, 240, 0.92)',
        borderRadius: 28,
        paddingHorizontal: 22,
        paddingVertical: 26,
        borderWidth: 2,
        borderColor: '#f4d7a7',
        shadowColor: '#9b7b45',
        shadowOpacity: 0.16,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 7
    },
    eyebrow: {
        alignSelf: 'flex-start',
        backgroundColor: '#d8f0d2',
        color: '#406343',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 14,
        overflow: 'hidden'
    },
    title: {
        fontSize: 30,
        lineHeight: 38,
        fontWeight: '800',
        color: '#5b3f1f',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 24,
        color: '#6c5a43',
        marginBottom: 20
    },
    buttonGroup: {
        gap: 14
    },
    actionButton: {
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 18,
        borderWidth: 2
    },
    primaryButton: {
        backgroundColor: '#84c98a',
        borderColor: '#6aaa72'
    },
    secondaryButton: {
        backgroundColor: '#fff4d6',
        borderColor: '#f0d28a'
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#6a5129',
        marginBottom: 6
    },
    primaryActionTitle: {
        color: '#214d29'
    },
    actionSubtitle: {
        fontSize: 13,
        lineHeight: 20,
        color: '#7b6a52'
    },
    primaryActionSubtitle: {
        color: '#2f6037'
    },
    tipCard: {
        alignSelf: 'center',
        maxWidth: 420,
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: 'rgba(240, 210, 138, 0.9)'
    },
    tipTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#8a6a34',
        marginBottom: 6,
        textAlign: 'center'
    },
    tipText: {
        fontSize: 13,
        lineHeight: 19,
        color: '#6d5a43',
        textAlign: 'center'
    }
})
