import { KeyboardAvoidingView, Platform, useColorScheme as _useColorScheme } from "react-native";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from "react-native";
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
  Alert,
  Keyboard,
  Image,
  Dimensions
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

export const ThemeContext = React.createContext({ theme: 'dark', toggleTheme: () => { } });
export const useColorScheme = () => React.useContext(ThemeContext).theme;
export const useThemeActions = () => React.useContext(ThemeContext);
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";

import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LineChart } from "react-native-chart-kit";
import Body from "react-native-body-highlighter";

import { addWorkout, fetchWorkouts, login, register, authGoogle, searchExercises, fetchRandomQuote, addXp } from "./services/api";

GoogleSignin.configure({
  webClientId: '380610611330-pi56opsa4eoau8eimput3g888v1akvqo.apps.googleusercontent.com',
});

enableScreens();

const Tab = createBottomTabNavigator();

// --- OBRAZOVKA PŘIHLÁŠENÍ ---
// Zde probíhá přihlašování, registrace a ověření přes Google
function LoginScreen({ onAuth, busy }) {
  const theme = useColorScheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => getStyles(theme, width), [theme, width]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      let idToken = signInResult.idToken || signInResult.data?.idToken;
      if (!idToken) throw new Error('No ID token found');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      await onAuth({ mode: 'google', idToken: idToken, user: userCredential.user });
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba přihlášení přes Google', error.message);
    }
  };

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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.containerCenter}>
        <View style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }}>
          <ThemeToggleButton />
        </View>
        <Text style={styles.title}>
          {mode === "login" ? "LiftAndLevel Přihlášení" : "Registrace"}
        </Text>
        {mode === "register" && (
          <TextInput
            placeholder="Jméno"
            placeholderTextColor={styles.subText.color}
            style={styles.input}
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          placeholder="E-mail"
          placeholderTextColor={styles.subText.color}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Heslo"
          placeholderTextColor={styles.subText.color}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
          <Text style={{ marginHorizontal: 10, color: '#888' }}>nebo</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: '#DB4437', marginTop: 0 }]}
          onPress={handleGoogleLogin}
          disabled={busy}
        >
          <Text style={styles.primaryButtonText}>Přihlásit se přes Google</Text>
        </TouchableOpacity>

        <StatusBar style="auto" />
      </View>
    </KeyboardAvoidingView>
  );
}


function Timer({ startTime }) {
  const theme = useColorScheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => getStyles(theme, width), [theme, width]);

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
  const theme = useColorScheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => getStyles(theme, width), [theme, width]);

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

// --- HLAVNÍ OBRAZOVKY APLIKACE ---

