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
  Alert,
  Keyboard,
  Image,
  Dimensions
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { LineChart } from "react-native-chart-kit";
import Body from "react-native-body-highlighter";

import { addWorkout, fetchWorkouts, login, register, searchExercises, fetchRandomQuote, addXp } from "./services/api";

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

// --- Motivation Quotes Setup ---
function HomeScreen({ user, onLogout }) {
  const [motivationalQuote, setMotivationalQuote] = useState("Načítám motivaci...");

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
  }, []);

  // Helpers
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

  return (
    <View style={styles.containerCenter}>
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
            <Text style={styles.rankValue}>{user.rank}</Text>
          </View>
        </View>

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

      {/* Motivational Quote */}
      <View style={styles.quoteCard}>
        <Text style={styles.quoteLabel}>Motivace pro dnešek</Text>
        <Text style={styles.motivationalQuote}>"{motivationalQuote}"</Text>
      </View>

      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Odhlásit se</Text>
      </TouchableOpacity>
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

    setSets("");
    setReps("");

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

// --- Progress / Figure Visualization ---
function ProgressScreen({ workouts }) {
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
    <ScrollView style={{ flex: 1, backgroundColor: '#f2f2f7' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.title, { textAlign: 'center' }]}>🏋️‍♂️ Vývoj postavy</Text>
      <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
        Svalové partie se vybarvují podle intenzity tréninků (počet sérií) za posledních 7 dní.
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', flexWrap: 'wrap', marginTop: 10 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 15, color: '#444' }}>Zepředu</Text>
          <Body data={bodyData} side="front" scale={1.2} gender="male" colors={colors} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 15, color: '#444' }}>Zezadu</Text>
          <Body data={bodyData} side="back" scale={1.2} gender="male" colors={colors} />
        </View>
      </View>

      <View style={styles.legendBox}>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#e0e0e0' }]} /><Text>Netrénováno</Text></View>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#ffcdd2' }]} /><Text>Lehký tr. (1-4 série)</Text></View>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#ef5350' }]} /><Text>Střední tr. (5-9 s.)</Text></View>
        <View style={styles.legendItem}><View style={[styles.colorBox, { backgroundColor: '#c62828' }]} /><Text>Těžký tr. (10+ s.)</Text></View>
      </View>
    </ScrollView>
  );
}

function getPRRank(weight) {
  if (weight >= 180) return "👑 Champion";
  if (weight >= 150) return "💎 Diamond";
  if (weight >= 120) return "⭐ Platinum";
  if (weight >= 100) return "🥇 Gold";
  if (weight >= 80) return "🥈 Silver";
  if (weight >= 50) return "🥉 Bronze";
  return "Nováček";
}

