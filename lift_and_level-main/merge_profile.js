const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.js');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Zvětšení ikon
code = code.replace(/<Text style={{ fontSize: 20, color }}>🏠<\/Text>/g, '<Text style={{ fontSize: 28, color }}>🏠</Text>');
code = code.replace(/<Text style={{ fontSize: 20, color }}>🏋️<\/Text>/g, '<Text style={{ fontSize: 28, color }}>🏋️</Text>');
code = code.replace(/<Text style={{ fontSize: 20, color }}>📈<\/Text>/g, '<Text style={{ fontSize: 28, color }}>📈</Text>');
code = code.replace(/<Text style={{ fontSize: 20, color }}>🏆<\/Text>/g, '<Text style={{ fontSize: 28, color }}>🏆</Text>');
code = code.replace(/<Text style={{ fontSize: 20, color }}>🎯<\/Text>/g, '<Text style={{ fontSize: 28, color }}>👤</Text>'); // Changed to user profile icon

// 2. Úprava Tab.Navigatoru
code = code.replace(
  /<Tab.Screen name="Cíle" component={ProfileScreen} options={{ tabBarIcon: \({ color }\) => <Text style={{ fontSize: 20, color }}>🎯<\/Text> }} \/>\s*<Tab.Screen name="Váha" component={WeightScreen} options={{ tabBarIcon: \({ color }\) => <Text style={{ fontSize: 20, color }}>⚖️<\/Text> }} \/>\s*<Tab.Screen name="Galerie" component={GalleryScreen} options={{ tabBarIcon: \({ color }\) => <Text style={{ fontSize: 20, color }}>🖼️<\/Text> }} \/>/,
  '<Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 28, color }}>👤</Text> }} />'
);

// 3. Oprava layoutu Výzev
const dailyOld = `<View style={{ marginTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>`;
const dailyNew = `<View style={{ marginTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' }}>`;
const weeklyOld = `<View style={{ marginTop: 10 }}>`;
const weeklyNew = `<View style={{ marginTop: 15, alignItems: 'center' }}>`;
code = code.replace(dailyOld, dailyNew).replace(weeklyOld, weeklyNew);

// 4. Přepis ProfileScreen, WeightScreen a GalleryScreen
const profileStart = `function ProfileScreen() {`;
const galleryEnd = `  );\n}\n\n// --- HLAVNÍ NAVIGACE A SPRÁVA STAVU ---`;
const galleryEndAlt = `  );\r\n}\r\n\r\n// --- HLAVNÍ NAVIGACE A SPRÁVA STAVU ---`;

const startIndex = code.indexOf(profileStart);
let endIndex = code.indexOf(galleryEnd) > -1 ? (code.indexOf(galleryEnd) + galleryEnd.length) : -1;
if (endIndex === -1 && code.indexOf(galleryEndAlt) > -1) {
  endIndex = code.indexOf(galleryEndAlt) + galleryEndAlt.length;
}

if (startIndex === -1 || endIndex <= startIndex) {
  console.log("Could not find blocks to replace!");
  process.exit(1);
}