// --- DOMOVSKÁ OBRAZOVKA ---
// Zobrazuje úroveň uživatele, XP bar a denní/týdenní výzvy
function HomeScreen({ user, workouts, onLogout, onUpdateUser }) {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [rankModalVisible, setRankModalVisible] = useState(false);

  let nextRankObj = null;
  for (let i = 0; i < LEVEL_RANKS.length; i++) {
    if (user.level >= LEVEL_RANKS[i].min) {
      nextRankObj = LEVEL_RANKS[i + 1] || null;
    }
  }
  const missingLevelsText = nextRankObj ? `Na rank ${nextRankObj.name} chybí ${nextRankObj.min - user.level} levelů` : "Dosáhl jsi maximálního ranku!";

  const [motivationalQuote, setMotivationalQuote] = useState("Načítám motivaci...");
  const [claimedChallenges, setClaimedChallenges] = useState({ daily: null, weekly: null });
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchRandomQuote()
      .then(data => {
        if (data && data.quote) {
          setMotivationalQuote(`${data.quote}\n— ${data.author}`);
        } else {
          setMotivationalQuote("Zvedni víc než včera!");
        }
      })
      .catch(() => setMotivationalQuote("Zvedni víc než včera!"));

    AsyncStorage.getItem('@claimed_challenges').then(res => {
      if (res) setClaimedChallenges(JSON.parse(res));
    });
  }, []);

  const getLevelProgress = (xp, level) => {
    const currentLevelBaseXp = 50 * Math.pow(level - 1, 2);
    const nextLevelBaseXp = 50 * Math.pow(level, 2);
    const neededForNext = nextLevelBaseXp - currentLevelBaseXp;
    const currentProgress = xp - currentLevelBaseXp;
    const percent = Math.min(100, Math.max(0, (currentProgress / neededForNext) * 100));

    return {
      percent,
      current: Math.floor(currentProgress),
      total: Math.floor(neededForNext),
      nextLevelXp: nextLevelBaseXp
    };
  };

  const progress = getLevelProgress(user.xp, user.level);

  // Challenges Logic
  // Challenges Logic
  const todayDate = getLocalDate();

  const dailyVolume = (workouts || []).filter(w => w.date === todayDate).reduce((acc, w) => {
    const vol = (w.items || []).reduce((sum, item) => sum + (item.sets * item.reps * item.weight), 0);
    return acc + vol;
  }, 0);

  const isDailyComplete = dailyVolume >= 1000;
  const isDailyClaimed = claimedChallenges.daily === todayDate;

  const getWeekId = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  };
  const weekId = getWeekId();

  const currentWeekWorkouts = (workouts || []).filter(w => {
    const wd = new Date(w.date);
    const diff = (new Date() - wd) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  const isWeeklyComplete = currentWeekWorkouts >= 3;
  const isWeeklyClaimed = claimedChallenges.weekly === weekId;

  const claimChallenge = async (type, xp) => {
    if (claiming) return;
    setClaiming(true);
    try {
      const newStats = await addXp(user.id, xp, user.token);
      onUpdateUser(newStats);

      const newClaimed = { ...claimedChallenges };
      if (type === 'daily') newClaimed.daily = todayDate;
      if (type === 'weekly') newClaimed.weekly = weekId;

      setClaimedChallenges(newClaimed);
      await AsyncStorage.setItem('@claimed_challenges', JSON.stringify(newClaimed));
      Alert.alert("Úspěch", `Gratulujeme! Získal(a) jsi ${xp} XP.`);
    } catch (e) {
      Alert.alert("Chyba", "Nepodařilo se připsat XP.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Modal visible={rankModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>Tabulka Ranků</Text>
              <TouchableOpacity onPress={() => setRankModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LEVEL_RANKS.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                  <Ionicons name={r.icon} size={28} color={r.color} style={{ marginRight: 15, width: 30, textAlign: 'center' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: r.color }}>{r.name}</Text>
                    <Text style={{ fontSize: 14, color: '#64748b' }}>
                      {r.max === 999 ? `Level ${r.min}+` : `Level ${r.min} - ${r.max}`}
                    </Text>
                  </View>
                  {user.level >= r.min && user.level <= r.max && (
                    <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Ty</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.greeting}>Vítej zpět,</Text>
        <Text style={styles.userName}>{user.name}</Text>
      </View>

      <View style={styles.levelCard}>
        <View style={styles.levelRow}>
          <View>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelValue}>{user.level}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.rankLabel}>RANK</Text>
            <TouchableOpacity onPress={() => setRankModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={[styles.rankValue, { marginRight: 8 }]}>{user.rank}</Text>
              <Ionicons name="information-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ textAlign: 'right', color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8, marginBottom: 12, fontStyle: 'italic' }}>
          {missingLevelsText}
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress.percent}%` }]} />
        </View>
        <View style={styles.progressTextRow}>
          <Text style={styles.xpText}>{Math.floor(user.xp)} XP</Text>
          <Text style={styles.xpText}>{progress.nextLevelXp} XP</Text>
        </View>
        <Text style={styles.xpDetail}>
          Chybí {progress.total - progress.current} XP do levelu {user.level + 1}
        </Text>
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteLabel}>Výzvy na aktuální období</Text>

        {/* Daily */}
        <View style={{ marginTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: styles.text.color }}><Ionicons name="calendar-outline" size={18} color="#3b82f6" /> Denní výzva: Objemový král</Text>
          <Text style={{ color: styles.subText.color, marginBottom: 5 }}>Zvedni dnes celkem 1000 kg</Text>
          <Text style={{ color: isDailyComplete ? 'green' : '#ff9800', fontWeight: 'bold' }}>Stav: {dailyVolume} / 1000 kg</Text>

          {isDailyComplete && !isDailyClaimed && (
            <TouchableOpacity onPress={() => claimChallenge('daily', 100)} style={{ backgroundColor: '#2d6cdf', padding: 8, borderRadius: 8, marginTop: 5, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Získat 100 XP</Text>
            </TouchableOpacity>
          )}
          {isDailyClaimed && <Text style={{ color: 'green', fontWeight: 'bold', marginTop: 5 }}><Ionicons name="checkmark-circle" size={16} color="green" /> Vybráno</Text>}
        </View>

        {/* Weekly */}
        <View style={{ marginTop: 10, paddingBottom: 15, alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: styles.text.color }}><Ionicons name="flame" size={18} color="#3b82f6" /> Týdenní výzva: Železná disciplína</Text>
          <Text style={{ color: styles.subText.color, marginBottom: 5 }}>Odcvič 3 tréninky za posledních 7 dní</Text>
          <Text style={{ color: isWeeklyComplete ? 'green' : '#ff9800', fontWeight: 'bold' }}>Stav: {currentWeekWorkouts} / 3 tréninky</Text>

          {isWeeklyComplete && !isWeeklyClaimed && (
            <TouchableOpacity onPress={() => claimChallenge('weekly', 500)} style={{ backgroundColor: '#2d6cdf', padding: 8, borderRadius: 8, marginTop: 5, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Získat 500 XP</Text>
            </TouchableOpacity>
          )}
          {isWeeklyClaimed && <Text style={{ color: 'green', fontWeight: 'bold', marginTop: 5 }}><Ionicons name="checkmark-circle" size={16} color="green" /> Vybráno</Text>}
        </View>
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteLabel}>Motivace pro dnešek</Text>
        <Text style={styles.motivationalQuote}>"{motivationalQuote}"</Text>
      </View>

      <View style={{ height: 30 }} />
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Odhlásit se</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// --- OBRAZOVKA TRÉNINKU ---
// Umožňuje uživateli zadávat odcvičené série, opáčka a váhy
function WorkoutScreen({ workouts = [], onFinishWorkout }) {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [sessionItems, setSessionItems] = useState([]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
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
              date: getLocalDate(),
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
    if (!currentExercise) {
      Alert.alert("Chyba", "Nejdřív nahoře vyber cvik přes tlačítko 'Vybrat cvik'.");
      return;
    }
    if (!reps || reps.trim() === "") {
      Alert.alert("Chyba", "Musíš vyplnit počet opakování!");
      return;
    }
    const newItem = {
      id: Date.now() + Math.random(),
      name: currentExercise.name,
      sets: 1,
      reps: Number(reps),
      weight: Number(weight) || 0
    };
    setSessionItems(prev => [...prev, newItem]);
  };

  if (isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.activeHeader}>
          <View>
            <Text style={styles.activeLabel}>Čas tréninku</Text>
            <Timer startTime={startTime} />
          </View>
          <Button title="Ukončit" color="#d32f2f" onPress={endWorkout} />
        </View>

        <ScrollView style={styles.sessionScroll} contentContainerStyle={{ paddingBottom: 100 }}>
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
                <Text style={styles.selectBtnText}><Ionicons name="search" size={16} color="#fff" /> Vybrat cvik</Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
              <TextInput
                placeholder="Opakování"
                placeholderTextColor={styles.subText.color}
                keyboardType="numeric"
                style={[styles.inputSmall, { flex: 1, marginRight: 10 }]}
                value={reps} onChangeText={setReps}
              />
              <TextInput
                placeholder="Váha (kg)"
                placeholderTextColor={styles.subText.color}
                keyboardType="numeric"
                style={[styles.inputSmall, { flex: 1, marginRight: 10 }]}
                value={weight} onChangeText={setWeight}
              />
              <TouchableOpacity onPress={addSet} style={{ backgroundColor: '#2d6cdf', padding: 12, borderRadius: 8, width: 50, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: styles.subText.color, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>Vyplň hodnoty a pro každou sérii klikni na +</Text>
          </View>

          <Text style={styles.subtitle}>Právě odcvičeno ({sessionItems.length} sérií)</Text>
          {sessionItems.map((item) => (
            <View key={item.id} style={styles.miniCard}>
              <Text style={{ fontWeight: 'bold', color: styles.text.color }}>{item.name}</Text>
              <Text style={{ color: styles.subText.color }}>{item.sets} x {item.reps} @ {item.weight}kg</Text>
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
              <View key={ex.id || Math.random()} style={{ marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#eee' }}>
                <Text style={{ fontWeight: '600', color: styles.text.color }}>{ex.name}</Text>
                <Text style={{ color: styles.subText.color }}>{ex.sets}x {ex.reps} @ {ex.weight}kg</Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

// --- KALENDÁŘ A POSTUP ---
// Zobrazuje historii cvičení v kalendáři podle intenzity
function ProgressScreen({ workouts }) {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [exercisesData, setExercisesData] = useState([]);

  useEffect(() => {
    searchExercises("").then(setExercisesData);
  }, []);

  const getMuscleData = () => {
    const slugCounts = {};
    const now = new Date();

    workouts.forEach(w => {
      const wDate = new Date(w.date);
      const diff = (now - wDate) / (1000 * 60 * 60 * 24);
      if (diff <= 7) {
        (w.items || []).forEach(ex => {
          let sets = Number(ex.sets) || 0;
          const found = exercisesData.find(e => {
            if (!e || !e.name || !ex || !ex.name) return false;
            return e.name.toLowerCase() === ex.name.toLowerCase();
          });
          if (found && found.muscles) {
            found.muscles.forEach(slug => {
              slugCounts[slug] = (slugCounts[slug] || 0) + sets;
            });
          }
        });
      }
    });

    return Object.entries(slugCounts).map(([slug, count]) => {
      let intensity = 1;
      if (count > 0) intensity = 1; // Light
      if (count >= 5) intensity = 2; // Medium
      if (count >= 10) intensity = 3; // Heavy
      return { slug, intensity };
    });
  };

  const bodyData = getMuscleData();
  const colors = ['#ffcdd2', '#ef5350', '#c62828'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: styles.container.backgroundColor }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.title, { textAlign: 'center' }]}><Ionicons name="barbell" size={32} color="#3b82f6" /> Vývoj postavy</Text>
      <Text style={{ textAlign: 'center', marginBottom: 20, color: styles.subText.color }}>
        Svalové partie se vybarvují podle intenzity tréninků (počet sérií) za posledních 7 dní.
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', flexWrap: 'wrap', marginTop: 10 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 15, color: styles.text.color }}>Zepředu</Text>
          <Body data={bodyData} side="front" scale={1.2} gender="male" colors={colors} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 15, color: styles.text.color }}>Zezadu</Text>
          <Body data={bodyData} side="back" scale={1.2} gender="male" colors={colors} />
        </View>
      </View>

      <View style={styles.legendBox}>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#e0e0e0' }]} /><Text style={styles.text}>Netrénováno</Text></View>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#ffcdd2' }]} /><Text style={styles.text}>Lehký tr. (1-4 série)</Text></View>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#ef5350' }]} /><Text style={styles.text}>Střední tr. (5-9 s.)</Text></View>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#c62828' }]} /><Text style={styles.text}>Těžký tr. (10+ s.)</Text></View>
      </View>
    </ScrollView>
  );
}

const PR_RANKS = [
  { name: "Nováček", color: "#94a3b8", icon: "medal-outline" },
  { name: "Bronz", color: "#cd7f32", icon: "medal" },
  { name: "Stříbro", color: "#c0c0c0", icon: "medal" },
  { name: "Zlato", color: "#f59e0b", icon: "medal" },
  { name: "Platina", color: "#94a3b8", icon: "ribbon" },
  { name: "Diamant", color: "#06b6d4", icon: "diamond" },
  { name: "Šampion", color: "#ef4444", icon: "trophy" }
];

function getExerciseRankData(weight, type) {
  let limits = [];
  if (type === 'bench') limits = [0, 40, 60, 80, 100, 120, 140];
  if (type === 'squat') limits = [0, 60, 80, 100, 120, 150, 180];
  if (type === 'deadlift') limits = [0, 80, 100, 120, 150, 180, 220];

  let currentRankIndex = 0;
  for (let i = 0; i < limits.length; i++) {
    if (weight >= limits[i]) {
      currentRankIndex = i;
    }
  }

  const currentRank = PR_RANKS[currentRankIndex];
  const nextLimit = limits[currentRankIndex + 1] || null;
  const nextRank = nextLimit ? PR_RANKS[currentRankIndex + 1] : null;

  return { currentRank, nextLimit, nextRank };
}

const LEVEL_RANKS = [
  { name: "STICKMAN", min: 1, max: 4, icon: "body", color: "#94a3b8" },
  { name: "GYM ENJOYER", min: 5, max: 9, icon: "barbell", color: "#3b82f6" },
  { name: "GYM BRO", min: 10, max: 19, icon: "flash", color: "#10b981" },
  { name: "PR HUNTER", min: 20, max: 29, icon: "flame", color: "#8b5cf6" },
  { name: "GYM RAT", min: 30, max: 49, icon: "trophy", color: "#f59e0b" },
  { name: "GYM REAPER", min: 50, max: 999, icon: "diamond", color: "#ef4444" }
];

const WORKOUT_MILESTONES = [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500];
const BENCH_MILESTONES = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
const SQUAT_MILESTONES = [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300];
const DEADLIFT_MILESTONES = [80, 100, 120, 140, 160, 180, 200, 220, 250, 280, 300, 320, 350];

// --- OBRAZOVKA OCENĚNÍ A VÝZEV (PR) ---
// Ukazuje dosažené levely, pravidelnost a osobní rekordy, které uživatelé odemykají plněním cílů.
function AchievementsScreen({ workouts, user, onUpdateUser }) {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [claimedRewards, setClaimedRewards] = useState({
    workout_tier: 0,
    bench_tier: 0,
    squat_tier: 0,
    deadlift_tier: 0
  });
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@claimed_rewards_v2').then(res => {
      if (res) {
        setClaimedRewards(JSON.parse(res));
      }
    });
  }, []);

  const claimTier = async (category, xpAmount) => {
    if (claiming) return;
    setClaiming(true);
    try {
      const newStats = await addXp(user.id, xpAmount, user.token);
      onUpdateUser(newStats);

      const currentTier = claimedRewards[category] || 0;
      const newClaimed = { ...claimedRewards, [category]: currentTier + 1 };
      setClaimedRewards(newClaimed);
      await AsyncStorage.setItem('@claimed_rewards_v2', JSON.stringify(newClaimed));
      Alert.alert("Úspěch", `Gratulujeme! Získal(a) jsi ${xpAmount} XP.`);
    } catch (e) {
      Alert.alert("Chyba", "Nepodařilo se připsat XP.");
    } finally {
      setClaiming(false);
    }
  };

  const renderDynamicReward = (category, milestones, currentValue, titlePrefix) => {
    const currentTier = claimedRewards[category] || 0;

    if (currentTier >= milestones.length) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 16, flex: 1, paddingRight: 10, color: styles.text.color }}><Ionicons name="checkmark-circle" size={16} color="green" /> {titlePrefix} - VŠE SPLNĚNO!</Text>
          <Text style={{ color: '#2d6cdf', fontWeight: 'bold' }}>MAX Level</Text>
        </View>
      );
    }

    const target = milestones[currentTier];
    const isUnlocked = currentValue >= target;
    const xp = category === 'workout_tier' ? target * 20 : target * 3;
    const title = category === 'workout_tier'
      ? `Pravidelnost (${target} tréninků)`
      : `${titlePrefix} (${target} kg)`;

    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, flex: 1, paddingRight: 10, color: styles.text.color }}>
          {isUnlocked ? "✅" : "❌"} {title}
        </Text>
        {isUnlocked && (
          <TouchableOpacity onPress={() => claimTier(category, xp)} style={{ backgroundColor: '#ff9800', padding: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Získat {xp} XP</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPRRow = (title, weight, type) => {
    const data = getExerciseRankData(weight, type);
    return (
      <View style={{ marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <View style={styles.row}>
          <Text style={{ fontSize: 16, flex: 1, fontWeight: 'bold', color: styles.text.color }}>{title}</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: styles.text.color }}>{weight > 0 ? `${weight} kg` : '-- kg'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <Ionicons name={data.currentRank.icon} size={20} color={data.currentRank.color} style={{ marginRight: 5 }} />
          <Text style={{ fontWeight: 'bold', color: data.currentRank.color }}>{data.currentRank.name}</Text>
        </View>
        {data.nextLimit && (
          <Text style={{ fontSize: 12, color: styles.subText.color, marginTop: 4 }}>
            Na rank <Text style={{ color: data.nextRank.color, fontWeight: 'bold' }}>{data.nextRank.name}</Text> ti chybí {data.nextLimit - weight} kg.
          </Text>
        )}
      </View>
    );
  };

  const prs = useMemo(() => {
    let bench = 0, squat = 0, deadlift = 0;
    (workouts || []).forEach(w => {
      (w.items || []).forEach(ex => {
        const name = ex.name.toLowerCase();
        const weight = Number(ex.weight) || 0;
        if (name.includes('bench')) bench = Math.max(bench, weight);
        if (name.includes('dřep') || name.includes('squat')) squat = Math.max(squat, weight);
        if (name.includes('mrtvý tah') || name.includes('deadlift')) deadlift = Math.max(deadlift, weight);
      });
    });
    return { bench, squat, deadlift };
  }, [workouts]);

  const workoutCount = workouts?.length || 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}><Ionicons name="trophy" size={32} color="#3b82f6" /> Ocenění a Výzvy</Text>

      <Text style={styles.subtitle}>Osobní rekordy (PRs)</Text>
      <View style={styles.card}>
        {renderPRRow("Bench Press", prs.bench, "bench")}
        {renderPRRow("Dřep", prs.squat, "squat")}
        {renderPRRow("Mrtvý tah", prs.deadlift, "deadlift")}
      </View>

      <Text style={styles.subtitle}>Odměny za pravidelnost (XP)</Text>
      <View style={styles.card}>
        {renderDynamicReward('workout_tier', WORKOUT_MILESTONES, workoutCount, "Pravidelnost")}
      </View>

      <Text style={styles.subtitle}>PR Výzvy (XP)</Text>
      <View style={styles.card}>
        {renderDynamicReward('bench_tier', BENCH_MILESTONES, prs.bench, "Bench PR")}
        {renderDynamicReward('squat_tier', SQUAT_MILESTONES, prs.squat, "Squat PR")}
        {renderDynamicReward('deadlift_tier', DEADLIFT_MILESTONES, prs.deadlift, "Deadlift PR")}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function GalleryScreen() {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [photos, setPhotos] = useState([]);
  const [category, setCategory] = useState("Vše");
  const categories = ["Vše", "Záda/Prsa", "Ruce", "Nohy", "Břicho", "Celé tělo"];

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const stored = await AsyncStorage.getItem('@progress_photos');
        if (stored) {
          setPhotos(JSON.parse(stored));
        }
      } catch (e) {
        console.log("Failed to load photos", e);
      }
    };
    loadPhotos();
  }, []);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Oprávnění", "Přístup k fotografiím je vyžadován.");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const fileExt = uri.split('.').pop();
        const fileName = `progress_${Date.now()}.${fileExt || 'jpg'}`;
        const newPath = FileSystem.documentDirectory + fileName;

        await FileSystem.copyAsync({
          from: uri,
          to: newPath
        });

        const newPhoto = {
          id: Date.now().toString(),
          uri: newPath,
          date: new Date().toLocaleDateString('cs-CZ'),
          category: category === "Vše" ? "Celé tělo" : category
        };
        const updatedPhotos = [newPhoto, ...photos];
        setPhotos(updatedPhotos);
        await AsyncStorage.setItem('@progress_photos', JSON.stringify(updatedPhotos));
      }
    } catch (e) {
      Alert.alert("Nepodařilo se nahrát fotku", "Chyba: " + e.message);
    }
  };

  const deletePhoto = async (id) => {
    Alert.alert("Smazat", "Opravdu chceš smazat tuto fotku?", [
      { text: "Ne", style: "cancel" },
      {
        text: "Ano", style: "destructive", onPress: async () => {
          const updatedPhotos = photos.filter(p => p.id !== id);
          setPhotos(updatedPhotos);
          await AsyncStorage.setItem('@progress_photos', JSON.stringify(updatedPhotos));
        }
      }
    ]);
  };

  const displayedPhotos = category === "Vše" ? photos : photos.filter(p => p.category === category);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 Galerie pokroku</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 15 }}>
        {categories.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.goalTypeBtn, category === c && styles.goalTypeBtnActive, { margin: 4 }]}
          >
            <Text style={[styles.goalTypeBtnText, category === c && { color: '#fff' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
        <Text style={styles.primaryButtonText}>+ Nahrát pro "{category === 'Vše' ? 'Celé tělo' : category}"</Text>
      </TouchableOpacity>

      <FlatList
        data={displayedPhotos}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ marginTop: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={{ flex: 1, margin: 5, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', padding: 8, alignItems: 'center' }}>
            <Image source={{ uri: item.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 8 }} resizeMode="cover" />
            <Text style={{ marginTop: 8, fontWeight: 'bold', color: styles.text.color }}>{item.date}</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.category || "Celé tělo"}</Text>
            <TouchableOpacity onPress={() => deletePhoto(item.id)} style={{ paddingVertical: 4 }}>
              <Text style={{ color: 'red' }}>Smazat</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>Tady zatím žádné fotky nejsou.</Text>}
      />
    </View>
  );
}

// --- OBRAZOVKA PROFILU (Sjednocené Cíle, Váha a Galerie) ---
function ProfileScreen() {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Cíle state
  const [goalType, setGoalType] = useState('Síla');
  const [goalText, setGoalText] = useState('');
  const [saved, setSaved] = useState(false);
  const [goals, setGoals] = useState([]);
  const [activeSupps, setActiveSupps] = useState([]);

  // Váha state
  const [weights, setWeights] = useState([]);
  const [newWeight, setNewWeight] = useState("");

  // Galerie state
  const [photos, setPhotos] = useState([]);
  const [galleryCategory, setGalleryCategory] = useState('Vše');
  const galleryCategories = ["Vše", "Prsa", "Záda", "Ruce", "Nohy", "Břicho", "Celé tělo"];
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const SUPPLEMENTS_DB = [
    { id: 'creatine', name: 'Kreatin', boost: 5, icon: 'flash' },
    { id: 'preworkout', name: 'Pre-workout', boost: 3, icon: 'flame' },
    { id: 'protein', name: 'Protein', boost: 2, icon: 'water' },
    { id: 'straps', name: 'Trhačky/Pásek', boost: 2, icon: 'body' },
    { id: 'vitamins', name: 'Vitamíny', boost: 1, icon: 'medkit' }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const strGoals = await AsyncStorage.getItem('@personal_goals_list');
        if (strGoals) setGoals(JSON.parse(strGoals));

        const strSupps = await AsyncStorage.getItem('@active_supps');
        if (strSupps) setActiveSupps(JSON.parse(strSupps));

        const mockInjected = await AsyncStorage.getItem('@mock_weights_injected_v2');
        if (!mockInjected) {
          const fakeWeights = [
            { id: 'w1', date: '01.04.2026', weight: 80.0 },
            { id: 'w2', date: '08.04.2026', weight: 79.2 },
            { id: 'w3', date: '15.04.2026', weight: 79.5 },
            { id: 'w4', date: '22.04.2026', weight: 78.4 },
            { id: 'w5', date: '29.04.2026', weight: 78.0 },
            { id: 'w6', date: '06.05.2026', weight: 77.1 },
            { id: 'w7', date: '13.05.2026', weight: 76.5 },
            { id: 'w8', date: '20.05.2026', weight: 76.8 },
            { id: 'w9', date: '27.05.2026', weight: 75.5 },
            { id: 'w10', date: '03.06.2026', weight: 75.0 }
          ];
          setWeights(fakeWeights);
          await AsyncStorage.setItem('@weight_history', JSON.stringify(fakeWeights));
          await AsyncStorage.setItem('@mock_weights_injected_v2', 'true');
        } else {
          const storedWeights = await AsyncStorage.getItem('@weight_history');
          if (storedWeights) setWeights(JSON.parse(storedWeights));
        }

        // Load progress photos
        const storedPhotos = await AsyncStorage.getItem('@progress_photos');
        if (storedPhotos) {
          let parsedPhotos = JSON.parse(storedPhotos);
          // Migrace ze staré kategorie 'Záda/Prsa'
          let changed = false;
          parsedPhotos = parsedPhotos.map(p => {
            if (p.category === 'Záda/Prsa') {
              changed = true;
              return { ...p, category: 'Prsa' }; // Defaultní split na Prsa při migraci
            }
            return p;
          });
          setPhotos(parsedPhotos);
          if (changed) {
            await AsyncStorage.setItem('@progress_photos', JSON.stringify(parsedPhotos));
          }
        }
      } catch (e) { }
    };
    loadData();
  }, []);

  // --- CÍLE METODY ---
  const toggleSupp = async (id) => {
    let newSupps = [...activeSupps];
    if (newSupps.includes(id)) newSupps = newSupps.filter(x => x !== id);
    else newSupps.push(id);
    setActiveSupps(newSupps);
    await AsyncStorage.setItem('@active_supps', JSON.stringify(newSupps));
  };

  const saveGoal = async () => {
    Keyboard.dismiss();
    if (!goalText.trim()) return;
    const newGoal = { id: Date.now().toString(), type: goalType, text: goalText };
    const newGoals = [newGoal, ...goals];
    await AsyncStorage.setItem('@personal_goals_list', JSON.stringify(newGoals));
    setGoals(newGoals);
    setGoalText('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteGoal = async (id) => {
    const newGoals = goals.filter(g => g.id !== id);
    await AsyncStorage.setItem('@personal_goals_list', JSON.stringify(newGoals));
    setGoals(newGoals);
  };

  // --- VÁHA METODY ---
  const addWeight = async () => {
    if (!newWeight || isNaN(newWeight.replace(',', '.'))) {
      Alert.alert("Chyba", "Zadejte platnou váhu.");
      return;
    }
    const cleanWeight = Number(newWeight.replace(',', '.'));
    const dt = new Date().toLocaleDateString('cs-CZ');
    let updated = [...weights];
    const index = updated.findIndex(w => w.date === dt);
    if (index >= 0) updated[index].weight = cleanWeight;
    else updated.push({ date: dt, weight: cleanWeight });

    setWeights(updated);
    await AsyncStorage.setItem('@weight_history', JSON.stringify(updated));
    setNewWeight("");
    Keyboard.dismiss();
  };

  const chartData = {
    labels: weights.length > 0 ? weights.slice(-7).map(w => {
      const parts = w.date.split('.');
      return parts.length >= 2 ? `${parts[0]}.${parts[1].replace(/^0/, '')}.` : w.date.substring(0, 5);
    }) : ["0"],
    datasets: [{ data: weights.length > 0 ? weights.slice(-7).map(w => w.weight) : [0] }]
  };

  // --- GALERIE METODY ---
  const saveNewPhoto = async (uri) => {
    const newPhoto = {
      id: Date.now().toString(),
      uri: uri,
      date: new Date().toLocaleDateString('cs-CZ'),
      category: galleryCategory === "Vše" ? "Celé tělo" : galleryCategory
    };
    const updatedPhotos = [newPhoto, ...photos];
    setPhotos(updatedPhotos);
    await AsyncStorage.setItem('@progress_photos', JSON.stringify(updatedPhotos));
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await saveNewPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Přístup odepřen", "Pro focení je potřeba povolit přístup k fotoaparátu.");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await saveNewPhoto(result.assets[0].uri);
    }
  };

  const deleteImage = async (uri) => {
    Alert.alert("Smazat fotku", "Opravdu chcete tuto fotku smazat?", [
      { text: "Zrušit", style: "cancel" },
      {
        text: "Smazat", style: "destructive", onPress: async () => {
          const updatedPhotos = photos.filter(img => img.uri !== uri);
          setPhotos(updatedPhotos);
          await AsyncStorage.setItem('@progress_photos', JSON.stringify(updatedPhotos));
          setModalVisible(false);
        }
      }
    ]);
  };

  const types = ['Síla', 'Váha', 'Osobní'];
  const displayedPhotos = galleryCategory === "Vše" ? photos : photos.filter(p => p.category === galleryCategory);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}><Ionicons name="person-circle" size={32} color="#3b82f6" /> Můj Profil</Text>

      {/* --- SEKVENCE 1: CÍLE --- */}
      <Text style={styles.subtitle}><Ionicons name="flag" size={22} color="#3b82f6" /> Osobní Cíle</Text>
      <View style={styles.card}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, color: styles.text.color }}>Vyber si zaměření:</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
          {types.map(t => (
            <TouchableOpacity key={t} style={[styles.goalTypeBtn, goalType === t && styles.goalTypeBtnActive]} onPress={() => setGoalType(t)}>
              <Text style={[styles.goalTypeBtnText, goalType === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Např: Zvednout na bench-press 100kg..." placeholderTextColor={styles.subText.color} multiline value={goalText} onChangeText={setGoalText} />
        <TouchableOpacity style={styles.primaryButton} onPress={saveGoal}>
          <Text style={styles.primaryButtonText}>{saved ? "Uloženo ✔️" : "Uložit cíl"}</Text>
        </TouchableOpacity>
      </View>

      {goals.length > 0 && goals.map(g => (
        <View key={g.id} style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontWeight: 'bold', color: '#2d6cdf', marginBottom: 4 }}>{g.type}</Text>
            <Text style={{ color: styles.text.color }}>{g.text}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteGoal(g.id)} style={{ padding: 10 }}>
            <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* --- SEKVENCE 2: DOPLŇKY --- */}
      <Text style={styles.subtitle}><Ionicons name="medkit" size={22} color="#3b82f6" /> Aktivní Doplňky (XP Boost)</Text>
      <View style={styles.card}>
        <Text style={{ color: '#666', marginBottom: 10 }}>
          Vyber si doplňky, které používáš pro svůj trénink. Zvýší ti to celkové XP získané po uložení tréninku!
        </Text>
        {SUPPLEMENTS_DB.map(s => {
          const isActive = activeSupps.includes(s.id);
          return (
            <TouchableOpacity key={s.id} onPress={() => toggleSupp(s.id)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: isActive ? '#e3f2fd' : '#f9f9fc', borderWidth: 1, borderColor: isActive ? '#2d6cdf' : '#eee', borderRadius: 8, marginBottom: 8 }}
            >
              <Text style={{ fontSize: 16, fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#3b82f6' : '#64748b' }}><Ionicons name={s.icon} size={16} /> {s.name}</Text>
              <Text style={{ color: isActive ? '#2d6cdf' : '#888', fontWeight: 'bold' }}>+{s.boost} %</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* --- SEKVENCE 3: VÁHA --- */}
      <Text style={styles.subtitle}><Ionicons name="scale" size={22} color="#3b82f6" /> Sledování Váhy</Text>
      <View style={styles.card}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 16, color: styles.text.color }}>Dnešní váha (kg):</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Např. 80.5" placeholderTextColor={styles.subText.color} keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} />
          <TouchableOpacity style={[styles.primaryButton, { marginTop: 0, marginLeft: 10, padding: 14 }]} onPress={addWeight}>
            <Text style={styles.primaryButtonText}>Uložit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {weights.length > 0 && (
        <View style={{ alignItems: 'center', backgroundColor: styles.card.backgroundColor, borderRadius: 12, paddingVertical: 10, marginBottom: 20 }}>
          <LineChart data={chartData} width={Dimensions.get("window").width - 50} height={220} yAxisSuffix=" kg"
            chartConfig={{
              backgroundColor: styles.card.backgroundColor,
              backgroundGradientFrom: styles.card.backgroundColor,
              backgroundGradientTo: styles.card.backgroundColor,
              decimalPlaces: 1,
              color: (o = 1) => `rgba(59, 130, 246, ${o})`,
              labelColor: (o = 1) => styles.text.color === '#0f172a' ? `rgba(15, 23, 42, ${o})` : `rgba(248, 250, 252, ${o})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#2563eb" }
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>
      )}

      {/* --- SEKVENCE 4: GALERIE --- */}
      <Text style={styles.subtitle}><Ionicons name="images" size={22} color="#3b82f6" /> Fotogalerie Progressu</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 15 }}>
        {galleryCategories.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setGalleryCategory(c)}
            style={[styles.goalTypeBtn, galleryCategory === c && styles.goalTypeBtnActive, { margin: 4 }]}
          >
            <Text style={[styles.goalTypeBtnText, galleryCategory === c && { color: '#fff' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginRight: 5, flexDirection: 'row', justifyContent: 'center' }]} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Vyfotit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginLeft: 5, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#334155' }]} onPress={pickImage}>
          <Ionicons name="folder" size={20} color="#fff" />
          <Text style={[styles.primaryButtonText, { marginLeft: 8, color: '#fff' }]}>Z galerie</Text>
        </TouchableOpacity>
      </View>

      {displayedPhotos.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Zatím nemáš žádné fotky v této kategorii.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
          {displayedPhotos.map((photo, index) => (
            <TouchableOpacity key={photo.id || index} onPress={() => { setSelectedImage(photo.uri); setModalVisible(true); }} style={{ width: '31%', marginRight: index % 3 !== 2 ? '3.5%' : 0, marginBottom: 10 }}>
              <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 120, borderRadius: 8, backgroundColor: '#eee' }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setModalVisible(false)}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '70%', resizeMode: 'contain' }} />}
          <TouchableOpacity style={{ marginTop: 30, backgroundColor: '#d32f2f', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 }} onPress={() => deleteImage(selectedImage)}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Smazat fotku</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// --- HLAVNÍ NAVIGACE A SPRÁVA STAVU ---
