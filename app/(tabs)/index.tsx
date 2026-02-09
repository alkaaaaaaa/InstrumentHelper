import { View, Button } from 'tamagui'
import { StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function Home() {
    const router = useRouter()
    return (
        <View style={styles.container}>
            <Button onPress={() => router.push('/score')}>谱子</Button>
            <Button onPress={() => router.push('/learn')}>学习</Button>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        gap: 10
    }
})
