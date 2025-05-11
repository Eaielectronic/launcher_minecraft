/**
 * Processus principal d'Electron
 * Point d'entrée de l'application
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const log = require('electron-log');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Modules internes
const ProfileManager = require('./src/auth/profile-manager');
const MicrosoftAuth = require('./src/auth/microsoft-auth');
const ModManager = require('./src/core/mod-manager');
const Downloader = require('./src/core/downloader');
const GameLauncher = require('./src/core/launcher');
const ConfigManager = require('./src/utils/config-manager');

// Configuration du logger
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.catchErrors();

// Configuration de la persistance
const store = new Store();

// Variables globales
let mainWindow = null;
let splashWindow = null;
let profileManager = null;
let microsoftAuth = null;
let modManager = null;
let downloader = null;
let gameLauncher = null;
let configManager = null;

// Initialisation des dossiers
const initFolders = async () => {
  const userDataPath = app.getPath('userData');
  await fs.ensureDir(path.join(userDataPath, 'logs'));
  await fs.ensureDir(path.join(userDataPath, 'profiles'));
  await fs.ensureDir(path.join(userDataPath, 'instances'));
  await fs.ensureDir(path.join(userDataPath, 'cache'));
};

// Initialisation des modules
const initModules = () => {
  const userDataPath = app.getPath('userData');
  configManager = new ConfigManager(userDataPath);
  profileManager = new ProfileManager(path.join(userDataPath, 'profiles'));
  microsoftAuth = new MicrosoftAuth();
  modManager = new ModManager(userDataPath, configManager.getModsConfig());
  downloader = new Downloader(userDataPath, configManager.getDownloadConfig());
  gameLauncher = new GameLauncher(userDataPath, configManager.getLauncherConfig());
};

// Création de la fenêtre de démarrage
const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  splashWindow.loadFile(path.join(__dirname, 'src/splash.html'));
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
};

// Création de la fenêtre principale
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js') // Assurez-vous que ce chemin est correct
    }
  });
  
  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));
  mainWindow.webContents.openDevTools();
  // Ouvrir DevTools si en développement
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
  });
};

// Initialisation de l'application
app.whenReady().then(async () => {
  try {
    log.info('Démarrage de l\'application...');
    await initFolders();
    initModules();
    
    createSplashWindow();
    
    // Attendre que les configurations soient chargées
    await configManager.loadConfig();
    
    // Vérifier l'état des mods
    await modManager.checkModsStatus();
    
    // Configurer les gestionnaires IPC
    setupIpcHandlers();
    
    // Créer la fenêtre principale
    setTimeout(createMainWindow, 1500); // Afficher le splash durant 1.5 secondes
    
  } catch (error) {
    log.error('Erreur lors de l\'initialisation:', error);
    dialog.showErrorBox('Erreur au démarrage', 
      `Une erreur s'est produite lors du démarrage de l'application: ${error.message}`);
    app.quit();
  }
});

// Gestion des événements de l'application
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Configuration des gestionnaires IPC
const setupIpcHandlers = () => {
  // Contrôles de la fenêtre
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  // Gestion des préférences
  ipcMain.handle('get-preferences', async () => {
    return {
      theme: store.get('theme', 'dark'),
      launcherDirectory: store.get('launcherDirectory', path.join(os.homedir(), '.minecraft')),
      maxMemory: store.get('maxMemory', 2048)
    };
  });
  
  ipcMain.on('save-theme', (event, theme) => {
    store.set('theme', theme);
  });
  
  ipcMain.on('save-launcher-directory', (event, directory) => {
    store.set('launcherDirectory', directory);
  });
  
  ipcMain.on('save-max-memory', (event, memory) => {
    store.set('maxMemory', memory);
  });
  
  // Authentification
  ipcMain.on('login-microsoft', async () => {
    try {
      log.info('Tentative de connexion Microsoft avec OAuth');
      
      // Authentifier avec Microsoft
      const authResult = await microsoftAuth.login();
      
      if (authResult && authResult.accessToken) {
        // Obtenir le profil complet
        const profile = await microsoftAuth.getFullProfile(authResult);
        
        // Enregistrer le profil
        await profileManager.saveProfile(profile);
        
        // Notifier le renderer
        mainWindow.webContents.send('login-success', profile);
      } else {
        throw new Error('Authentification Microsoft échouée: pas de token d\'accès');
      }
    } catch (error) {
      log.error('Erreur d\'authentification:', error);
      mainWindow.webContents.send('login-error', error.message);
    }
  });
  
  ipcMain.on('login-offline', async (event, username) => {
    try {
      // Créer un profil hors ligne
      const offlineProfile = {
        id: uuidv4(),
        username: username,
        isOffline: true,
        createdAt: new Date().toISOString()
      };
      
      // Enregistrer le profil
      await profileManager.saveProfile(offlineProfile);
      
      // Notifier le renderer
      mainWindow.webContents.send('login-success', offlineProfile);
      
    } catch (error) {
      log.error('Erreur de connexion hors ligne:', error);
      mainWindow.webContents.send('login-error', error.message);
    }
  });
  
  ipcMain.on('logout', async () => {
    try {
      const currentProfile = await profileManager.getCurrentProfile();
      if (currentProfile && !currentProfile.isOffline) {
        await microsoftAuth.logout(currentProfile);
      }
      
      await profileManager.clearCurrentProfile();
      mainWindow.webContents.send('logout-success');
      
    } catch (error) {
      log.error('Erreur de déconnexion:', error);
      mainWindow.webContents.send('logout-error', error.message);
    }
  });
  
  ipcMain.handle('check-login-status', async () => {
    try {
      log.info('Vérification du statut de connexion');
      
      // Vérifier s'il y a un profil actif
      const currentProfile = await profileManager.getCurrentProfile();
      
      if (currentProfile) {
        log.info('Profil actif trouvé:', currentProfile.username);
        
        return {
          id: currentProfile.id,
          name: currentProfile.username,
          type: currentProfile.type || 'microsoft'
        };
      } else {
        log.info('Aucun profil actif trouvé');
        return null;
      }
    } catch (error) {
      log.error('Erreur lors de la vérification du statut de connexion:', error);
      return null;
    }
  });
  
  // Vérification du serveur
  ipcMain.on('check-server-status', async () => {
    try {
      const serverConfig = configManager.getServerConfig();
      const isOnline = await gameLauncher.checkServerStatus(serverConfig.host, serverConfig.port);
      
      // Enregistrer l'état dans le store pour pouvoir y accéder plus tard
      store.set('serverStatus', isOnline ? 'online' : 'offline');
      
      mainWindow.webContents.send('server-status', isOnline ? 'online' : 'offline');
    } catch (error) {
      log.error('Erreur lors de la vérification du statut du serveur:', error);
      store.set('serverStatus', 'offline');
      mainWindow.webContents.send('server-status', 'offline');
    }
  });
  
  // Vérification des mods
  ipcMain.on('check-mods-status', async () => {
    try {
      const status = await modManager.checkModsStatus();
      mainWindow.webContents.send('mods-status', status);
    } catch (error) {
      log.error('Erreur lors de la vérification des mods:', error);
      mainWindow.webContents.send('mods-status', 'unknown');
    }
  });
  
  // Lancement du jeu
  ipcMain.on('launch-game', async () => {
    try {
      // Vérifier si le serveur est en ligne
      const serverStatus = store.get('serverStatus', 'unknown');
      
      if (serverStatus === 'offline') {
        // Envoyer un avertissement au renderer mais continuer quand même
        mainWindow.webContents.send('server-maintenance-warning');
      }
      
      // Obtenir le profil actuel
      const currentProfile = await profileManager.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('Aucun profil connecté');
      }
      
      // Vérifier les mods et les télécharger si nécessaire
      mainWindow.webContents.send('launch-progress', { status: 'Vérification des mods...', progress: 10 });
      
      const modsStatus = await modManager.checkModsStatus();
      if (modsStatus === 'outdated') {
        mainWindow.webContents.send('launch-progress', { status: 'Téléchargement des mods...', progress: 20 });
        
        // Installer ou mettre à jour les mods
        await modManager.installMods(
          (type, progress) => {
            mainWindow.webContents.send('download-progress', { type, progress });
          }
        );
      }
      
      // Vérifier si Forge est installé
      mainWindow.webContents.send('launch-progress', { status: 'Vérification de Forge...', progress: 40 });
      
      const forgeInstalled = await downloader.checkForgeInstalled();
      if (!forgeInstalled) {
        mainWindow.webContents.send('launch-progress', { status: 'Installation de Forge...', progress: 50 });
        
        // Télécharger et installer Forge
        await downloader.downloadAndInstallForge(
          (progress) => {
            mainWindow.webContents.send('download-progress', { type: 'Forge', progress });
          }
        );
      }
      
      // Configurer les options de lancement
      mainWindow.webContents.send('launch-progress', { status: 'Préparation du lancement...', progress: 70 });
      
      const launchOptions = {
        profile: currentProfile,
        memory: store.get('maxMemory', 2048),
        server: configManager.getServerConfig(),
        gameDir: store.get('launcherDirectory', path.join(os.homedir(), '.minecraft'))
      };
      
      // Lancer le jeu
      mainWindow.webContents.send('launch-progress', { status: 'Lancement du jeu...', progress: 90 });
      
      await gameLauncher.launchGame(launchOptions,
        (data) => {
          log.info('Game output:', data);
        },
        (error) => {
          log.error('Game error:', error);
        }
      );
      
      mainWindow.webContents.send('launch-progress', { status: 'Jeu démarré !', progress: 100 });
      mainWindow.webContents.send('launch-success');
      
    } catch (error) {
      log.error('Erreur lors du lancement du jeu:', error);
      mainWindow.webContents.send('launch-error', error.message);
    }
  });
  
  // Ouverture de liens externes
  ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
  });
  
  // Sélection de dossier
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Ajoutez ce gestionnaire IPC pour le login Microsoft
  ipcMain.handle('auth:microsoft-login', async (event) => {
    try {
      log.info('---------------------------------------------');
      log.info('DÉMARRAGE DE L\'AUTHENTIFICATION MICROSOFT');
      log.info('---------------------------------------------');
      
      // Appeler la méthode login de votre classe MicrosoftAuth
      log.info('Étape 1: Demande du code OAuth et du token Microsoft');
      const tokenResponse = await microsoftAuth.login();
      log.info('Token Microsoft obtenu avec succès!');
      
      // Obtenir le token Xbox
      log.info('Étape 2: Obtention du token Xbox Live');
      const xboxResponse = await microsoftAuth.getXboxToken(tokenResponse.accessToken);
      log.info('Token Xbox obtenu avec succès, UserHash:', xboxResponse.DisplayClaims.xui[0].uhs);
      
      // Obtenir le token XSTS
      log.info('Étape 3: Obtention du token XSTS');
      const xstsResponse = await microsoftAuth.getXSTSToken(xboxResponse);
      log.info('Token XSTS obtenu avec succès, maintenant on passe à Minecraft');
      
      // Obtenir le token Minecraft
      log.info('Étape 4: Échange du token XSTS contre un token Minecraft');
      const minecraftToken = await microsoftAuth.getMinecraftToken(xstsResponse, xboxResponse.DisplayClaims.xui[0].uhs);
      log.info('Token Minecraft obtenu avec succès, expiration:', minecraftToken.expires_in, 'secondes');
      
      // Vérifier que l'utilisateur possède le jeu
      log.info('Étape 5: Vérification de la possession du jeu');
      const hasGame = await microsoftAuth.checkGameOwnership(minecraftToken.access_token);
      log.info('Résultat de la vérification de possession:', hasGame ? 'POSSÈDE LE JEU' : 'NE POSSÈDE PAS LE JEU');
      
      if (!hasGame) {
        throw new Error('Ce compte Microsoft ne possède pas Minecraft Java Edition');
      }
      
      // Obtenir le profil Minecraft (nom et UUID)
      log.info('Étape 6: Récupération du profil Minecraft');
      const profile = await microsoftAuth.getProfile(minecraftToken.access_token);
      
      // Afficher clairement les informations du profil
      log.info('======= PROFIL MINECRAFT OBTENU =======');
      log.info('UUID:', profile.id);
      log.info('NOM D\'UTILISATEUR:', profile.name);
      log.info('=======================================');
      
      // Préparer les données utilisateur pour le gestionnaire de profils
      const userData = {
        id: profile.id,
        username: profile.name,  // Utilisez username au lieu de name pour correspondre au ProfileManager
        type: 'microsoft',
        accessToken: minecraftToken.access_token,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: Date.now() + minecraftToken.expires_in * 1000
      };
      
      log.info('Étape 7: Enregistrement du profil dans le gestionnaire');
      try {
        // Utilisez saveProfile au lieu de saveUser
        const savedProfile = await profileManager.saveProfile(userData);
        log.info('Profil enregistré avec succès:', savedProfile.username);
      } catch (profileError) {
        log.error('ERREUR lors de l\'enregistrement du profil:', profileError);
        throw profileError;
      }
      
      // Informer le renderer du succès de la connexion
      log.info('Étape 8: Notification du renderer du succès de la connexion');
      
      // Vérifier que la fenêtre principale existe et est prête
      if (!mainWindow || mainWindow.isDestroyed()) {
        log.error('Fenêtre principale non disponible pour envoyer login-success');
        throw new Error('Fenêtre principale non disponible');
      }
      
      // Envoi explicite de l'événement avec des données complètes
      mainWindow.webContents.send('login-success', {
        id: userData.id,
        name: userData.username,
        type: 'microsoft'
      });
      
      // Ajouter un log de confirmation
      log.info(`Événement login-success envoyé pour ${userData.username}`);
      
      log.info('---------------------------------------------');
      log.info('AUTHENTIFICATION MICROSOFT RÉUSSIE!');
      log.info('---------------------------------------------');
      
      return {
        success: true,
        user: {
          id: userData.id,
          name: userData.username,
          type: 'microsoft'
        }
      };
    } catch (error) {
      log.error('---------------------------------------------');
      log.error('ÉCHEC DE L\'AUTHENTIFICATION MICROSOFT');
      log.error('Message d\'erreur:', error.message);
      log.error('Stack trace:', error.stack);
      log.error('---------------------------------------------');
      
      // Informer le renderer de l'échec de la connexion
      try {
        mainWindow.webContents.send('login-error', error.message);
      } catch (notificationError) {
        log.error('Erreur lors de la notification d\'échec:', notificationError);
      }
      
      throw error;
    }
  });
};