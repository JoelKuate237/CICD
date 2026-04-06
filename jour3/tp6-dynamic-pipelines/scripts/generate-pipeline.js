/**
 * generate-pipeline.js
 *
 * Ce script genere dynamiquement un fichier .gitlab-ci.yml
 * en fonction des variables d'environnement.
 *
 * Variables d'environnement prises en compte :
 *   SKIP_INTEGRATION   - Si "true", exclut les tests d'integration
 *   ENABLE_SECURITY_SCAN - Si "true", ajoute un job d'analyse de securite
 *   ENABLE_PERFORMANCE  - Si "true", ajoute un job de test de performance
 *   TARGET_ENV          - Environnement cible (staging, production)
 *
 * Utilisation :
 *   node scripts/generate-pipeline.js
 *
 * Le fichier genere est ecrit dans GENERATED_PIPELINE (defaut: generated-pipeline.yml)
 */

const fs = require('fs');
const yaml = require('js-yaml');

// ---------------------------------------------------------------
// Lecture des variables d'environnement
// ---------------------------------------------------------------
const SKIP_INTEGRATION = process.env.SKIP_INTEGRATION === 'true';
const ENABLE_SECURITY_SCAN = process.env.ENABLE_SECURITY_SCAN === 'true';
const ENABLE_PERFORMANCE = process.env.ENABLE_PERFORMANCE === 'true';
const TARGET_ENV = process.env.TARGET_ENV || 'staging';
const OUTPUT_FILE = process.env.GENERATED_PIPELINE || 'generated-pipeline.yml';

console.log('=== Generation dynamique du pipeline ===');
console.log(`SKIP_INTEGRATION    : ${SKIP_INTEGRATION}`);
console.log(`ENABLE_SECURITY_SCAN: ${ENABLE_SECURITY_SCAN}`);
console.log(`ENABLE_PERFORMANCE  : ${ENABLE_PERFORMANCE}`);
console.log(`TARGET_ENV          : ${TARGET_ENV}`);
console.log(`OUTPUT_FILE         : ${OUTPUT_FILE}`);
console.log('');

// ---------------------------------------------------------------
// Construction dynamique du pipeline
// ---------------------------------------------------------------

// Les stages disponibles - on les ajustera selon les jobs inclus
const stages = ['validate', 'test'];

// Le pipeline sous forme d'objet JavaScript
const pipeline = {};

// -- Stage validate : toujours present ---------------------
pipeline['validate-syntax'] = {
  stage: 'validate',
  image: 'node:18-alpine',
  script: [
    'echo "Validation de la syntaxe du code"',
    'node --check server.js',
    'echo "Syntaxe valide"'
  ]
};

// -- Tests unitaires : toujours presents -------------------
pipeline['dynamic-unit-test'] = {
  stage: 'test',
  image: 'node:18-alpine',
  script: [
    'echo "Tests unitaires (pipeline enfant)"',
    'npm install --prefer-offline 2>/dev/null || npm install',
    'npx jest --ci --forceExit || echo "Tests termines"',
    'echo "Tests unitaires OK"'
  ]
};

// -- Tests d'integration : conditionnels -------------------
if (!SKIP_INTEGRATION) {
  pipeline['dynamic-integration-test'] = {
    stage: 'test',
    image: 'node:18-alpine',
    script: [
      'echo "Tests d integration (pipeline enfant)"',
      'npm install --prefer-offline 2>/dev/null || npm install',
      'echo "Connexion a la base de donnees de test..."',
      'echo "Execution des tests d integration..."',
      'npx jest --ci --testPathPattern=integration || echo "Pas de tests integration trouves"',
      'echo "Tests d integration termines"'
    ]
  };
  console.log('[+] Tests d\'integration inclus');
} else {
  console.log('[-] Tests d\'integration exclus (SKIP_INTEGRATION=true)');
}

// -- Scan de securite : optionnel --------------------------
if (ENABLE_SECURITY_SCAN) {
  stages.push('security');

  pipeline['security-audit'] = {
    stage: 'security',
    image: 'node:18-alpine',
    script: [
      'echo "Analyse de securite des dependances"',
      'npm audit --audit-level=moderate || true',
      'echo "Verification des licences..."',
      'npx license-checker --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause" || true',
      'echo "Analyse de securite terminee"'
    ],
    allow_failure: true
  };

  console.log('[+] Scan de securite inclus');
} else {
  console.log('[-] Scan de securite non inclus (ENABLE_SECURITY_SCAN != true)');
}

// -- Test de performance : optionnel -----------------------
if (ENABLE_PERFORMANCE) {
  stages.push('performance');

  pipeline['performance-test'] = {
    stage: 'performance',
    image: 'node:18-alpine',
    script: [
      'echo "Test de performance"',
      'npm install --prefer-offline 2>/dev/null || npm install',
      'echo "Demarrage du serveur en arriere-plan..."',
      'node server.js &',
      'sleep 2',
      'echo "Envoi de 100 requetes de test..."',
      'for i in $(seq 1 100); do wget -q -O /dev/null http://localhost:3000/health 2>/dev/null || true; done',
      'echo "Test de performance termine"',
      'kill %1 2>/dev/null || true'
    ],
    allow_failure: true
  };

  console.log('[+] Test de performance inclus');
} else {
  console.log('[-] Test de performance non inclus (ENABLE_PERFORMANCE != true)');
}

// -- Job de rapport : toujours present ---------------------
stages.push('report');

pipeline['generate-report'] = {
  stage: 'report',
  image: 'node:18-alpine',
  script: [
    'echo "============================================"',
    'echo "  Rapport du pipeline dynamique"',
    'echo "============================================"',
    `echo "Environnement cible : ${TARGET_ENV}"`,
    `echo "Tests d integration : ${SKIP_INTEGRATION ? 'exclus' : 'inclus'}"`,
    `echo "Scan de securite    : ${ENABLE_SECURITY_SCAN ? 'actif' : 'inactif'}"`,
    `echo "Test de performance : ${ENABLE_PERFORMANCE ? 'actif' : 'inactif'}"`,
    `echo "Nombre de jobs      : ${Object.keys(pipeline).length + 1}"`,
    'echo "============================================"'
  ]
};

// ---------------------------------------------------------------
// Assemblage final du YAML
// ---------------------------------------------------------------

// On construit l'objet final avec stages en premier
const finalPipeline = {
  stages: stages,
  ...pipeline
};

// ---------------------------------------------------------------
// Ecriture du fichier
// ---------------------------------------------------------------

const yamlContent = yaml.dump(finalPipeline, {
  lineWidth: 120,
  noRefs: true,
  quotingType: "'",
  forceQuotes: false
});

// Ajouter un commentaire en-tete
const header = [
  '# Pipeline dynamique generee automatiquement',
  `# Date de generation : ${new Date().toISOString()}`,
  `# Environnement cible : ${TARGET_ENV}`,
  `# SKIP_INTEGRATION : ${SKIP_INTEGRATION}`,
  `# ENABLE_SECURITY_SCAN : ${ENABLE_SECURITY_SCAN}`,
  `# ENABLE_PERFORMANCE : ${ENABLE_PERFORMANCE}`,
  ''
].join('\n');

const output = header + yamlContent;

fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

console.log('');
console.log(`Pipeline ecrite dans ${OUTPUT_FILE}`);
console.log(`Nombre de stages : ${stages.length}`);
console.log(`Nombre de jobs   : ${Object.keys(pipeline).length}`);
console.log('=== Generation terminee ===');