// Toto je mozek celé aplikace, který drží informace o uživateli a trénincích


function TermsOfUseScreen({ onAccept, onDecline }) {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>Podmínky užívání</Text>
      <ScrollView style={{ flex: 1, marginBottom: 20 }}>
        <Text style={styles.termsText}>
          Tato aplikace slouží pro sledování fitness pokroku. Všechna vaše data jsou zpracovávána bezpečně.
          Používáním aplikace souhlasíte s tím, že autor nenese odpovědnost za případná zranění při tréninku.
          Aplikace nevyužívá vaše data k prodeji třetím stranám.
        </Text>
      </ScrollView>
      <TouchableOpacity style={styles.primaryButton} onPress={onAccept}>
        <Text style={styles.primaryButtonText}>Souhlasím</Text>
      </TouchableOpacity>
      {onDecline && (
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#e0e0e0', marginTop: 10 }]} onPress={onDecline}>
          <Text style={[styles.primaryButtonText, { color: '#333' }]}>Nesouhlasím</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useThemeActions();
  return (
    <TouchableOpacity onPress={toggleTheme} style={{ padding: 5, backgroundColor: theme === 'dark' ? '#334155' : '#f1f5f9', borderRadius: 20 }}>
      <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={20} color={theme === 'dark' ? '#fbbf24' : '#f59e0b'} />
    </TouchableOpacity>
  );
}

export default function App() {
  const systemTheme = _useColorScheme();
  const [manualTheme, setManualTheme] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('@theme_override').then(res => {
      if (res) setManualTheme(res);
    });
  }, []);

  const toggleTheme = () => {
    const nextTheme = (manualTheme || systemTheme || 'dark') === 'light' ? 'dark' : 'light';
    setManualTheme(nextTheme);
    AsyncStorage.setItem('@theme_override', nextTheme);
  };

  const activeTheme = manualTheme || systemTheme || 'dark';
  const theme = activeTheme;
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [user, setUser] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log('Google signOut error', error);
    }
    setUser(null);
  };

  useEffect(() => {
    AsyncStorage.getItem('@terms_accepted').then(res => {
      if (res !== 'true') setTermsAccepted(false);
    });
  }, []);

  const handleAcceptTerms = async () => {
    await AsyncStorage.setItem('@terms_accepted', 'true');
    setTermsAccepted(true);
  };

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
      let u;
      if (creds.mode === 'google') {
        u = await authGoogle(creds.user.email, creds.user.displayName, creds.user.uid);
      } else {
        u = creds.mode === "register"
          ? await register(creds.name, creds.email, creds.password)
          : await login(creds.email, creds.password);
      }
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
    try {
      let boostPercentage = 0;
      try {
        const storedSupps = await AsyncStorage.getItem('@active_supps');
        if (storedSupps) {
          const activeIds = JSON.parse(storedSupps);
          const SUPPLEMENTS_DB = [
            { id: 'creatine', boost: 5 }, { id: 'preworkout', boost: 3 },
            { id: 'protein', boost: 2 }, { id: 'straps', boost: 2 }, { id: 'vitamins', boost: 1 }
          ];
          activeIds.forEach(id => {
            const s = SUPPLEMENTS_DB.find(x => x.id === id);
            if (s) boostPercentage += s.boost;
          });
        }
      } catch (e) { }

      const finalPayload = { ...payload, boostPercentage };

      // Optimistic UI update or wait? Let's wait.
      const res = await addWorkout(user.id, finalPayload, user.token);
      if (res) {
        // Reload history
        const list = await fetchWorkouts(user.id, user.token);
        setWorkouts(list || []);
        // Update User XP, Level, Rank locally
        if (res.newUserStats) {
          setUser(u => ({
            ...u,
            xp: res.newUserStats.totalXp,
            level: res.newUserStats.level,
            rank: res.newUserStats.rank
          }));
        } else {
          // Fallback for older backend
          setUser(u => ({ ...u, xp: (u.xp || 0) + (res.xp || 0) }));
        }
      }
    } catch (e) {
      Alert.alert("Chyba při ukládání", "Trénink se nepovedlo odeslat: " + e.message);
    }
  };

  if (!termsAccepted) {
    return (
      <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.containerCenter}>
              <Ionicons name="shield-checkmark" size={60} color="#3b82f6" style={{ marginBottom: 20 }} />
              <Text style={styles.title}>Podmínky užití</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 20 }]}>
                Aplikace Lift & Level je poskytována "tak jak je". Za případná zranění při tréninku nenese vývojář odpovědnost. Trénuj s rozumem!
              </Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleAcceptTerms}>
                <Text style={styles.btnText}>Rozumím a souhlasím</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeContext.Provider>
    );
  }

  if (!user) {
    return (
      <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <LoginScreen onAuth={handleAuth} busy={authBusy} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer theme={activeTheme === "dark" ? DarkTheme : DefaultTheme}>
            <Tab.Navigator screenOptions={{
              tabBarActiveTintColor: "#3b82f6",
              tabBarStyle: { height: 85, paddingBottom: 25, paddingTop: 10 },
              tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
              headerRight: () => <View style={{ paddingRight: 15 }}><ThemeToggleButton /></View>
            }}>
              <Tab.Screen
                name="Domů"
                options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={34} color={color} /> }}
              >
                {() => <HomeScreen user={user} workouts={workouts} onLogout={handleLogout} onUpdateUser={newStats => setUser(u => ({ ...u, ...newStats }))} />}
              </Tab.Screen>
              <Tab.Screen
                name="Trénink"
                options={{ tabBarIcon: ({ color }) => <Ionicons name="barbell" size={34} color={color} /> }}
              >
                {() => (
                  <WorkoutScreen
                    workouts={workouts}
                    onFinishWorkout={handleFinishWorkout}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen
                name="Progress"
                options={{ tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={34} color={color} /> }}
              >
                {() => <ProgressScreen workouts={workouts} />}
              </Tab.Screen>
              <Tab.Screen
                name="Ocenění"
                options={{ tabBarIcon: ({ color }) => <Ionicons name="trophy" size={34} color={color} /> }}
              >
                {() => <AchievementsScreen workouts={workouts} user={user} onUpdateUser={newStats => setUser(u => ({ ...u, ...newStats }))} />}
              </Tab.Screen>
              <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="person" size={34} color={color} /> }} />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}


