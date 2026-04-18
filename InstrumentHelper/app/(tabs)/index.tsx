import { View, Button } from 'tamagui'
import { StyleSheet, ImageBackground } from 'react-native'
import { useRouter } from 'expo-router'

export default function Home() {
    const router = useRouter()
    return (
        <ImageBackground
            source={require('../../assets/background.jpg')}
            style={styles.background}
            resizeMode="cover"
        >
            <View style={styles.container}>
                <Button onPress={() => router.push('/score')}>乐谱查看&编写</Button>
                <Button onPress={() => router.push('/learn')}>学习</Button>
            </View>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        gap: 10
    }
})
