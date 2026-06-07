const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Replace NavigationContainer to support theme
code = code.replace(
  'import { NavigationContainer } from "@react-navigation/native";',
  'import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";'
);
code = code.replace(
  '<NavigationContainer>',
  '<NavigationContainer theme={activeTheme === "dark" ? DarkTheme : DefaultTheme}>'
);

// Add text and subText to styles
code = code.replace(
  'termsText: { color: colors.text, fontSize: 16, lineHeight: 24 },',
  'termsText: { color: colors.text, fontSize: 16, lineHeight: 24 },\n    text: { color: colors.text },\n    subText: { color: colors.subText },'
);

// Fix renderPRRow in AchievementsScreen
code = code.replace(
  '<Text style={{ fontSize: 16, flex: 1, fontWeight: \\'bold\\' }}>{title}</Text>',
  '<Text style={{ fontSize: 16, flex: 1, fontWeight: \\'bold\\', color: styles.text.color }}>{title}</Text>'
);
code = code.replace(
  '<Text style={{ fontSize: 16, fontWeight: \\'bold\\' }}>{weight > 0 ? `${weight} kg` : \\'-- kg\\'}</Text>',
  '<Text style={{ fontSize: 16, fontWeight: \\'bold\\', color: styles.text.color }}>{weight > 0 ? `${weight} kg` : \\'-- kg\\'}</Text>'
);
code = code.replace(/color: '#666'/g, 'color: styles.subText.color');
code = code.replace(/color: '#444'/g, 'color: styles.text.color');
code = code.replace(/color: '#888'/g, 'color: styles.subText.color');

// Fix Legend in ProgressScreen
code = code.replace(/<Text>Netrénováno<\\/Text>/g, '<Text style={styles.text}>Netrénováno</Text>');
code = code.replace(/<Text>Lehký tr/g, '<Text style={styles.text}>Lehký tr');
code = code.replace(/<Text>Střední tr/g, '<Text style={styles.text}>Střední tr');
code = code.replace(/<Text>Těžký tr/g, '<Text style={styles.text}>Těžký tr');

fs.writeFileSync('App.js', code);
console.log('Styles fixed');
