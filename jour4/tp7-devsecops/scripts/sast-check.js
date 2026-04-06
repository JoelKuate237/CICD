/**
 * ============================================================
 * SAST Check - Analyse statique du code source
 * TP7 - DevSecOps
 *
 * Ce script parcourt les fichiers .js dans src/ et recherche
 * des patterns de code dangereux ou suspects.
 *
 * Utilisation : node scripts/sast-check.js
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------
// Configuration des patterns dangereux a detecter
// Chaque regle a un nom, un pattern (regex), un niveau de
// severite et une description du risque.
// ------------------------------------------------------------
const RULES = [
  {
    name: 'eval()',
    pattern: /\beval\s*\(/,
    severity: 'CRITICAL',
    description: 'eval() execute du code arbitraire - risque d\'injection de code'
  },
  {
    name: 'innerHTML',
    pattern: /\.innerHTML\s*=/,
    severity: 'HIGH',
    description: 'innerHTML permet des attaques XSS (Cross-Site Scripting)'
  },
  {
    name: 'document.write',
    pattern: /document\.write\s*\(/,
    severity: 'HIGH',
    description: 'document.write() peut etre exploite pour des attaques XSS'
  },
  {
    name: 'child_process exec',
    pattern: /\bexec\s*\(/,
    severity: 'CRITICAL',
    description: 'exec() execute des commandes systeme - risque d\'injection de commandes'
  },
  {
    name: 'new Function()',
    pattern: /new\s+Function\s*\(/,
    severity: 'CRITICAL',
    description: 'new Function() cree du code a partir de chaines, similaire a eval()'
  },
  {
    name: 'setTimeout/setInterval avec string',
    pattern: /set(Timeout|Interval)\s*\(\s*["'`]/,
    severity: 'MEDIUM',
    description: 'setTimeout/setInterval avec une chaine agit comme eval()'
  },
  {
    name: 'IP codee en dur',
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    severity: 'LOW',
    description: 'Adresse IP codee en dur - a remplacer par une variable d\'environnement'
  },
  {
    name: 'URL avec identifiants',
    pattern: /:\/\/[^/\s]+:[^/\s]+@/,
    severity: 'CRITICAL',
    description: 'URL contenant des identifiants en clair (user:password@host)'
  },
  {
    name: 'console.log en production',
    pattern: /console\.(log|debug|info)\s*\(/,
    severity: 'LOW',
    description: 'console.log en production peut exposer des informations sensibles'
  },
  {
    name: 'require non securise',
    pattern: /require\s*\(\s*[^'"]/,
    severity: 'MEDIUM',
    description: 'require() avec une variable peut charger du code malveillant'
  }
];

// ------------------------------------------------------------
// Fonction pour lire recursivement les fichiers .js d'un dossier
// ------------------------------------------------------------
function getJsFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    console.log('ATTENTION : Le dossier ' + dir + ' n\'existe pas.');
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Ignorer node_modules et .git
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      files.push(...getJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// ------------------------------------------------------------
// Fonction principale d'analyse
// ------------------------------------------------------------
function runSastCheck() {
  console.log('=== SAST - Analyse Statique du Code ===');
  console.log('');

  const srcDir = path.join(process.cwd(), 'src');
  const files = getJsFiles(srcDir);

  if (files.length === 0) {
    console.log('Aucun fichier .js trouve dans src/');
    console.log('Verifiez que le dossier src/ existe et contient des fichiers JavaScript.');
    process.exit(0);
  }

  console.log('Fichiers a analyser : ' + files.length);
  files.forEach(f => console.log('  - ' + path.relative(process.cwd(), f)));
  console.log('');

  const findings = [];

  // Parcourir chaque fichier
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);

    // Parcourir chaque ligne
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Ignorer les commentaires
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
        continue;
      }

      // Tester chaque regle
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          findings.push({
            file: relativePath,
            line: lineNumber,
            code: trimmedLine.substring(0, 100),
            rule: rule.name,
            severity: rule.severity,
            description: rule.description
          });
        }
      }
    }
  }

  // Afficher les resultats
  console.log('=== RESULTATS ===');
  console.log('');

  if (findings.length === 0) {
    console.log('Aucun probleme detecte. Le code est propre !');
    console.log('');
    process.exit(0);
  }

  // Trier par severite
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Compteurs par severite
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

  for (const finding of findings) {
    counts[finding.severity]++;

    const icon = finding.severity === 'CRITICAL' ? '[CRITIQUE]' :
                 finding.severity === 'HIGH' ? '[ELEVE]' :
                 finding.severity === 'MEDIUM' ? '[MOYEN]' : '[FAIBLE]';

    console.log(icon + ' ' + finding.file + ':' + finding.line);
    console.log('  Regle       : ' + finding.rule);
    console.log('  Description : ' + finding.description);
    console.log('  Code        : ' + finding.code);
    console.log('');
  }

  // Resume
  console.log('=== RESUME ===');
  console.log('Total des problemes trouves : ' + findings.length);
  console.log('  CRITIQUES : ' + counts.CRITICAL);
  console.log('  ELEVES    : ' + counts.HIGH);
  console.log('  MOYENS    : ' + counts.MEDIUM);
  console.log('  FAIBLES   : ' + counts.LOW);
  console.log('');

  // Quitter avec erreur si des problemes critiques sont trouves
  if (counts.CRITICAL > 0) {
    console.log('ECHEC : Des problemes CRITIQUES ont ete trouves.');
    console.log('Corrigez les problemes critiques avant de continuer.');
    process.exit(1);
  }

  if (counts.HIGH > 0) {
    console.log('ATTENTION : Des problemes de severite ELEVEE ont ete trouves.');
    console.log('Il est recommande de les corriger.');
    process.exit(0);
  }

  console.log('Aucun probleme critique ou eleve. Bon travail !');
  process.exit(0);
}

// Lancer l'analyse
runSastCheck();
