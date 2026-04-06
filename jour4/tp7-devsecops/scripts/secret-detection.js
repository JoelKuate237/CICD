/**
 * ============================================================
 * Secret Detection - Detection de secrets codes en dur
 * TP7 - DevSecOps
 *
 * Ce script parcourt tous les fichiers du projet (hors
 * node_modules, .git et fichiers binaires) pour detecter
 * des secrets potentiels : mots de passe, cles API, tokens,
 * cles privees, identifiants AWS, etc.
 *
 * Utilisation : node scripts/secret-detection.js
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------
// Patterns de secrets a detecter
// Chaque pattern a un nom, une regex et une description
// ------------------------------------------------------------
const SECRET_PATTERNS = [
  {
    name: 'Mot de passe en dur',
    pattern: /(password|passwd|pwd|mot_de_passe)\s*[:=]\s*['"][^'"]{3,}['"]/i,
    description: 'Mot de passe code en dur dans le code source'
  },
  {
    name: 'Cle API generique',
    pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    description: 'Cle API codee en dur'
  },
  {
    name: 'Token generique',
    pattern: /(token|auth[_-]?token|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    description: 'Token d\'authentification code en dur'
  },
  {
    name: 'Secret generique',
    pattern: /(secret|secret[_-]?key|app[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    description: 'Secret code en dur'
  },
  {
    name: 'Cle privee RSA/DSA/EC',
    pattern: /-----BEGIN\s+(RSA |DSA |EC )?PRIVATE KEY-----/,
    description: 'Cle privee cryptographique dans le code source'
  },
  {
    name: 'Cle AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'Cle d\'acces AWS (commence par AKIA)'
  },
  {
    name: 'Chaine de connexion avec identifiants',
    pattern: /(mongodb|postgres|mysql|redis|amqp):\/\/[^/\s]+:[^/\s]+@/i,
    description: 'Chaine de connexion contenant un utilisateur et un mot de passe'
  },
  {
    name: 'Token JWT code en dur',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    description: 'Token JWT (JSON Web Token) code en dur'
  },
  {
    name: 'Cle privee GitHub/GitLab',
    pattern: /(ghp_[A-Za-z0-9_]{36}|glpat-[A-Za-z0-9_-]{20,})/,
    description: 'Token d\'acces personnel GitHub ou GitLab'
  },
  {
    name: 'Cle Stripe',
    pattern: /(sk_live_[A-Za-z0-9]{20,}|pk_live_[A-Za-z0-9]{20,})/,
    description: 'Cle API Stripe (live)'
  },
  {
    name: 'Variable d\'environnement assignee en dur',
    pattern: /process\.env\.\w+\s*\|\|\s*['"][^'"]{8,}['"]/,
    description: 'Valeur par defaut potentiellement sensible pour une variable d\'environnement'
  }
];

// ------------------------------------------------------------
// Dossiers et fichiers a ignorer
// ------------------------------------------------------------
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.npm',
  'dist',
  'build',
  'coverage',
  '.cache'
];

const IGNORE_FILES = [
  'package-lock.json',
  'yarn.lock'
];

// Extensions de fichiers binaires a ignorer
const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.gz', '.tar', '.rar',
  '.pdf', '.doc', '.docx',
  '.exe', '.dll', '.so', '.dylib'
];

// ------------------------------------------------------------
// Fonction pour lire recursivement tous les fichiers d'un dossier
// ------------------------------------------------------------
function getAllFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) {
        continue;
      }
      files.push(...getAllFiles(fullPath));
    } else if (entry.isFile()) {
      // Ignorer les fichiers binaires
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.includes(ext)) {
        continue;
      }

      // Ignorer certains fichiers specifiques
      if (IGNORE_FILES.includes(entry.name)) {
        continue;
      }

      files.push(fullPath);
    }
  }

  return files;
}

// ------------------------------------------------------------
// Fonction pour verifier si un fichier est le script lui-meme
// (on ne veut pas detecter nos propres patterns comme des secrets)
// ------------------------------------------------------------
function isSelfScript(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.endsWith('scripts/secret-detection.js') ||
         normalized.endsWith('scripts/sast-check.js');
}

// ------------------------------------------------------------
// Fonction principale de detection
// ------------------------------------------------------------
function runSecretDetection() {
  console.log('=== Detection de Secrets ===');
  console.log('');

  const projectDir = process.cwd();
  const files = getAllFiles(projectDir);

  if (files.length === 0) {
    console.log('Aucun fichier a scanner.');
    process.exit(0);
  }

  console.log('Fichiers a scanner : ' + files.length);
  console.log('');

  const findings = [];

  for (const filePath of files) {
    // Ne pas scanner ce script lui-meme
    if (isSelfScript(filePath)) {
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      // Ignorer les fichiers qu'on ne peut pas lire
      continue;
    }

    // Ignorer les fichiers trop gros (probablement generes)
    if (content.length > 500000) {
      continue;
    }

    const lines = content.split('\n');
    const relativePath = path.relative(projectDir, filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Ignorer les commentaires de documentation
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') && trimmedLine.includes('exemple') ||
          trimmedLine.startsWith('//') && trimmedLine.includes('example')) {
        continue;
      }

      for (const secretPattern of SECRET_PATTERNS) {
        if (secretPattern.pattern.test(line)) {
          // Masquer la valeur du secret dans l'affichage
          const maskedLine = trimmedLine.substring(0, 80).replace(
            /(['"])[^'"]{4,}(['"])/g,
            '$1****$2'
          );

          findings.push({
            file: relativePath,
            line: lineNumber,
            code: maskedLine,
            type: secretPattern.name,
            description: secretPattern.description
          });
        }
      }
    }
  }

  // Afficher les resultats
  console.log('=== RESULTATS ===');
  console.log('');

  if (findings.length === 0) {
    console.log('Aucun secret detecte. Bravo !');
    console.log('');
    console.log('Rappel des bonnes pratiques :');
    console.log('  - Utilisez les variables CI/CD de GitLab pour les secrets');
    console.log('  - Utilisez process.env.MA_VARIABLE dans le code');
    console.log('  - Ajoutez .env dans .gitignore');
    console.log('');
    process.exit(0);
  }

  // Dedupliquer les resultats (un meme pattern peut matcher plusieurs regles)
  const uniqueFindings = [];
  const seen = new Set();

  for (const finding of findings) {
    const key = finding.file + ':' + finding.line + ':' + finding.type;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFindings.push(finding);
    }
  }

  for (const finding of uniqueFindings) {
    console.log('[SECRET] ' + finding.file + ':' + finding.line);
    console.log('  Type        : ' + finding.type);
    console.log('  Description : ' + finding.description);
    console.log('  Code        : ' + finding.code);
    console.log('');
  }

  // Resume
  console.log('=== RESUME ===');
  console.log('Secrets potentiels trouves : ' + uniqueFindings.length);
  console.log('');
  console.log('Actions recommandees :');
  console.log('  1. Retirez les secrets du code source');
  console.log('  2. Utilisez les variables CI/CD de GitLab (Settings > CI/CD > Variables)');
  console.log('  3. Utilisez process.env.NOM_VARIABLE dans le code');
  console.log('  4. Si un secret a ete commite, changez-le immediatement');
  console.log('     (il reste dans l\'historique Git meme apres suppression)');
  console.log('');

  // Quitter avec erreur si des secrets sont trouves
  console.log('ECHEC : Des secrets potentiels ont ete detectes.');
  process.exit(1);
}

// Lancer la detection
runSecretDetection();
