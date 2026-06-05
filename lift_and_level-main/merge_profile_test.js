const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.js');
let code = fs.readFileSync(appPath, 'utf8');

const profileStart = `function ProfileScreen() {`;
const galleryEnd = `  );\n}\n\n// --- HLAVNÍ NAVIGACE A SPRÁVA STAVU ---`;
const galleryEndAlt = `  );\r\n}\r\n\r\n// --- HLAVNÍ NAVIGACE A SPRÁVA STAVU ---`;

const startIndex = code.indexOf(profileStart);
let endIndex = code.indexOf(galleryEnd) > -1 ? (code.indexOf(galleryEnd) + galleryEnd.length) : -1;
if (endIndex === -1 && code.indexOf(galleryEndAlt) > -1) {
  endIndex = code.indexOf(galleryEndAlt) + galleryEndAlt.length;
}

console.log("Start index: " + startIndex);
console.log("End index: " + endIndex);
