/**
 * Script de préchargement (Preload)
 * Crée une interface sécurisée entre le processus de rendu et le processus principal
 */

const { contextBridge, ipcRenderer } = require('electron');

// Ajouter des logs pour déboguer
console.log('Preload script is running...');

// Exposer des fonctionnalités sécurisées au processus de rendu
let isLoggingIn = false;

contextBridge.exposeInMainWorld('launcher', {
  // Gestion des fenêtres
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Authentification
  loginWithMicrosoft: async () => {
    if (isLoggingIn) {
      console.log('Une tentative de connexion est déjà en cours...');
      return;
    }
    
    isLoggingIn = true;
    
    try {
      console.log('loginWithMicrosoft appelé depuis preload.js');
      const result = await ipcRenderer.invoke('auth:microsoft-login');
      isLoggingIn = false;
      return result;
    } catch (error) {
      isLoggingIn = false;
      throw error;
    }
  },
  loginOffline: (username) => ipcRenderer.send('login-offline', username),
  logout: () => ipcRenderer.send('logout'),
  checkLoginStatus: () => ipcRenderer.invoke('check-login-status'),
  
  // Jeu
  launchGame: () => ipcRenderer.send('launch-game'),
  checkServerStatus: () => ipcRenderer.send('check-server-status'),
  checkModsStatus: () => ipcRenderer.send('check-mods-status'),
  
  // Préférences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  saveTheme: (theme) => ipcRenderer.send('save-theme', theme),
  saveMaxMemory: (memory) => ipcRenderer.send('save-max-memory', memory),
  saveDirectory: (dir) => ipcRenderer.send('save-launcher-directory', dir),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Événements à écouter
  onLoginSuccess: (callback) => {
    console.log('Enregistrement du gestionnaire onLoginSuccess dans preload');
    
    ipcRenderer.on('login-success', (event, userData) => {
      console.log('🔵 Événement login-success reçu dans preload avec données:', userData);
      
      // Exécuter le callback
      callback(userData);
      
      // Forcer l'affichage de l'écran principal après un court délai
      setTimeout(() => {
        // Créer un événement personnalisé pour forcer l'affichage
        document.dispatchEvent(new CustomEvent('force-display-main', {
          detail: userData
        }));
      }, 300);
    });
  },
  onLoginError: (callback) => {
    ipcRenderer.on('login-error', (_, error) => callback(error));
  },
  onLogoutSuccess: (callback) => {
    ipcRenderer.on('logout-success', () => callback());
  },
  onLaunchProgress: (callback) => {
    ipcRenderer.on('launch-progress', (_, data) => callback(data));
  },
  onLaunchSuccess: (callback) => {
    ipcRenderer.on('launch-success', () => callback());
  },
  onLaunchError: (callback) => {
    ipcRenderer.on('launch-error', (_, error) => callback(error));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_, data) => callback(data));
  },
  onServerStatus: (callback) => {
    ipcRenderer.on('server-status', (_, status) => callback(status));
  },
  onModsStatus: (callback) => {
    ipcRenderer.on('mods-status', (_, status) => callback(status));
  },
  onServerMaintenanceWarning: (callback) => {
    ipcRenderer.on('server-maintenance-warning', () => callback());
  },
  
  // Fonctions pour mettre à jour l'UI
  updateServerStatus: (status) => {
    // Cette fonction sera implémentée dans renderer.js
  },
  updateModsStatus: (status) => {
    // Cette fonction sera implémentée dans renderer.js
  },
  updateLaunchProgress: (status, progress) => {
    // Cette fonction sera implémentée dans renderer.js
  },
  updateDownloadProgress: (type, progress) => {
    // Cette fonction sera implémentée dans renderer.js
  }
});

console.log('API launcher exposée:', Object.keys(contextBridge.exposeInMainWorld).length > 0);

// Simplification du renderer.js pour éviter les conflits

console.log('Chargement du script renderer simplifié');

// Ajouter un écouteur pour l'événement personnalisé 'force-display-main'
document.addEventListener('force-display-main', (event) => {
  console.log('⚡ Événement force-display-main capturé avec les données:', event.detail);
  showHomeScreen(event.detail);
});