const getStyles = (theme) => {
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0f172a' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    btnText: '#ffffff',
    inputBg: isDark ? '#0f172a' : '#f1f5f9',
    inputText: isDark ? '#f8fafc' : '#0f172a',
    selectedBg: isDark ? '#1e293b' : '#e0e7ff',
    danger: '#ef4444',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 20,
    },
    containerCenter: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 20,
      color: colors.text,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: "700",
      marginTop: 24,
      marginBottom: 12,
      color: colors.text,
      letterSpacing: -0.3,
    },
    card: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 20,
      marginBottom: 16,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 10,
      elevation: 4,
    },
    input: {
      width: "100%",
      backgroundColor: colors.inputBg,
      color: colors.inputText,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      fontSize: 16,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    primaryButtonText: {
      color: colors.btnText,
      fontWeight: "700",
      fontSize: 16,
    },
    termsText: { color: colors.text, fontSize: 16, lineHeight: 24 },
    text: { color: colors.text },
    subText: { color: colors.subText },
    container: { flex: 1, padding: 16, backgroundColor: colors.bg },
    containerCenter: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.bg },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: colors.text },
    subtitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 10, color: colors.subText },

    input: { backgroundColor: colors.inputBg, color: colors.inputText, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 12, fontSize: 16 },
    primaryButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    primaryButtonText: { color: colors.btnText, fontSize: 17, fontWeight: '700' },
    linkButton: { marginTop: 16, alignItems: 'center' },
    linkButtonText: { color: colors.primary, fontSize: 16 },
    error: { color: 'red', marginBottom: 10 },

    header: { marginBottom: 30 },
    greeting: { fontSize: 16, color: colors.subText, textTransform: 'uppercase' },
    userName: { fontSize: 32, fontWeight: '900', color: colors.text },

    levelCard: { backgroundColor: colors.primary, padding: 24, borderRadius: 20, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: 40 },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    levelLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' },
    levelValue: { color: '#fff', fontSize: 48, fontWeight: '900', lineHeight: 48 },
    rankLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' },
    rankValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },

    progressContainer: { height: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
    progressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 6 },
    progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
    xpText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
    xpDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, textAlign: 'center' },

    motivationalText: { fontSize: 16, fontStyle: 'italic', color: colors.subText, textAlign: 'center', marginHorizontal: 30 },

    logoutBtn: { padding: 16, alignItems: 'center' },
    logoutText: { color: '#d32f2f', fontWeight: 'bold' },

    bigStartBtn: { backgroundColor: colors.primary, padding: 40, borderRadius: 20, alignItems: 'center', marginVertical: 20, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
    bigStartBtnText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },

    activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 16, backgroundColor: colors.card, borderRadius: 12 },
    activeLabel: { fontSize: 14, color: colors.subText },
    timerData: { fontSize: 32, fontVariant: ['tabular-nums'], fontWeight: 'bold', color: colors.text },

    card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: colors.text },

    selectBtn: { backgroundColor: colors.inputBg, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
    selectBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
    selectedExRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: colors.selectedBg, borderRadius: 8 },
    selectedExText: { fontSize: 18, fontWeight: 'bold', color: colors.text },

    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    inputSmall: { flex: 1, backgroundColor: colors.inputBg, color: colors.inputText, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginHorizontal: 4, textAlign: 'center' },

    miniCard: { backgroundColor: colors.card, padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: colors.primary },

    modalContainer: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    closeText: { color: colors.primary, fontSize: 17 },
    pickerItem: { padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickerItemText: { fontSize: 16, color: colors.text },

    historyCard: { backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 10 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    historyDate: { color: colors.subText, fontSize: 14 },
    historyXp: { color: colors.primary, fontWeight: 'bold' },
    historySubtitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.text },

    legendBox: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 30, backgroundColor: colors.card, padding: 10, borderRadius: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 5 },
    colorBox: { width: 16, height: 16, borderRadius: 4, marginRight: 6 },

    goalTypeBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.border },
    goalTypeBtnActive: { backgroundColor: colors.primary },
    goalTypeBtnText: { fontWeight: '600', color: colors.subText },

    quoteCard: { backgroundColor: colors.card, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, alignItems: 'center', marginBottom: 20 },
    quoteLabel: { color: colors.primary, fontWeight: 'bold', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    motivationalQuote: { fontSize: 16, fontStyle: 'italic', color: colors.text, textAlign: 'center', fontWeight: '500' },
  });
}; // End of getStyles

