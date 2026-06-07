const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'lift_and_level-main', 'App.js');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Add new imports
code = code.replace(
  /import \{\n  StyleSheet,\n  Text,\n  View,\n  Button,\n  TextInput,\n  ScrollView,\n  TouchableOpacity,\n  ActivityIndicator,\n  Modal,\n  FlatList,\n  Alert,\n  Keyboard,\n  Image,\n  Dimensions\n\} from "react-native";/,
  `import {
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
  Dimensions,
  useColorScheme,
  KeyboardAvoidingView,
  Platform
} from "react-native";`
);

code = code.replace(/import React, \{ useEffect, useMemo, useState, useRef \} from "react";/, `import React, { useEffect, useMemo, useState, useRef } from "react";\nimport { useWindowDimensions } from "react-native";`);

// 2. Add TermsOfUseScreen component before App
const termsScreenCode = `
function TermsOfUseScreen({ onAccept, onDecline }) {
  const theme = useColorScheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>Podmínky užívání</Text>
      <ScrollView style={{flex: 1, marginBottom: 20}}>
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
        <TouchableOpacity style={[styles.primaryButton, {backgroundColor: '#e0e0e0', marginTop: 10}]} onPress={onDecline}>
          <Text style={[styles.primaryButtonText, {color: '#333'}]}>Nesouhlasím</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

`;
code = code.replace(/export default function App\(\) \{/, termsScreenCode + 'export default function App() {');


// 3. Inject hooks line by line
const lines = code.split('\\n');
const newLines = [];
const componentsToInject = [
  'LoginScreen', 'Timer', 'ExercisePicker', 'HomeScreen', 'WorkoutScreen',
  'ProgressScreen', 'AchievementsScreen', 'GalleryScreen', 'ProfileScreen',
  'WeightScreen', 'App', 'TermsOfUseScreen'
];

for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
  for (const comp of componentsToInject) {
    if (lines[i].includes(`function ${comp}(`) && lines[i].endsWith('{')) {
      newLines.push(`  const theme = useColorScheme();`);
      newLines.push(`  const styles = useMemo(() => getStyles(theme), [theme]);`);
      newLines.push(`  const { width, height } = useWindowDimensions();`);
      break;
    }
  }
}
code = newLines.join('\\n');

// 4. Update StyleSheet
code = code.replace(/const styles = StyleSheet\.create\(\{/, `
const getStyles = (theme) => {
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#121212' : '#f2f2f7',
    card: isDark ? '#1e1e1e' : '#fff',
    text: isDark ? '#fff' : '#333',
    subText: isDark ? '#aaa' : '#666',
    border: isDark ? '#333' : '#ddd',
    primary: '#2d6cdf',
    btnText: '#fff',
    inputBg: isDark ? '#2c2c2e' : '#f9f9fc',
    inputText: isDark ? '#fff' : '#000',
    selectedBg: isDark ? '#3a3a3c' : '#eef',
  };

  return StyleSheet.create({
    termsText: { color: colors.text, fontSize: 16, lineHeight: 24 },
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

const oldStylesToRemove = { `
);

code = code.replace(/\}\);\s*$/, `};\n`);

// Apply specific fixes for WeightScreen and LoginScreen and App
code = code.replace(
  /width=\\{Dimensions\\.get\\("window"\\)\\.width - 50\\}/g,
  'width={width - 50}'
);

code = code.replace(
  /<View style=\{styles\.containerCenter\}>\s*<Text style=\{styles\.title\}>\s*\{mode === "login" \? "LiftAndLevel Přihlášení" : "Registrace"\}\s*<\/Text>/,
  `<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.containerCenter}>
        <Text style={styles.title}>
          {mode === "login" ? "LiftAndLevel Přihlášení" : "Registrace"}
        </Text>`
);

code = code.replace(
  /<StatusBar style="auto" \/>\s*<\/View>\s*\);\s*\}/,
  `<StatusBar style="auto" />
      </View>
    </KeyboardAvoidingView>
  );
}`
);

// App terms accepted logic
code = code.replace(
  /const \[user, setUser\] = useState\(null\);/,
  `const [user, setUser] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@terms_accepted').then(res => {
      if (res !== 'true') setTermsAccepted(false);
    });
  }, []);

  const handleAcceptTerms = async () => {
    await AsyncStorage.setItem('@terms_accepted', 'true');
    setTermsAccepted(true);
  };
`
);

code = code.replace(
  /<StatusBar style="auto" \/>\s*<\/View>\s*\);\s*\}/,
  `      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 20}}>
        <View style={{flex: 1, height: 1, backgroundColor: '#ddd'}} />
        <Text style={{marginHorizontal: 10, color: '#888'}}>nebo</Text>
        <View style={{flex: 1, height: 1, backgroundColor: '#ddd'}} />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, {backgroundColor: '#DB4437', marginTop: 0}]}
        onPress={() => Alert.alert("Google Auth", "Pro funkčnost Google přihlášení je nutné v projektu propojit Firebase nebo Google OAuth API klíče.")}
        disabled={busy}
      >
        <Text style={styles.primaryButtonText}>Přihlásit se přes Google</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
      </View>
    </KeyboardAvoidingView>
  );
}`
);

code = code.replace(
  /if \(!user\) \{/,
  `if (!termsAccepted) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TermsOfUseScreen onAccept={handleAcceptTerms} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!user) {`
);

fs.writeFileSync(appPath, code, 'utf8');
console.log('App.js correctly refactored.');
