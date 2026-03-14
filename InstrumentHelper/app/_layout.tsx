import { TamaguiProvider } from 'tamagui'
import { config } from '../tamagui.config'
import { Slot } from 'expo-router'

export default function RootLayout() {
    return (
        <TamaguiProvider config={config} defaultTheme="light">
            <Slot />
        </TamaguiProvider>
    )
}
