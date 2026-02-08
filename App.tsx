import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text} from 'react-native';
import { Button, TamaguiProvider, View } from 'tamagui'
import { config } from './tamagui.config'
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './pages/Home';
import ScoreScreen from './pages/Score';
import LearnScreen from './pages/Learn';

export type RootTabParamList = {
    Home: undefined
    Score: undefined
    Learn: undefined
}

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
        <NavigationContainer>
          <Tab.Navigator initialRouteName="Home">
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Score" component={ScoreScreen} />
            <Tab.Screen name="Learn" component={LearnScreen} />
          </Tab.Navigator>
        </NavigationContainer>
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({

});