// Améliorer la fonction showHomeScreen
function showHomeScreen(userData) {
  console.log('🏠 Tentative d\'affichage de l\'écran d\'accueil pour:', userData.name);
  
  // S'assurer que userData est valide
  if (!userData || !userData.name) {
    console.error('❌ Données utilisateur invalides:', userData);
    return;
  }
  
  // Attendre que le DOM soit complètement chargé
  if (document.readyState !== 'complete') {
    console.log('⏳ DOM pas encore complètement chargé, nouvelle tentative dans 500ms');
    setTimeout(() => showHomeScreen(userData), 500);
    return;
  }
  
  // Masquer tous les écrans de connexion
  document.querySelectorAll('[id*="login"], .login, #login-screen, .login-container').forEach(el => {
    el.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
    console.log('🔒 Écran de connexion masqué:', el.id || el.className || 'élément sans id');
  });
  
  // Trouver l'écran d'accueil (essayer plusieurs ID et classes possibles)
  const homeScreen = document.getElementById('home-screen') || 
                     document.getElementById('main-screen') ||
                     document.querySelector('.home-container') ||
                     document.querySelector('.main-container');
  
  if (homeScreen) {
    // Forcer l'affichage avec !important et vérifier que les styles sont appliqués
    homeScreen.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 9999 !important;';
    
    // Vérifier que les styles ont bien été appliqués
    const computedStyle = window.getComputedStyle(homeScreen);
    console.log('✅ Styles appliqués à l\'écran d\'accueil:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex
    });
    
    // Mise à jour des informations utilisateur avec plus de robustesse
    updateUserInfo(userData);
    
    // Animer les éléments d'interface
    animateHomeElements();
  } else {
    console.error('❌ ERREUR CRITIQUE: Écran d\'accueil non trouvé dans le DOM!');
    debugDOM();
  }
}

// Fonction pour mettre à jour les informations utilisateur
function updateUserInfo(userData) {
  // Essayer plusieurs sélecteurs possibles pour le nom d'utilisateur
  const usernameDisplays = [
    document.getElementById('username-display'),
    document.querySelector('.username'),
    document.querySelector('[data-username]')
  ].filter(Boolean);
  
  if (usernameDisplays.length > 0) {
    usernameDisplays.forEach(el => {
      el.textContent = userData.name;
      console.log('👤 Nom d\'utilisateur mis à jour dans:', el.id || el.className);
    });
  } else {
    console.error('❌ Aucun élément pour afficher le nom d\'utilisateur trouvé');
  }
  
  // Essayer plusieurs sélecteurs possibles pour l'avatar
  const avatarElements = [
    document.getElementById('user-avatar'),
    document.getElementById('avatar-display'),
    document.querySelector('.avatar'),
    document.querySelector('[data-avatar]')
  ].filter(Boolean);
  
  if (avatarElements.length > 0) {
    avatarElements.forEach(el => {
      el.src = `https://mc-heads.net/avatar/${userData.id}/100`;
      el.alt = `Avatar de ${userData.name}`;
      console.log('🖼️ Avatar mis à jour dans:', el.id || el.className);
    });
  } else {
    console.error('❌ Aucun élément pour afficher l\'avatar trouvé');
  }
}

// Fonction pour animer les éléments de la page d'accueil
function animateHomeElements() {
  setTimeout(() => {
    const elements = document.querySelectorAll('.home-element, .main-element');
    console.log(`🎬 Animation de ${elements.length} éléments`);
    
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('visible');
      }, index * 100);
    });
  }, 300);
}

// Fonction pour déboguer le DOM
function debugDOM() {
  console.log('🔍 Débogage du DOM:');
  console.log('- Document readyState:', document.readyState);
  
  // Lister tous les IDs
  const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
  console.log('- IDs disponibles:', allIds);
  
  // Lister toutes les classes
  const allClasses = Array.from(document.querySelectorAll('[class]'))
    .map(el => Array.from(el.classList))
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i);
  console.log('- Classes disponibles:', allClasses);
}

// Initialisation après le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé dans renderer simplifié');
  
  // Vérifier si l'utilisateur est déjà connecté
  if (window.launcher?.checkLoginStatus) {
    window.launcher.checkLoginStatus()
      .then(userData => {
        if (userData) {
          console.log('Utilisateur déjà connecté:', userData);
          showHomeScreen(userData);
        } else {
          console.log('Aucun utilisateur connecté');
        }
      })
      .catch(err => console.error('Erreur lors de la vérification du statut de connexion:', err));
  }
  
  // Installer l'écouteur d'événement de connexion avec plus de robustesse
  if (window.launcher) {
    window.launcher.onLoginSuccess(userData => {
      console.log('Événement login-success reçu avec les données:', userData);
      if (userData) {
        showHomeScreen(userData);
      } else {
        console.error('Données utilisateur manquantes dans l\'événement login-success');
      }
    });
  } else {
    console.error('window.launcher n\'est pas disponible!');
  }
  
  // Installer les écouteurs d'événement
  if (window.launcher) {
    window.launcher.onLogoutSuccess(() => {
      console.log('Événement logout-success reçu');
      const homeScreen = document.getElementById('home-screen') || 
                         document.getElementById('main-screen');
      if (homeScreen) homeScreen.style.display = 'none';
      
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.style.display = 'flex';
    });
    
    // Installer les gestionnaires de bouton
    const launchBtn = document.getElementById('launch-btn');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        launchBtn.textContent = 'LANCEMENT EN COURS...';
        launchBtn.disabled = true;
        window.launcher.launchGame();
      });
    }
  }
});