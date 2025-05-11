/**
 * Script principal du renderer
 * Gère l'interface utilisateur du launcher Minecraft
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initialisation du launcher Minecraft');
  
  // Vérification de la disponibilité de l'API
  if (!window.launcher) {
    console.error('❌ API launcher non disponible!');
    document.body.innerHTML = '<div style="padding: 20px; color: red;">Erreur: API launcher non disponible. Veuillez redémarrer l\'application.</div>';
    return;
  }
  
  // Éléments DOM
  const elements = {
    // Sections principales
    loginScreen: document.getElementById('login-screen'),
    appContainer: document.getElementById('app-container'),
    loadingOverlay: document.getElementById('loading-overlay'),
    
    // Contrôles de fenêtre
    minimizeBtn: document.getElementById('minimize-btn'),
    maximizeBtn: document.getElementById('maximize-btn'),
    closeBtn: document.getElementById('close-btn'),
    
    // Authentification
    microsoftLoginBtn: document.getElementById('microsoft-login-btn'),
    offlineUsername: document.getElementById('offline-username'),
    offlineLoginBtn: document.getElementById('offline-login-btn'),
    
    // Profil utilisateur
    userAvatar: document.getElementById('user-avatar'),
    usernameDisplay: document.getElementById('username-display'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Navigation
    sidebarToggle: document.getElementById('sidebar-toggle'),
    navItems: document.querySelectorAll('.nav-item'),
    contentSections: document.querySelectorAll('.content-section'),
    
    // Jeu
    launchBtn: document.getElementById('launch-btn'),
    launchProgressBar: document.getElementById('launch-progress-bar'),
    launchStatus: document.getElementById('launch-status'),
    
    // Statuts
    serverStatus: document.getElementById('server-status'),
    modsStatus: document.getElementById('mods-status')
  };
  
  // Vérifier l'existence des éléments critiques
  const criticalElements = [
    'loginScreen', 'appContainer', 'microsoftLoginBtn', 
    'offlineLoginBtn', 'minimizeBtn', 'maximizeBtn', 
    'closeBtn', 'launchBtn', 'logoutBtn'
  ];
  
  const missingElements = criticalElements.filter(key => !elements[key]);
  if (missingElements.length > 0) {
    console.error('❌ Éléments critiques manquants:', missingElements);
  }
  
  // === CONTRÔLES DE FENÊTRE ===
  elements.minimizeBtn.addEventListener('click', () => {
    console.log('Minimiser la fenêtre');
    window.launcher.minimizeWindow();
  });
  
  elements.maximizeBtn.addEventListener('click', () => {
    console.log('Maximiser la fenêtre');
    window.launcher.maximizeWindow();
  });
  
  elements.closeBtn.addEventListener('click', () => {
    console.log('Fermer la fenêtre');
    window.launcher.closeWindow();
  });
  
  // === BARRE LATÉRALE ===
  elements.sidebarToggle.addEventListener('click', () => {
    console.log('Toggle sidebar');
    elements.appContainer.classList.toggle('sidebar-collapsed');
  });
  
  // === NAVIGATION ===
  elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const sectionId = item.getAttribute('data-section');
      console.log(`Navigation vers la section: ${sectionId}`);
      
      // Désactiver tous les onglets
      elements.navItems.forEach(nav => nav.classList.remove('active'));
      elements.contentSections.forEach(section => section.classList.remove('active'));
      
      // Activer l'onglet sélectionné
      item.classList.add('active');
      document.getElementById(`${sectionId}-section`).classList.add('active');
    });
  });
  
  // === AUTHENTIFICATION ===
  elements.microsoftLoginBtn.addEventListener('click', async () => {
    console.log('Tentative de connexion avec Microsoft');
    elements.microsoftLoginBtn.disabled = true;
    elements.microsoftLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion en cours...';
    showLoading();
    
    try {
      await window.launcher.loginWithMicrosoft();
      // La suite est gérée par l'événement onLoginSuccess
    } catch (error) {
      console.error('Erreur de connexion Microsoft:', error);
      elements.microsoftLoginBtn.disabled = false;
      elements.microsoftLoginBtn.innerHTML = '<i class="fab fa-microsoft"></i> Se connecter avec Microsoft';
      hideLoading();
      alert(`Erreur de connexion: ${error}`);
    }
  });
  
  elements.offlineLoginBtn.addEventListener('click', () => {
    const username = elements.offlineUsername.value.trim();
    console.log(`Tentative de connexion hors ligne avec: ${username}`);
    
    if (username.length < 3) {
      elements.offlineUsername.classList.add('error');
      setTimeout(() => elements.offlineUsername.classList.remove('error'), 500);
      return;
    }
    
    elements.offlineLoginBtn.disabled = true;
    elements.offlineLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion en cours...';
    showLoading();
    
    window.launcher.loginOffline(username);
  });
  
  elements.logoutBtn.addEventListener('click', () => {
    console.log('Déconnexion');
    window.launcher.logout();
  });
  
  // === LANCEMENT DU JEU ===
  elements.launchBtn.addEventListener('click', () => {
    console.log('Lancement du jeu');
    elements.launchBtn.disabled = true;
    elements.launchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> LANCEMENT...';
    elements.launchStatus.textContent = 'Préparation du lancement...';
    elements.launchProgressBar.style.width = '5%';
    
    window.launcher.launchGame();
  });
  
  // === ÉVÉNEMENTS DE L'API LAUNCHER ===
  // Connexion réussie
  window.launcher.onLoginSuccess((userData) => {
    console.log('Connexion réussie:', userData);
    
    // Mettre à jour l'interface utilisateur
    elements.usernameDisplay.textContent = userData.name;
    elements.userAvatar.src = `https://mc-heads.net/avatar/${userData.id}/100`;
    
    // Afficher l'application principale
    elements.loginScreen.style.display = 'none';
    elements.appContainer.style.display = 'grid';
    hideLoading();
    
    // Réinitialiser les boutons
    elements.microsoftLoginBtn.disabled = false;
    elements.microsoftLoginBtn.innerHTML = '<i class="fab fa-microsoft"></i> Se connecter avec Microsoft';
    elements.offlineLoginBtn.disabled = false;
    elements.offlineLoginBtn.innerHTML = '<i class="fas fa-user"></i> Jouer en mode hors ligne';
    
    // Vérifier les statuts
    window.launcher.checkServerStatus();
    window.launcher.checkModsStatus();
  });
  
  // Erreur de connexion
  window.launcher.onLoginError((error) => {
    console.error('Erreur de connexion:', error);
    hideLoading();
    
    // Réinitialiser les boutons
    elements.microsoftLoginBtn.disabled = false;
    elements.microsoftLoginBtn.innerHTML = '<i class="fab fa-microsoft"></i> Se connecter avec Microsoft';
    elements.offlineLoginBtn.disabled = false;
    elements.offlineLoginBtn.innerHTML = '<i class="fas fa-user"></i> Jouer en mode hors ligne';
    
    alert(`Erreur de connexion: ${error}`);
  });
  
  // Déconnexion réussie
  window.launcher.onLogoutSuccess(() => {
    console.log('Déconnexion réussie');
    elements.appContainer.style.display = 'none';
    elements.loginScreen.style.display = 'flex';
  });
  
  // Progression du lancement
  window.launcher.onLaunchProgress((data) => {
    console.log('Progression du lancement:', data);
    elements.launchProgressBar.style.width = `${data.progress}%`;
    elements.launchStatus.textContent = data.status;
  });
  
  // Lancement réussi
  window.launcher.onLaunchSuccess(() => {
    console.log('Jeu lancé avec succès');
    elements.launchBtn.disabled = false;
    elements.launchBtn.innerHTML = '<i class="fas fa-play"></i> JOUER';
    elements.launchProgressBar.style.width = '100%';
    elements.launchStatus.textContent = 'Jeu lancé avec succès!';
  });
  
  // Erreur lors du lancement
  window.launcher.onLaunchError((error) => {
    console.error('Erreur lors du lancement:', error);
    elements.launchBtn.disabled = false;
    elements.launchBtn.innerHTML = '<i class="fas fa-play"></i> JOUER';
    elements.launchStatus.textContent = `Erreur: ${error}`;
    alert(`Erreur lors du lancement: ${error}`);
  });
  
  // Statut du serveur
  window.launcher.onServerStatus((status) => {
    console.log('Statut du serveur:', status);
    
    elements.serverStatus.className = 'status';
    if (status === 'online') {
      elements.serverStatus.classList.add('online');
      elements.serverStatus.innerHTML = '<i class="fas fa-circle"></i> Serveur en ligne';
    } else {
      elements.serverStatus.classList.add('offline');
      elements.serverStatus.innerHTML = '<i class="fas fa-circle"></i> Serveur hors ligne';
    }
  });
  
  // Statut des mods
  window.launcher.onModsStatus((status) => {
    console.log('Statut des mods:', status);
    
    elements.modsStatus.className = 'status';
    switch (status) {
      case 'up-to-date':
        elements.modsStatus.classList.add('online');
        elements.modsStatus.innerHTML = '<i class="fas fa-circle"></i> Mods à jour';
        break;
      case 'outdated':
        elements.modsStatus.classList.add('warning');
        elements.modsStatus.innerHTML = '<i class="fas fa-circle"></i> Mise à jour nécessaire';
        break;
      default:
        elements.modsStatus.classList.add('offline');
        elements.modsStatus.innerHTML = '<i class="fas fa-circle"></i> Non installés';
    }
  });
  
  // === FONCTIONS UTILITAIRES ===
  function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
  }
  
  function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
  }
  
  // === INITIALISATION ===
  async function init() {
    console.log('Initialisation du launcher');
    hideLoading();
    
    try {
      const userData = await window.launcher.checkLoginStatus();
      
      if (userData) {
        console.log('Utilisateur déjà connecté:', userData);
        window.launcher.onLoginSuccess(userData);
      } else {
        console.log('Aucun utilisateur connecté');
        elements.loginScreen.style.display = 'flex';
        elements.appContainer.style.display = 'none';
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut de connexion:', error);
      elements.loginScreen.style.display = 'flex';
      elements.appContainer.style.display = 'none';
    }
  }
  
  // Démarrer l'initialisation
  init();
});