import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import FlashcardsScreen from './screens/FlashcardsScreen';
import QuizScreen from './screens/QuizScreen';
import ConceptsScreen from './screens/ConceptsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Login' screenOptions={{ headerShown: false }}>
        <Stack.Screen name='Login' component={LoginScreen}/>
        <Stack.Screen name='Dashboard' component={DashboardScreen}/>
        <Stack.Screen name='Flashcards' component={FlashcardsScreen}/>
        <Stack.Screen name='Quiz' component={QuizScreen}/>
        <Stack.Screen name='Concepts' component={ConceptsScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
