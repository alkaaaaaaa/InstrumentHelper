import { TamaguiProvider } from 'tamagui'
import { config } from '../tamagui.config'
import { Stack } from 'expo-router'

export default function RootLayout() {
    return (
        <TamaguiProvider config={config} defaultTheme="light">
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="chord/[symbol]"
                    options={{
                        title: '和弦详情',
                        headerBackTitle: '返回',
                        headerStyle: { backgroundColor: '#F8FAFC' },
                        headerTintColor: '#2563EB',
                        headerTitleStyle: { color: '#0F172A', fontWeight: '700' }
                    }}
                />
            </Stack>
        </TamaguiProvider>
    )
}
