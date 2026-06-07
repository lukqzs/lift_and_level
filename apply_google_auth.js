const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'lift_and_level-main', 'App.js');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Add imports
code = code.replace(
  'import { enableScreens } from "react-native-screens";',
  `import { enableScreens } from "react-native-screens";

import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';`
);

// 2. Add GoogleSignin config
code = code.replace(
  'enableScreens();',
  `GoogleSignin.configure({
  webClientId: '380610611330-pi56opsa4eoau8eimput3g888v1akvqo.apps.googleusercontent.com',
});

enableScreens();`
);

// 3. Add handleGoogleLogin to LoginScreen
code = code.replace(
  '  const handleSubmit = async () => {',
  `  const handleGoogleLogin = async () => {
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

  const handleSubmit = async () => {`
);

// 4. Update the Google button onPress - WAIT, it's missing in refactor.js, so we inject the whole UI block
code = code.replace(
  '      <StatusBar style="auto" />',
  `      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 20}}>
        <View style={{flex: 1, height: 1, backgroundColor: '#ddd'}} />
        <Text style={{marginHorizontal: 10, color: '#888'}}>nebo</Text>
        <View style={{flex: 1, height: 1, backgroundColor: '#ddd'}} />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, {backgroundColor: '#DB4437', marginTop: 0}]}
        onPress={handleGoogleLogin}
        disabled={busy}
      >
        <Text style={styles.primaryButtonText}>Přihlásit se přes Google</Text>
      </TouchableOpacity>

      <StatusBar style="auto" />`
);

// 5. Update handleAuth in App to handle mode === 'google'
code = code.replace(
  /const u = creds\.mode === "register"[\s\S]*?\: await login\(creds\.email, creds\.password\);/,
  `let u;
      if (creds.mode === 'google') {
        u = {
          id: creds.user.uid,
          name: creds.user.displayName || 'Google Uživatel',
          email: creds.user.email,
          token: creds.idToken,
          xp: 0,
          level: 1,
          rank: "Nováček"
        };
      } else {
        u = creds.mode === "register"
          ? await register(creds.name, creds.email, creds.password)
          : await login(creds.email, creds.password);
      }`
);

fs.writeFileSync(appPath, code, 'utf8');
console.log('Google Auth applied successfully.');
