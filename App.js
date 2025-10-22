import React from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { StatusBar } from "expo-status-bar";

import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";

enableScreens();

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏋️ Domů</Text>
      <Text>XP: 1200 | Level: 5 | Rank: Silver</Text>
      <Button title="Zobrazit tréninky" onPress={() => {}} />
      <StatusBar style="auto" />
    </View>
  );
}

function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Workout</Text>
      <Text>Zde se bude zapisovat cvičení</Text>
    </View>
  );
}

function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Progress</Text>
      <Text>Fotky, graf váhy a vývoj postavy</Text>
    </View>
  );
}

function AchievementsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Ocenění</Text>
      <Text>Osobní rekordy a výzvy</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profil</Text>
      <Text>Cíle, doplňky a nastavení</Text>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator>
            <Tab.Screen name="Domů" component={HomeScreen} />
            <Tab.Screen name="Workout" component={WorkoutScreen} />
            <Tab.Screen name="Progress" component={ProgressScreen} />
            <Tab.Screen name="Ocenění" component={AchievementsScreen} />
            <Tab.Screen name="Profil" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
});