function AchievementsScreen({ workouts, user, onUpdateUser }) {
  const [claimedRewards, setClaimedRewards] = useState({});
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@claimed_rewards').then(res => {
      if (res) setClaimedRewards(JSON.parse(res));
    });
  }, []);

  const claim = async (id, xpAmount) => {
    if (claiming || claimedRewards[id]) return;
    setClaiming(true);
    try {
      const newStats = await addXp(user.id, xpAmount, user.token);
      onUpdateUser(newStats);

      const newClaimed = { ...claimedRewards, [id]: true };
      setClaimedRewards(newClaimed);
      await AsyncStorage.setItem('@claimed_rewards', JSON.stringify(newClaimed));
      Alert.alert("Úspěch", `Gratulujeme! Získal(a) jsi ${xpAmount} XP.`);
    } catch (e) {
      Alert.alert("Chyba", "Nepodařilo se připsat XP.");
    } finally {
      setClaiming(false);
    }
  };

  const renderReward = (id, xp, condition, title) => {
    const isUnlocked = condition;
    const isClaimed = claimedRewards[id];
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, flex: 1, paddingRight: 10 }}>
          {isUnlocked ? "✅" : "❌"} {title}
        </Text>
        {isUnlocked && !isClaimed && (
          <TouchableOpacity onPress={() => claim(id, xp)} style={{ backgroundColor: '#ff9800', padding: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Získat {xp} XP</Text>
          </TouchableOpacity>
        )}
        {isClaimed && <Text style={{ color: '#2d6cdf', fontWeight: 'bold' }}>Vybráno</Text>}
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
      <Text style={styles.title}>🏆 Ocenění a Výzvy</Text>

      <Text style={styles.subtitle}>Osobní rekordy (PRs)</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={{ fontSize: 16, flex: 1 }}>Bench Press:</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{prs.bench > 0 ? `${prs.bench} kg` : '-- kg'}</Text>
          <Text style={{ fontSize: 14, color: '#666', width: 100, textAlign: 'right' }}>{getPRRank(prs.bench)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ fontSize: 16, flex: 1 }}>Dřep:</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{prs.squat > 0 ? `${prs.squat} kg` : '-- kg'}</Text>
          <Text style={{ fontSize: 14, color: '#666', width: 100, textAlign: 'right' }}>{getPRRank(prs.squat)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ fontSize: 16, flex: 1 }}>Mrtvý tah:</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{prs.deadlift > 0 ? `${prs.deadlift} kg` : '-- kg'}</Text>
          <Text style={{ fontSize: 14, color: '#666', width: 100, textAlign: 'right' }}>{getPRRank(prs.deadlift)}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Odměny za pravidelnost (XP)</Text>
      <View style={styles.card}>
        {renderReward('workout_1', 50, workoutCount >= 1, "První krok (1 trénink)")}
        {renderReward('workout_10', 200, workoutCount >= 10, "Železná vůle (10 tréninků)")}
        {renderReward('workout_50', 1000, workoutCount >= 50, "Gym Rat (50 tréninků)")}
      </View>

      <Text style={styles.subtitle}>PR Výzvy (XP)</Text>
      <View style={styles.card}>
        {renderReward('pr_bench_100', 300, prs.bench >= 100, "Klubovka 100 na bench")}
        {renderReward('pr_squat_100', 300, prs.squat >= 100, "Dřep se 100!")}
        {renderReward('pr_deadlift_150', 500, prs.deadlift >= 150, "Silák v tahu (150 kg)")}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function GalleryScreen() {
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
            <Text style={{ marginTop: 8, fontWeight: 'bold' }}>{item.date}</Text>
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

function ProfileScreen() {
  const [goalType, setGoalType] = useState('Síla');
  const [goalText, setGoalText] = useState('');
  const [saved, setSaved] = useState(false);
  const [goals, setGoals] = useState([]);
  const [activeSupps, setActiveSupps] = useState([]);

  const SUPPLEMENTS_DB = [
    { id: 'creatine', name: 'Kreatin', boost: 5, icon: '⚡' },
    { id: 'preworkout', name: 'Pre-workout', boost: 3, icon: '🔥' },
    { id: 'protein', name: 'Protein', boost: 2, icon: '🥤' },
    { id: 'straps', name: 'Trhačky/Pásek', boost: 2, icon: '🏋️' },
    { id: 'vitamins', name: 'Vitamíny', boost: 1, icon: '💊' }
  ];

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const strGoals = await AsyncStorage.getItem('@personal_goals_list');
        if (strGoals) {
          setGoals(JSON.parse(strGoals));
        } else {
          // Zpětná kompatibilita se starým uložením
          const oldGoalStr = await AsyncStorage.getItem('@personal_goal');
          if (oldGoalStr) {
            const oldGoal = JSON.parse(oldGoalStr);
            setGoals([{ id: Date.now().toString(), type: oldGoal.type || 'Síla', text: oldGoal.text || '' }]);
          }
        }
      } catch (e) { }
    };

    const loadSupps = async () => {
      try {
        const str = await AsyncStorage.getItem('@active_supps');
        if (str) setActiveSupps(JSON.parse(str));
      } catch (e) { }
    };

    loadGoals();
    loadSupps();
  }, []);

  const toggleSupp = async (id) => {
    let newSupps = [...activeSupps];
    if (newSupps.includes(id)) {
      newSupps = newSupps.filter(x => x !== id);
    } else {
      newSupps.push(id);
    }
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

  const types = ['Síla', 'Váha', 'Osobní'];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>🎯 Osobní Cíle</Text>

      <View style={styles.card}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Vyber si zaměření:</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
          {types.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.goalTypeBtn, goalType === t && styles.goalTypeBtnActive]}
              onPress={() => setGoalType(t)}
            >
              <Text style={[styles.goalTypeBtnText, goalType === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Tvůj konkrétní cíl:</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Např: Zvednout na bench-press 100kg..."
          multiline
          value={goalText}
          onChangeText={setGoalText}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={saveGoal}>
          <Text style={styles.primaryButtonText}>{saved ? "Uloženo ✔️" : "Uložit cíl"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Moje cíle</Text>
      {goals.length === 0 && (
        <Text style={{ color: '#666', textAlign: 'center', marginTop: 10 }}>Zatím nemáš žádné cíle.</Text>
      )}
      {goals.map(g => (
        <View key={g.id} style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontWeight: 'bold', color: '#2d6cdf', marginBottom: 4 }}>{g.type}</Text>
            <Text>{g.text}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteGoal(g.id)} style={{ padding: 10 }}>
            <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.subtitle}>💊 Aktivní Doplňky (XP Boost)</Text>
      <View style={styles.card}>
        <Text style={{ color: '#666', marginBottom: 10 }}>
          Vyber si doplňky, které používáš pro svůj trénink. Zvýší ti to celkové XP získané po uložení tréninku!
        </Text>
        {SUPPLEMENTS_DB.map(s => {
          const isActive = activeSupps.includes(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => toggleSupp(s.id)}
              style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                padding: 12, backgroundColor: isActive ? '#e3f2fd' : '#f9f9fc',
                borderWidth: 1, borderColor: isActive ? '#2d6cdf' : '#eee', borderRadius: 8, marginBottom: 8
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#2d6cdf' : '#333' }}>
                {s.icon} {s.name}
              </Text>
              <Text style={{ color: isActive ? '#2d6cdf' : '#888', fontWeight: 'bold' }}>
                +{s.boost} %
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function WeightScreen() {
  const [weights, setWeights] = useState([]);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    const loadWeights = async () => {
      try {
        const stored = await AsyncStorage.getItem('@weight_history');
        if (stored) {
          setWeights(JSON.parse(stored));
        }
      } catch (e) { }
    };
    loadWeights();
  }, []);

  const addWeight = async () => {
    if (!newWeight || isNaN(newWeight.replace(',', '.'))) {
      Alert.alert("Chyba", "Zadejte platnou váhu.");
      return;
    }
    const cleanWeight = Number(newWeight.replace(',', '.'));
    const dt = new Date().toLocaleDateString('cs-CZ');
    let updated = [...weights];

    // Check if there is already a weight for today
    const index = updated.findIndex(w => w.date === dt);
    if (index >= 0) {
      updated[index].weight = cleanWeight;
    } else {
      updated.push({ date: dt, weight: cleanWeight });
    }

    setWeights(updated);
    await AsyncStorage.setItem('@weight_history', JSON.stringify(updated));
    setNewWeight("");
    Keyboard.dismiss();
  };

  const chartData = {
    labels: weights.length > 0 ? weights.slice(-7).map(w => w.date.substring(0, 5)) : ["0"],
    datasets: [
      {
        data: weights.length > 0 ? weights.slice(-7).map(w => w.weight) : [0]
      }
    ]
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⚖️ Sledování Váhy</Text>

      <View style={styles.card}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 16 }}>Dnešní váha (kg):</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Nová váha (např. 80.5)"
            keyboardType="numeric"
            value={newWeight}
            onChangeText={setNewWeight}
          />
          <TouchableOpacity style={[styles.primaryButton, { marginTop: 0, marginLeft: 10, padding: 14 }]} onPress={addWeight}>
            <Text style={styles.primaryButtonText}>Uložit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtitle}>Historie ({weights.length})</Text>

      {weights.length > 0 ? (
        <View style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, marginBottom: 20 }}>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 50}
            height={220}
            yAxisSuffix=" kg"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(45, 108, 223, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#1a4dad"
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>
      ) : (
        <Text style={{ color: '#666', marginTop: 10, marginBottom: 20 }}>Přidejte první záznam pro zobrazení grafu.</Text>
      )}

      {weights.slice().reverse().map((w, index) => (
        <View key={index} style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }]}>
          <Text style={{ fontSize: 16 }}>{w.date}</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{w.weight} kg</Text>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
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
            <Tab.Screen name="Progress">
              {() => <ProgressScreen workouts={workouts} />}
            </Tab.Screen>
            <Tab.Screen name="Ocenění">
              {() => <AchievementsScreen workouts={workouts} user={user} onUpdateUser={newStats => setUser(u => ({ ...u, ...newStats }))} />}
            </Tab.Screen>
            <Tab.Screen name="Cíle" component={ProfileScreen} />
            <Tab.Screen name="Váha" component={WeightScreen} />
            <Tab.Screen name="Galerie" component={GalleryScreen} />
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

  // Stats - REMOVE OLD STATS STYLES IF UNUSED
  // New Home Styles
  header: { marginBottom: 30 },
  greeting: { fontSize: 16, color: '#888', textTransform: 'uppercase' },
  userName: { fontSize: 32, fontWeight: '900', color: '#333' },

  levelCard: {
    backgroundColor: '#2d6cdf',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#2d6cdf',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 40
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  levelLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' },
  levelValue: { color: '#fff', fontSize: 48, fontWeight: '900', lineHeight: 48 },
  rankLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' },
  rankValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },

  progressContainer: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 6
  },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  xpDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, textAlign: 'center' },

  motivationalText: { fontSize: 16, fontStyle: 'italic', color: '#666', textAlign: 'center', marginHorizontal: 30 },

  logoutBtn: { padding: 16, alignItems: 'center' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold' },

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
  historySubtitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },

  // Legend
  legendBox: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 30, backgroundColor: '#fff', padding: 10, borderRadius: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 5 },
  colorBox: { width: 16, height: 16, borderRadius: 4, marginRight: 6 },

  // Goals
  goalTypeBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eee' },
  goalTypeBtnActive: { backgroundColor: '#2d6cdf' },
  goalTypeBtnText: { fontWeight: '600', color: '#555' },

  // Quotes
  quoteCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, alignItems: 'center', marginBottom: 20 },
  quoteLabel: { color: '#2d6cdf', fontWeight: 'bold', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  motivationalQuote: { fontSize: 16, fontStyle: 'italic', color: '#444', textAlign: 'center', fontWeight: '500' },
});
