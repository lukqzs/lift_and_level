
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";

import { addWorkout, fetchWorkouts, login, register, searchExercises } from "./services/api";

enableScreens();

const Tab = createBottomTabNavigator();

// --- Auth Screen ---
function LoginScreen({ onAuth, busy }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password || (mode === "register" && !name)) {
      setError("Vyplňte jméno (pro registraci), e-mail i heslo.");
      return;
    }
    try {
      await onAuth({ mode, name: name.trim(), email: email.trim(), password });
    } catch (e) {
      setError(e.message || "Přihlášení se nezdařilo.");
    }
  };

  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>
        {mode === "login" ? "LiftAndLevel Přihlášení" : "Registrace"}
      </Text>
      {mode === "register" && (
        <TextInput
          placeholder="Jméno"
          style={styles.input}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        placeholder="E-mail"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Heslo"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {mode === "login" ? "Přihlásit" : "Registrovat"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setMode(mode === "login" ? "register" : "login")}
        disabled={busy}
      >
        <Text style={styles.linkButtonText}>
          {mode === "login" ? "Nemáš účet? Registruj se" : "Máš účet? Přihlas se"}
        </Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}


function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return <Text style={styles.timerData}>{fmt(elapsed)}</Text>;
}

function ExercisePicker({ visible, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      setLoading(true);
      const res = await searchExercises(query);
      setList(res || []);
      setLoading(false);
    };
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [query, visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Vyber cvik</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Zavřít</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Hledat cvik..."
          value={query}
          onChangeText={setQuery}
          autoFocus={true}
        />
        {loading && <ActivityIndicator />}
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.pickerItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// --- Screens ---

function HomeScreen({ user, onLogout }) {
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>🏋️ Vítej, {user.name}!</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Level</Text>
          <Text style={styles.statValue}>{user.level}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>XP</Text>
          <Text style={styles.statValue}>{user.xp}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Rank</Text>
          <Text style={styles.statValue}>{user.rank}</Text>
        </View>
      </View>
      <Button title="Odhlásit se" onPress={onLogout} color="#c1121f" />
    </View>
  );
}

function WorkoutScreen({ workouts = [], onFinishWorkout }) {

  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [sessionItems, setSessionItems] = useState([]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  const startWorkout = () => {
    setStartTime(Date.now());
    setSessionItems([]);
    setIsActive(true);
  };

  const endWorkout = () => {
    if (sessionItems.length === 0) {
      Alert.alert("Prázdný trénink", "Přidej aspoň jeden cvik, nebo zruš trénink.");
      return;
    }
    Alert.alert(
      "Ukončit trénink",
      "Opravdu chceš ukončit a uložit tento trénink?",
      [
        { text: "Zrušit", style: "cancel" },
        {
          text: "Uložit",
          onPress: () => {
            const durationSec = Math.floor((Date.now() - startTime) / 1000);
            onFinishWorkout({
              date: new Date().toISOString().slice(0, 10),
              duration: durationSec,
              items: sessionItems
            });
            setIsActive(false);
            setStartTime(null);
            setSessionItems([]);
          }
        }
      ]
    );
  };

  const cancelWorkout = () => {
    Alert.alert("Zrušit trénink", "Všechna data budou ztracena.", [
      { text: "Ne", style: "cancel" },
      {
        text: "Ano, zrušit", style: "destructive", onPress: () => {
          setIsActive(false);
          setSessionItems([]);
        }
      }
    ]);
  };

  const addSet = () => {
    if (!currentExercise || !sets || !reps) return;
    const newItem = {
      id: Date.now(), // temp id
      name: currentExercise.name,
      sets: Number(sets),
      reps: Number(reps),
      weight: Number(weight) || 0
    };
    setSessionItems(prev => [newItem, ...prev]);
    // Reset inputs but keep exercise selected for convenient multi-set entry? 
    // Usually people do same exercise. Let's keep exercise but clear stats? 
    // Or clear all. Let's clear stats.
    setSets("");
    setReps("");
    // setWeight(""); // Keep weight, might be same
  };

  if (isActive) {
    return (
      <View style={styles.container}>
        {/* Timer Header */}
        <View style={styles.activeHeader}>
          <View>
            <Text style={styles.activeLabel}>Čas tréninku</Text>
            <Timer startTime={startTime} />
          </View>
          <Button title="Ukončit" color="#d32f2f" onPress={endWorkout} />
        </View>

        <ScrollView style={styles.sessionScroll} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Add Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nový záznam</Text>

            {currentExercise ? (
              <View style={styles.selectedExRow}>
                <Text style={styles.selectedExText}>{currentExercise.name}</Text>
                <TouchableOpacity onPress={() => setCurrentExercise(null)}>
                  <Text style={{ color: "red" }}>Změnit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={styles.selectBtnText}>🔍 Vybrat cvik</Text>
              </TouchableOpacity>
            )}

            <View style={styles.row}>
              <TextInput
                placeholder="Série"
                keyboardType="numeric"
                style={styles.inputSmall}
                value={sets} onChangeText={setSets}
              />
              <TextInput
                placeholder="Opak."
                keyboardType="numeric"
                style={styles.inputSmall}
                value={reps} onChangeText={setReps}
              />
              <TextInput
                placeholder="Váha (kg)"
                keyboardType="numeric"
                style={styles.inputSmall}
                value={weight} onChangeText={setWeight}
              />
            </View>

            <Button title="Přidat sérii" onPress={addSet} disabled={!currentExercise || !sets || !reps} />
          </View>

          {/* List */}
          <Text style={styles.subtitle}>Právě odcvičeno ({sessionItems.length})</Text>
          {sessionItems.map((item) => (
            <View key={item.id} style={styles.miniCard}>
              <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
              <Text>{item.sets} x {item.reps} @ {item.weight}kg</Text>
            </View>
          ))}
        </ScrollView>

        <ExercisePicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelect={setCurrentExercise}
        />
      </View>
    );
  }

  // IDLE MODE -> History & Start
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Váš Trénink</Text>
      <TouchableOpacity style={styles.bigStartBtn} onPress={startWorkout}>
        <Text style={styles.bigStartBtnText}>ZAČÍT TRÉNINK</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Historie tréninků</Text>
      <FlatList
        data={workouts}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{item.date}</Text>
              <Text style={styles.historyXp}>+{item.xp || 0} XP</Text>
            </View>
            <Text style={styles.historySubtitle}>
              {Math.floor((item.duration || 0) / 60)} min {(item.duration || 0) % 60} s
            </Text>
            {item.items && item.items.map(ex => (
              <View key={ex.id} style={{ marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#eee' }}>
                <Text style={{ fontWeight: '600' }}>{ex.name}</Text>
                <Text style={{ color: '#666', fontSize: 13 }}>{ex.sets} x {ex.reps} @ {ex.weight}kg</Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}


// --- Additional Screens ---

function ProgressScreen() {
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>📈 Progress</Text>
      <Text>Fotky, graf váhy a vývoj postavy (Coming Soon)</Text>
    </View>
  );
}

function AchievementsScreen() {
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>🏆 Ocenění</Text>
      <Text>Osobní rekordy a výzvy (Coming Soon)</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>👤 Profil</Text>
      <Text>Cíle, doplňky a nastavení</Text>
    </View>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const list = await fetchWorkouts(user.id, user.token);
      setWorkouts(list || []);
    };
    load();
  }, [user]);

  const handleAuth = async (creds) => {
    setAuthBusy(true);
    try {
      const u = creds.mode === "register"
        ? await register(creds.name, creds.email, creds.password)
        : await login(creds.email, creds.password);
      setUser(u);
      setAuthBusy(false);
      return u;
    } catch (e) {
      setAuthBusy(false);
      throw e; // Propagate to LoginScreen to show error
    }
  };

  const handleFinishWorkout = async (payload) => {
    if (!user) return;
    // Optimistic UI update or wait? Let's wait.
    const res = await addWorkout(user.id, payload, user.token);
    if (res) {
      // Reload history
      const list = await fetchWorkouts(user.id, user.token);
      setWorkouts(list || []);
      // Update User XP locally (rough estimate or fetch user again)
      setUser(u => ({ ...u, xp: (u.xp || 0) + (res.xp || 0) }));
    }
  };

  if (!user) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LoginScreen onAuth={handleAuth} busy={authBusy} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ tabBarActiveTintColor: "#2d6cdf" }}>
            <Tab.Screen name="Domů">
              {() => <HomeScreen user={user} onLogout={() => setUser(null)} />}
            </Tab.Screen>
            <Tab.Screen name="Nový Trénink">
              {() => (
                <WorkoutScreen
                  workouts={workouts}
                  onFinishWorkout={handleFinishWorkout}
                />
              )}
            </Tab.Screen>
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
  container: { flex: 1, padding: 16, backgroundColor: '#f2f2f7' },
  containerCenter: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#333' },
  subtitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 10, color: '#555' },

  // Auth
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, fontSize: 16 },
  primaryButton: { backgroundColor: '#2d6cdf', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkButtonText: { color: '#2d6cdf', fontSize: 16 },
  error: { color: 'red', marginBottom: 10 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, marginHorizontal: 5, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  statLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2d6cdf' },

  // Workout
  bigStartBtn: { backgroundColor: '#2d6cdf', padding: 40, borderRadius: 20, alignItems: 'center', marginVertical: 20, shadowColor: '#2d6cdf', shadowOpacity: 0.3, shadowRadius: 10 },
  bigStartBtnText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },

  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  activeLabel: { fontSize: 14, color: '#888' },
  timerData: { fontSize: 32, fontVariant: ['tabular-nums'], fontWeight: 'bold' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  selectBtn: { backgroundColor: '#f0f0f5', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  selectBtnText: { color: '#2d6cdf', fontSize: 16, fontWeight: '600' },
  selectedExRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: '#eef', borderRadius: 8 },
  selectedExText: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  inputSmall: { flex: 1, backgroundColor: '#f9f9fc', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginHorizontal: 4, textAlign: 'center' },

  miniCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#2d6cdf' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeText: { color: '#2d6cdf', fontSize: 17 },
  pickerItem: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerItemText: { fontSize: 16 },

  // History List
  historyCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyDate: { color: '#888', fontSize: 14 },
  historyXp: { color: '#2d6cdf', fontWeight: 'bold' },
  historySubtitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 }
});
