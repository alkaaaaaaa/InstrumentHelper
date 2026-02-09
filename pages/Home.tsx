import { View, Button} from 'tamagui'
import { Text } from 'react-native';
import { StyleSheet} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../App';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>

export default function Home({navigation}: Props){
    return(
        <View style={styles.container}>
            <Button onPress={() => navigation.navigate('Score')}>谱子</Button>
            <Button onPress={() => navigation.navigate('Learn')}>学习</Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        gap: 10
    }
});