const newProfileScreen = `// --- OBRAZOVKA PROFILU (Sjednocené Cíle, Váha a Galerie) ---
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
  const [images, setImages] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const SUPPLEMENTS_DB = [
    { id: 'creatine', name: 'Kreatin', boost: 5, icon: '⚡' },
    { id: 'preworkout', name: 'Pre-workout', boost: 3, icon: '🔥' },
    { id: 'protein', name: 'Protein', boost: 2, icon: '🥤' },
    { id: 'straps', name: 'Trhačky/Pásek', boost: 2, icon: '🏋️' },
    { id: 'vitamins', name: 'Vitamíny', boost: 1, icon: '💊' }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const strGoals = await AsyncStorage.getItem('@personal_goals_list');
        if (strGoals) setGoals(JSON.parse(strGoals));

        const strSupps = await AsyncStorage.getItem('@active_supps');
        if (strSupps) setActiveSupps(JSON.parse(strSupps));

        const storedWeights = await AsyncStorage.getItem('@weight_history');
        if (storedWeights) setWeights(JSON.parse(storedWeights));

        const storedImages = await AsyncStorage.getItem('@gallery_images');
        if (storedImages) setImages(JSON.parse(storedImages));
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
    labels: weights.length > 0 ? weights.slice(-7).map(w => w.date.substring(0, 5)) : ["0"],
    datasets: [{ data: weights.length > 0 ? weights.slice(-7).map(w => w.weight) : [0] }]
  };

  // --- GALERIE METODY ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImages = [...images, result.assets[0].uri];
      setImages(newImages);
      await AsyncStorage.setItem('@gallery_images', JSON.stringify(newImages));
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
      const newImages = [...images, result.assets[0].uri];
      setImages(newImages);
      await AsyncStorage.setItem('@gallery_images', JSON.stringify(newImages));
    }
  };

  const deleteImage = async (uri) => {
    Alert.alert("Smazat fotku", "Opravdu chcete tuto fotku smazat?", [
      { text: "Zrušit", style: "cancel" },
      { text: "Smazat", style: "destructive", onPress: async () => {
          const newImages = images.filter(img => img !== uri);
          setImages(newImages);
          await AsyncStorage.setItem('@gallery_images', JSON.stringify(newImages));
          setModalVisible(false);
      }}
    ]);
  };

  const types = ['Síla', 'Váha', 'Osobní'];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>👤 Můj Profil</Text>

      {/* --- SEKVENCE 1: CÍLE --- */}
      <Text style={styles.subtitle}>🎯 Osobní Cíle</Text>
      <View style={styles.card}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Vyber si zaměření:</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
          {types.map(t => (
            <TouchableOpacity key={t} style={[styles.goalTypeBtn, goalType === t && styles.goalTypeBtnActive]} onPress={() => setGoalType(t)}>
              <Text style={[styles.goalTypeBtnText, goalType === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Např: Zvednout na bench-press 100kg..." multiline value={goalText} onChangeText={setGoalText} />
        <TouchableOpacity style={styles.primaryButton} onPress={saveGoal}>
          <Text style={styles.primaryButtonText}>{saved ? "Uloženo ✔️" : "Uložit cíl"}</Text>
        </TouchableOpacity>
      </View>

      {goals.length > 0 && goals.map(g => (
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

      {/* --- SEKVENCE 2: DOPLŇKY --- */}
      <Text style={styles.subtitle}>💊 Aktivní Doplňky (XP Boost)</Text>
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
              <Text style={{ fontSize: 16, fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#2d6cdf' : '#333' }}>{s.icon} {s.name}</Text>
              <Text style={{ color: isActive ? '#2d6cdf' : '#888', fontWeight: 'bold' }}>+{s.boost} %</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* --- SEKVENCE 3: VÁHA --- */}
      <Text style={styles.subtitle}>⚖️ Sledování Váhy</Text>
      <View style={styles.card}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 16 }}>Dnešní váha (kg):</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Např. 80.5" keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} />
          <TouchableOpacity style={[styles.primaryButton, { marginTop: 0, marginLeft: 10, padding: 14 }]} onPress={addWeight}>
            <Text style={styles.primaryButtonText}>Uložit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {weights.length > 0 && (
        <View style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, marginBottom: 20 }}>
          <LineChart data={chartData} width={Dimensions.get("window").width - 50} height={220} yAxisSuffix=" kg"
            chartConfig={{ backgroundColor: "#ffffff", backgroundGradientFrom: "#ffffff", backgroundGradientTo: "#ffffff", decimalPlaces: 1, color: (o = 1) => \`rgba(45, 108, 223, \${o})\`, labelColor: (o = 1) => \`rgba(0, 0, 0, \${o})\`, style: { borderRadius: 16 }, propsForDots: { r: "5", strokeWidth: "2", stroke: "#1a4dad" } }}
            bezier style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>
      )}

      {/* --- SEKVENCE 4: GALERIE --- */}
      <Text style={styles.subtitle}>🖼️ Fotogalerie Progressu</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginRight: 5, flexDirection: 'row', justifyContent: 'center' }]} onPress={takePhoto}>
          <Text style={styles.primaryButtonText}>📷 Vyfotit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginLeft: 5, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#444' }]} onPress={pickImage}>
          <Text style={[styles.primaryButtonText, { color: '#fff' }]}>📁 Z galerie</Text>
        </TouchableOpacity>
      </View>

      {images.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Zatím nemáš žádné fotky pokroku.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {images.map((uri, index) => (
            <TouchableOpacity key={index} onPress={() => { setSelectedImage(uri); setModalVisible(true); }}>
              <Image source={{ uri }} style={{ width: (Dimensions.get('window').width - 50) / 3, height: 120, borderRadius: 8, marginBottom: 10, backgroundColor: '#eee' }} />
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

// --- HLAVNÍ NAVIGACE A SPRÁVA STAVU ---`;

code = code.substring(0, startIndex) + newProfileScreen + code.substring(endIndex);

fs.writeFileSync(appPath, code);
console.log("App.js successfully rewritten!");
