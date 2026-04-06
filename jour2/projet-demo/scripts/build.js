// ============================================================
// FICHIER : scripts/build.js
// Script de build simple : copie src/ vers dist/
// ============================================================

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

// Creer le dossier dist/ s'il n'existe pas
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copier tous les fichiers .js de src/ vers dist/
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
files.forEach(file => {
  fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
  console.log(`  Copie : src/${file} -> dist/${file}`);
});

console.log(`Build termine : ${files.length} fichier(s) copie(s) dans dist/`);
