// Ajoutez ce code au début de votre fichier

// Fonction pour afficher l'écran d'accueil après connexion
function showHomeScreen(userData) {
  console.log('Affichage de l\'écran d\'accueil pour:', userData.name);

  // Masquer l'écran de connexion (vérifier tous les ID possibles)
  const loginElements = ['login-screen', 'login-container', 'login-box'];
  loginElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      console.log(`Masquage de l'élément ${id}`);
      element.style.display = 'none';
    }
  });
  
  // Afficher l'écran d'accueil
  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) {
    console.log('Affichage de l\'écran d\'accueil');
    homeScreen.style.display = 'flex';
    
    // Mettre à jour le nom d'utilisateur
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
      usernameDisplay.textContent = userData.name;
    } else {
      console.error('Élément username-display non trouvé');
    }
    
    // Mettre à jour l'avatar
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
      const avatarUrl = `https://mc-heads.net/avatar/${userData.id}/100`;
      console.log('Chargement de l\'avatar:', avatarUrl);
      userAvatar.src = avatarUrl;
    } else {
      console.error('Élément user-avatar non trouvé');
    }
    
    // Animer l'apparition des éléments
    setTimeout(() => {
      document.querySelectorAll('.home-element').forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('visible');
        }, index * 100);
      });
    }, 300);
  } else {
    console.error('Écran d\'accueil non trouvé dans le DOM');
    // Afficher une alerte pour le déboguer
    alert('Erreur: Écran d\'accueil non trouvé');
  }
}

// Fonction à exécuter quand le DOM est prêt
function initUI() {
  console.log('Initialisation de l\'interface...');

  // Enregistrer explicitement le gestionnaire d'événement de connexion
  window.launcher.onLoginSuccess((userData) => {
    console.log('🟢 ÉVÉNEMENT LOGIN-SUCCESS REÇU DANS RENDERER');
    console.log('Données utilisateur:', userData);
    
    // Forcer le style display à flex pour main-screen (au lieu de home-screen)
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen) {
      console.log('Écran principal trouvé, définition du style à flex');
      mainScreen.style.display = 'flex';
      
      // Masquer l'écran de connexion
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) {
        loginScreen.style.display = 'none';
      }
      
      // Mettre à jour le nom d'utilisateur 
      const usernameDisplay = document.getElementById('username-display');
      if (usernameDisplay) {
        usernameDisplay.textContent = userData.name;
      }
      
      // Mettre à jour l'avatar
      const avatarDisplay = document.getElementById('avatar-display');
      if (avatarDisplay) {
        avatarDisplay.src = `https://mc-heads.net/avatar/${userData.id}/100`;
      }
      
      // Mettre à jour l'UUID
      const uuidDisplay = document.getElementById('uuid-display');
      if (uuidDisplay) {
        uuidDisplay.textContent = `UUID: ${userData.id}`;
      }
      
      console.log('Écran principal affiché avec succès');
    } else {
      console.error('❌ ERREUR: Élément main-screen non trouvé!');
    }
  });
  
  console.log('Gestionnaire onLoginSuccess enregistré');
}

// Exécuter quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}

// Ajoutez ce code pour la navigation et la gestion des événements

// Gestionnaire d'événements DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé, initialisation de l\'interface');
  
  // Navigation entre les écrans
  const navButtons = document.querySelectorAll('.nav-btn');
  if (navButtons.length > 0) {
    console.log(`${navButtons.length} boutons de navigation trouvés`);
    
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        console.log('Bouton de navigation cliqué:', button.textContent);
        
        // Si c'est le bouton déconnexion
        if (button.id === 'logout-btn') {
          console.log('Déconnexion demandée');
          window.launcher.logout();
          return;
        }
        
        // Activer le bouton cliqué
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Afficher l'écran correspondant
        const targetScreen = button.getAttribute('data-screen');
        console.log('Changement vers l\'écran:', targetScreen);
        
        document.querySelectorAll('.content-screen').forEach(screen => {
          screen.classList.remove('active');
        });
        
        const screenToShow = document.getElementById(`${targetScreen}-screen`);
        if (screenToShow) {
          screenToShow.classList.add('active');
        } else {
          console.error(`Écran ${targetScreen}-screen non trouvé`);
        }
      });
    });
  } else {
    console.warn('Aucun bouton de navigation trouvé');
  }
  
  // Bouton de lancement du jeu
  const launchButton = document.getElementById('launch-btn');
  if (launchButton) {
    console.log('Bouton de lancement trouvé');
    launchButton.addEventListener('click', () => {
      console.log('Demande de lancement du jeu');
      launchButton.textContent = 'LANCEMENT EN COURS...';
      launchButton.disabled = true;
      
      window.launcher.launchGame();
    });
  } else {
    console.warn('Bouton de lancement non trouvé');
  }
  
  // Vérifier le statut d'authentification au démarrage
  console.log('Vérification du statut d\'authentification au démarrage');
  window.launcher.checkLoginStatus()
    .then(userData => {
      if (userData) {
        console.log('Utilisateur déjà connecté:', userData.name);
        showHomeScreen(userData);
      } else {
        console.log('Aucun utilisateur connecté au démarrage');
      }
    })
    .catch(err => {
      console.error('Erreur lors de la vérification du statut:', err);
    });
});

// Écouter les événements de lancement
window.launcher.onLaunchProgress((status, progress) => {
  console.log(`Progression du lancement: ${status} (${progress}%)`);
  const launchButton = document.getElementById('launch-btn');
  if (launchButton) {
    launchButton.textContent = `${status} (${Math.round(progress)}%)`;
  }
});

window.launcher.onLaunchSuccess(() => {
  console.log('Jeu lancé avec succès');
  const launchButton = document.getElementById('launch-btn');
  if (launchButton) {
    launchButton.textContent = 'JEU LANCÉ';
    setTimeout(() => {
      launchButton.textContent = 'JOUER MAINTENANT';
      launchButton.disabled = false;
    }, 3000);
  }
});

// Ajouter un gestionnaire pour la déconnexion
window.launcher.onLogoutSuccess(() => {
  console.log('Déconnexion réussie');
  
  // Masquer la page d'accueil
  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) homeScreen.style.display = 'none';
  
  // Afficher l'écran de connexion
  const loginElements = ['login-screen', 'login-container', 'login-box'];
  loginElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'flex';
    }
  });
});