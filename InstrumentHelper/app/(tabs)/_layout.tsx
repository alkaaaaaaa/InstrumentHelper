import { Tabs } from 'expo-router'

export default function TabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{ title: 'Home' }}
            />
            <Tabs.Screen
                name="score"
                options={{ title: 'Score' }}
            />
            <Tabs.Screen
                name="learn"
                options={{ title: 'Learn' }}
            />
        </Tabs>
    )
}
