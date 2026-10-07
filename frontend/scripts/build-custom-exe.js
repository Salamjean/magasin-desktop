import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Parser les arguments CLI (ex: node build-custom-exe.js --name="Superette Horizon" --logo="./mon-logo.png")
const args = process.argv.slice(2);
let storeName = '';
let storeLogo = '';

args.forEach((arg) => {
  if (arg.startsWith('--name=')) {
    storeName = arg.replace('--name=', '').trim();
  }
  if (arg.startsWith('--logo=')) {
    storeLogo = arg.replace('--logo=', '').trim();
  }
});

// 2. Si non spécifié dans les arguments, vérifier les fichiers de branding locaux
const brandingPaths = [
  path.join(rootDir, 'public', 'branding.json'),
  path.join(process.env.APPDATA || '', 'gestmagasin-desktop-dev', 'branding.json'),
  path.join(process.env.APPDATA || '', 'gestmagasin-desktop', 'branding.json')
];

for (const bp of brandingPaths) {
  if (!storeName && fs.existsSync(bp)) {
    try {
      const data = JSON.parse(fs.readFileSync(bp, 'utf8'));
      if (data.name) storeName = data.name;
      if (data.logo && !storeLogo) storeLogo = data.logo;
    } catch (_) {}
  }
}

// Nom par défaut si rien de trouvé
if (!storeName) {
  storeName = 'GestMagasin Pro';
}

console.log('====================================================');
console.log(`🚀 COMPILATION DE L'EXÉCUTABLE PERSONNALISÉ`);
console.log(`🏪 Nom du magasin : "${storeName}"`);
console.log('====================================================');

// 3. Gestion de l'icône / logo personnalisé
let iconPath = 'public/logo.png';

if (storeLogo) {
  try {
    if (storeLogo.startsWith('data:image')) {
      const base64Data = storeLogo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const targetIcon = path.join(rootDir, 'public', 'custom-icon.png');
      fs.writeFileSync(targetIcon, buffer);
      iconPath = 'public/custom-icon.png';
      console.log(`🖼️  Logo personnalisé extrait et configuré : ${iconPath}`);
    } else if (fs.existsSync(storeLogo)) {
      const targetIcon = path.join(rootDir, 'public', 'custom-icon.png');
      fs.copyFileSync(storeLogo, targetIcon);
      iconPath = 'public/custom-icon.png';
      console.log(`🖼️  Logo personnalisé copié depuis : ${storeLogo}`);
    }
  } catch (err) {
    console.warn('⚠️ Impossible de traiter le logo personnalisé, utilisation du logo par défaut :', err.message);
  }
}

// Nettoyage du nom de fichier
const cleanFileName = storeName
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9_-]/g, '_')
  .replace(/_+/g, '_');

// 4. Compilation du Frontend Vite & Electron
console.log('\n📦 1/2. Compilation Vite & TypeScript...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 5. Lancement d'Electron Builder avec configuration dynamique
console.log('\n🔨 2/2. Génération de l\'exécutable Windows avec electron-builder...');

// Configuration dynamique passée à electron-builder
const customConfig = {
  appId: `com.gestmagasin.${cleanFileName.toLowerCase()}`,
  productName: storeName,
  directories: {
    output: 'release'
  },
  files: ['dist/**/*', 'dist-electron/**/*'],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: iconPath,
    artifactName: `${cleanFileName}-Setup-\${version}.\${ext}`
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: storeName
  }
};

const tempConfigPath = path.join(rootDir, 'electron-builder-custom.json');
fs.writeFileSync(tempConfigPath, JSON.stringify(customConfig, null, 2), 'utf8');

try {
  execSync(`npx electron-builder --config electron-builder-custom.json --win`, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('\n✅ Exécutable généré avec succès dans le dossier : "frontend/release/" !');
} catch (err) {
  console.error('\n❌ Erreur lors de la génération de l\'exécutable :', err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempConfigPath)) {
    try {
      fs.unlinkSync(tempConfigPath);
    } catch (_) {}
  }
}
