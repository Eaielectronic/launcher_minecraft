/**
 * Gestionnaire des mods et des paramètres
 * Complète le renderer.js principal
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🧩 Initialisation du gestionnaire de mods et paramètres');
  
  // === ÉLÉMENTS DOM ===
  const elements = {
    // Onglets
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Mods
    modsRefreshBtn: document.getElementById('refresh-mods-btn'),
    modsOpenFolderBtn: document.getElementById('open-mods-folder-btn'),
    modsList: document.getElementById('installed-mods-list'),
    addModBtn: document.getElementById('add-mod-btn'),
    modSortSelect: document.getElementById('mod-sort-select'),
    categoryBtns: document.querySelectorAll('.category-btn'),
    availableModsGrid: document.getElementById('available-mods-grid'),
    paginationBtns: document.querySelectorAll('.pagination-btn'),
    modSearchInput: document.getElementById('mod-search-input'),
    modSearchBtn: document.getElementById('mod-search-btn'),
    
    // Paramètres
    gameDirectoryInput: document.getElementById('game-directory'),
    selectDirectoryBtn: document.getElementById('select-directory-btn'),
    resolutionSelect: document.getElementById('game-resolution'),
    customResolution: document.getElementById('custom-resolution'),
    widthInput: document.getElementById('width-input'),
    heightInput: document.getElementById('height-input'),
    fullscreenToggle: document.getElementById('fullscreen-toggle'),
    launcherThemeSelect: document.getElementById('launcher-theme'),
    launcherStartupToggle: document.getElementById('launcher-startup'),
    closeAfterLaunchToggle: document.getElementById('close-after-launch'),
    memorySlider: document.getElementById('memory-slider'),
    memoryValue: document.getElementById('memory-value'),
    javaPathInput: document.getElementById('java-path'),
    selectJavaBtn: document.getElementById('select-java-btn'),
    javaArgsInput: document.getElementById('java-args'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    resetSettingsBtn: document.getElementById('reset-settings-btn'),
  };
  
  // État initial
  let state = {
    mods: {
      installed: [],
      available: [],
      currentPage: 1,
      totalPages: 5,
      currentCategory: 'all',
      currentSort: 'popularity'
    },
    settings: {
      gameDirectory: '',
      resolution: 'auto',
      customWidth: 1280,
      customHeight: 720,
      fullscreen: true,
      launcherTheme: 'dark',
      launcherStartup: false,
      closeAfterLaunch: false,
      memory: 2,
      javaPath: '',
      javaArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200'
    }
  };
  
  // === GESTIONNAIRES D'ÉVÉNEMENTS ===
  
  // Gestion des onglets
  if (elements.tabBtns) {
    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        console.log(`Changement d'onglet vers: ${tabId}`);
        
        // Désactiver tous les onglets
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        
        // Activer l'onglet sélectionné
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
      });
    });
  }
  
  // === GESTION DES MODS ===
  
  // Actualiser la liste des mods
  if (elements.modsRefreshBtn) {
    elements.modsRefreshBtn.addEventListener('click', () => {
      console.log('Actualisation de la liste des mods');
      refreshInstalledMods();
    });
  }
  
  // Ouvrir le dossier des mods
  if (elements.modsOpenFolderBtn) {
    elements.modsOpenFolderBtn.addEventListener('click', () => {
      console.log('Ouverture du dossier des mods');
      if (window.launcher && window.launcher.openModsFolder) {
        window.launcher.openModsFolder();
      } else {
        alert('Fonction non disponible');
      }
    });
  }
  
  // Ajouter un mod
  if (elements.addModBtn) {
    elements.addModBtn.addEventListener('click', () => {
      console.log('Ouverture du sélecteur de fichier pour ajouter un mod');
      if (window.launcher && window.launcher.addMod) {
        window.launcher.addMod();
      } else {
        alert('Fonction non disponible');
      }
    });
  }
  
  // Trier les mods disponibles
  if (elements.modSortSelect) {
    elements.modSortSelect.addEventListener('change', (e) => {
      state.mods.currentSort = e.target.value;
      console.log(`Tri des mods par: ${state.mods.currentSort}`);
      loadAvailableMods();
    });
  }
  
  // Filtrer par catégorie
  if (elements.categoryBtns) {
    elements.categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        console.log(`Filtrage des mods par catégorie: ${category}`);
        
        state.mods.currentCategory = category;
        
        // Mettre à jour l'UI
        elements.categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        loadAvailableMods();
      });
    });
  }
  
  // Recherche de mods
  if (elements.modSearchBtn && elements.modSearchInput) {
    elements.modSearchBtn.addEventListener('click', () => {
      const query = elements.modSearchInput.value.trim();
      if (query) {
        console.log(`Recherche de mods: "${query}"`);
        searchMods(query);
      }
    });
    
    elements.modSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = elements.modSearchInput.value.trim();
        if (query) {
          console.log(`Recherche de mods: "${query}"`);
          searchMods(query);
        }
      }
    });
  }
  
  // Pagination
  if (elements.paginationBtns) {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.mods.currentPage > 1) {
          state.mods.currentPage--;
          updatePagination();
          loadAvailableMods();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (state.mods.currentPage < state.mods.totalPages) {
          state.mods.currentPage++;
          updatePagination();
          loadAvailableMods();
        }
      });
    }
  }
  
  // === GESTION DES PARAMÈTRES ===
  
  // Sélection du répertoire de jeu
  if (elements.selectDirectoryBtn) {
    elements.selectDirectoryBtn.addEventListener('click', async () => {
      console.log('Sélection du répertoire de jeu');
      if (window.launcher && window.launcher.selectDirectory) {
        const directory = await window.launcher.selectDirectory();
        if (directory) {
          elements.gameDirectoryInput.value = directory;
          state.settings.gameDirectory = directory;
        }
      } else {
        alert('Fonction non disponible');
      }
    });
  }
  
  // Gestion de la résolution
  if (elements.resolutionSelect) {
    elements.resolutionSelect.addEventListener('change', (e) => {
      const resolution = e.target.value;
      state.settings.resolution = resolution;
      
      // Afficher/masquer les champs de résolution personnalisée
      if (resolution === 'custom') {
        elements.customResolution.style.display = 'flex';
      } else {
        elements.customResolution.style.display = 'none';
      }
    });
    
    if (elements.widthInput && elements.heightInput) {
      elements.widthInput.addEventListener('change', (e) => {
        state.settings.customWidth = parseInt(e.target.value);
      });
      
      elements.heightInput.addEventListener('change', (e) => {
        state.settings.customHeight = parseInt(e.target.value);
      });
    }
  }
  
  // Mémoire allouée
  if (elements.memorySlider && elements.memoryValue) {
    elements.memorySlider.addEventListener('input', (e) => {
      const value = e.target.value;
      state.settings.memory = parseInt(value);
      elements.memoryValue.textContent = `${value} Go`;
    });
  }
  
  // Sélection du chemin Java
  if (elements.selectJavaBtn) {
    elements.selectJavaBtn.addEventListener('click', async () => {
      console.log('Sélection du chemin Java');
      if (window.launcher && window.launcher.selectJavaPath) {
        const javaPath = await window.launcher.selectJavaPath();
        if (javaPath) {
          elements.javaPathInput.value = javaPath;
          state.settings.javaPath = javaPath;
        }
      } else {
        alert('Fonction non disponible');
      }
    });
  }
  
  // Enregistrer les paramètres
  if (elements.saveSettingsBtn) {
    elements.saveSettingsBtn.addEventListener('click', () => {
      console.log('Enregistrement des paramètres');
      
      // Récupérer les valeurs des toggles
      if (elements.fullscreenToggle) {
        state.settings.fullscreen = elements.fullscreenToggle.checked;
      }
      
      if (elements.launcherStartupToggle) {
        state.settings.launcherStartup = elements.launcherStartupToggle.checked;
      }
      
      if (elements.closeAfterLaunchToggle) {
        state.settings.closeAfterLaunch = elements.closeAfterLaunchToggle.checked;
      }
      
      // Récupérer les arguments Java
      if (elements.javaArgsInput) {
        state.settings.javaArgs = elements.javaArgsInput.value;
      }
      
      // Envoyer les paramètres au main process
      if (window.launcher && window.launcher.saveSettings) {
        window.launcher.saveSettings(state.settings)
          .then(() => {
            showNotification('Paramètres enregistrés avec succès', 'success');
          })
          .catch(error => {
            console.error('Erreur lors de l\'enregistrement des paramètres:', error);
            showNotification('Erreur lors de l\'enregistrement des paramètres', 'error');
          });
      } else {
        // Simuler un enregistrement
        console.log('Paramètres à sauvegarder:', state.settings);
        showNotification('Paramètres enregistrés (mode démo)', 'success');
      }
    });
  }
  
  // Réinitialiser les paramètres
  if (elements.resetSettingsBtn) {
    elements.resetSettingsBtn.addEventListener('click', () => {
      console.log('Réinitialisation des paramètres');
      
      // Demander confirmation
      if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
        resetSettings();
      }
    });
  }
  
  // === FONCTIONS UTILITAIRES ===
  
  // Rafraîchir la liste des mods installés
  function refreshInstalledMods() {
    console.log('Chargement des mods installés');
    
    if (window.launcher && window.launcher.getInstalledMods) {
      window.launcher.getInstalledMods()
        .then(mods => {
          state.mods.installed = mods;
          renderInstalledMods();
        })
        .catch(error => {
          console.error('Erreur lors du chargement des mods:', error);
          showNotification('Erreur lors du chargement des mods', 'error');
        });
    } else {
      // Données de démo
      state.mods.installed = [
        {
          id: 'optifine',
          name: 'OptiFine',
          version: 'HD_U_I4',
          description: 'Amélioration des performances et des graphiques',
          author: 'sp614x',
          icon: './assets/images/mods/optifine.png',
          enabled: true
        },
        {
          id: 'jei',
          name: 'Just Enough Items (JEI)',
          version: '9.7.0',
          description: 'Affichage des recettes et utilisations des objets',
          author: 'mezz',
          icon: './assets/images/mods/jei.png',
          enabled: true
        }
      ];
      
      renderInstalledMods();
    }
  }
  
  // Charger les mods disponibles
  function loadAvailableMods() {
    console.log(`Chargement des mods disponibles - Page ${state.mods.currentPage}, Catégorie: ${state.mods.currentCategory}, Tri: ${state.mods.currentSort}`);
    
    if (window.launcher && window.launcher.getAvailableMods) {
      window.launcher.getAvailableMods(state.mods.currentPage, state.mods.currentCategory, state.mods.currentSort)
        .then(result => {
          state.mods.available = result.mods;
          state.mods.totalPages = result.totalPages;
          renderAvailableMods();
          updatePagination();
        })
        .catch(error => {
          console.error('Erreur lors du chargement des mods disponibles:', error);
          showNotification('Erreur lors du chargement des mods disponibles', 'error');
        });
    } else {
      // Données de démo
      state.mods.available = generateDemoMods();
      renderAvailableMods();
      updatePagination();
    }
  }
  
  // Rechercher des mods
  function searchMods(query) {
    console.log(`Recherche de mods: "${query}"`);
    
    if (window.launcher && window.launcher.searchMods) {
      window.launcher.searchMods(query)
        .then(results => {
          renderSearchResults(results);
        })
        .catch(error => {
          console.error('Erreur lors de la recherche de mods:', error);
          showNotification('Erreur lors de la recherche', 'error');
        });
    } else {
      // Données de démo
      const results = generateDemoMods().filter(mod => 
        mod.name.toLowerCase().includes(query.toLowerCase()) ||
        mod.description.toLowerCase().includes(query.toLowerCase())
      );
      
      renderSearchResults(results);
    }
  }
  
  // Charger les paramètres
  function loadSettings() {
    console.log('Chargement des paramètres');
    
    if (window.launcher && window.launcher.getSettings) {
      window.launcher.getSettings()
        .then(settings => {
          state.settings = { ...state.settings, ...settings };
          renderSettings();
        })
        .catch(error => {
          console.error('Erreur lors du chargement des paramètres:', error);
        });
    } else {
      // Utiliser les paramètres par défaut
      renderSettings();
    }
  }
  
  // Réinitialiser les paramètres
  function resetSettings() {
    console.log('Réinitialisation des paramètres');
    
    // Paramètres par défaut
    state.settings = {
      gameDirectory: '',
      resolution: 'auto',
      customWidth: 1280,
      customHeight: 720,
      fullscreen: true,
      launcherTheme: 'dark',
      launcherStartup: false,
      closeAfterLaunch: false,
      memory: 2,
      javaPath: '',
      javaArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200'
    };
    
    // Mettre à jour l'interface
    renderSettings();
    
    showNotification('Paramètres réinitialisés', 'info');
  }
  
  // === FONCTIONS DE RENDU ===
  
  // Afficher les mods installés
  function renderInstalledMods() {
    if (!elements.modsList) return;
    
    elements.modsList.innerHTML = '';
    
    if (state.mods.installed.length === 0) {
      elements.modsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-puzzle-piece"></i>
          <p>Aucun mod installé</p>
          <button id="add-first-mod-btn" class="btn-primary">
            <i class="fas fa-plus"></i> Ajouter un mod
          </button>
        </div>
      `;
      
      const addFirstModBtn = document.getElementById('add-first-mod-btn');
      if (addFirstModBtn) {
        addFirstModBtn.addEventListener('click', () => {
          if (window.launcher && window.launcher.addMod) {
            window.launcher.addMod();
          } else {
            alert('Fonction non disponible');
          }
        });
      }
      
      return;
    }
    
    state.mods.installed.forEach(mod => {
      const modElement = document.createElement('div');
      modElement.className = 'mod-item';
      modElement.innerHTML = `
        <div class="mod-icon">
          <img src="${mod.icon}" alt="${mod.name}">
        </div>
        <div class="mod-info">
          <h4 class="mod-name">${mod.name}</h4>
          <p class="mod-description">${mod.description}</p>
          <div class="mod-meta">
            <span class="mod-version">${mod.version}</span>
            <span class="mod-author">${mod.author}</span>
          </div>
        </div>
        <div class="mod-actions">
          <button class="mod-config-btn" data-mod="${mod.id}" title="Configurer">
            <i class="fas fa-cog"></i>
          </button>
          <button class="mod-${mod.enabled ? 'disable' : 'enable'}-btn" data-mod="${mod.id}" title="${mod.enabled ? 'Désactiver' : 'Activer'}">
            <i class="fas fa-toggle-${mod.enabled ? 'on' : 'off'}"></i>
          </button>
          <button class="mod-delete-btn" data-mod="${mod.id}" title="Supprimer">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;
      
      elements.modsList.appendChild(modElement);
    });
    
    // Ajouter les gestionnaires d'événements pour les boutons
    document.querySelectorAll('.mod-config-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-mod');
        console.log(`Configuration du mod: ${modId}`);
        // TODO: Implémenter la configuration des mods
      });
    });
    
    document.querySelectorAll('.mod-disable-btn, .mod-enable-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-mod');
        const isEnabled = btn.classList.contains('mod-disable-btn');
        console.log(`${isEnabled ? 'Désactivation' : 'Activation'} du mod: ${modId}`);
        
        // Mettre à jour l'état
        const modIndex = state.mods.installed.findIndex(mod => mod.id === modId);
        if (modIndex !== -1) {
          state.mods.installed[modIndex].enabled = !isEnabled;
          
          // Mettre à jour l'interface
          refreshInstalledMods();
          
          // Appeler l'API
          if (window.launcher && window.launcher.toggleMod) {
            window.launcher.toggleMod(modId, !isEnabled);
          }
        }
      });
    });
    
    document.querySelectorAll('.mod-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-mod');
        console.log(`Suppression du mod: ${modId}`);
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer le mod "${state.mods.installed.find(mod => mod.id === modId)?.name}" ?`)) {
          // Supprimer le mod
          if (window.launcher && window.launcher.deleteMod) {
            window.launcher.deleteMod(modId)
              .then(() => {
                // Mettre à jour l'état
                state.mods.installed = state.mods.installed.filter(mod => mod.id !== modId);
                
                // Mettre à jour l'interface
                refreshInstalledMods();
                
                showNotification('Mod supprimé avec succès', 'success');
              })
              .catch(error => {
                console.error('Erreur lors de la suppression du mod:', error);
                showNotification('Erreur lors de la suppression du mod', 'error');
              });
          } else {
            // Mode démo
            state.mods.installed = state.mods.installed.filter(mod => mod.id !== modId);
            refreshInstalledMods();
            showNotification('Mod supprimé avec succès (mode démo)', 'success');
          }
        }
      });
    });
  }
  
  // Afficher les mods disponibles
  function renderAvailableMods() {
    if (!elements.availableModsGrid) return;
    
    elements.availableModsGrid.innerHTML = '';
    
    if (state.mods.available.length === 0) {
      elements.availableModsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>Aucun mod disponible pour cette catégorie</p>
        </div>
      `;
      return;
    }
    
    state.mods.available.forEach(mod => {
      const modElement = document.createElement('div');
      modElement.className = 'mod-card';
      modElement.innerHTML = `
        <div class="mod-card-header">
          <img src="${mod.icon}" alt="${mod.name}" class="mod-card-icon">
          <h4 class="mod-card-name">${mod.name}</h4>
        </div>
        <div class="mod-card-body">
          <p class="mod-card-description">${mod.description}</p>
          <div class="mod-card-meta">
            <span class="mod-card-version">v${mod.version}</span>
            <span class="mod-card-downloads"><i class="fas fa-download"></i> ${mod.downloads}</span>
          </div>
        </div>
        <div class="mod-card-footer">
          <button class="mod-card-btn-install" data-mod="${mod.id}">
            <i class="fas fa-download"></i> Installer
          </button>
          <button class="mod-card-btn-info" data-mod="${mod.id}">
            <i class="fas fa-info-circle"></i>
          </button>
        </div>
      `;
      
      elements.availableModsGrid.appendChild(modElement);
    });
    
    // Ajouter les gestionnaires d'événements pour les boutons
    document.querySelectorAll('.mod-card-btn-install').forEach(btn => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-mod');
        console.log(`Installation du mod: ${modId}`);
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installation...';
        
        // Installer le mod
        if (window.launcher && window.launcher.installMod) {
          window.launcher.installMod(modId)
            .then(() => {
              showNotification('Mod installé avec succès', 'success');
              // Rafraîchir la liste des mods installés
              refreshInstalledMods();
            })
            .catch(error => {
              console.error('Erreur lors de l\'installation du mod:', error);
              showNotification('Erreur lors de l\'installation du mod', 'error');
            })
            .finally(() => {
              btn.disabled = false;
              btn.innerHTML = '<i class="fas fa-download"></i> Installer';
            });
        } else {
          // Mode démo
          setTimeout(() => {
            // Simuler l'installation
            const mod = state.mods.available.find(m => m.id === modId);
            if (mod) {
              state.mods.installed.push({
                id: mod.id,
                name: mod.name,
                version: mod.version,
                description: mod.description,
                author: mod.author || 'Auteur inconnu',
                icon: mod.icon,
                enabled: true
              });
              
              refreshInstalledMods();
              showNotification('Mod installé avec succès (mode démo)', 'success');
            }
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-download"></i> Installer';
          }, 1500);
        }
      });
    });
    
    document.querySelectorAll('.mod-card-btn-info').forEach(btn => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-mod');
        console.log(`Affichage des informations du mod: ${modId}`);
        // TODO: Implémenter l'affichage des informations détaillées
      });
    });
  }
  
  // Afficher les résultats de recherche
  function renderSearchResults(results) {
    const searchResults = document.getElementById('mod-search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>Aucun résultat trouvé</p>
        </div>
      `;
      return;
    }
    
    results.forEach(mod => {
      const modElement = document.createElement('div');
      modElement.className = 'search-result-item';
      modElement.innerHTML = `
        <div class="search-result-icon">
          <img src="${mod.icon}" alt="${mod.name}">
        </div>
        <div class="search-result-info">
          <h4 class="search-result-name">${mod.name}</h4>
          <p class="search-result-description">${mod.description}</p>
          <div class="search-result-meta">
            <span class="search-result-version">v${mod.version}</span>
            <span class="search-result-author">${mod.author || 'Auteur inconnu'}</span>
          </div>
        </div>
        <div class="search-result-actions">
          <button class="search-result-install-btn" data-mod="${mod.id}">
            <i class="fas fa-download"></i> Installer
          </button>
        </div>
      `;
      
      searchResults.appendChild(modElement);
    });
    
    // Ajouter les gestionnaires d'événements pour les boutons
    document.querySelectorAll('.search-result-install-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-mod');
        console.log(`Installation du mod depuis la recherche: ${modId}`);
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installation...';
        
        // Installer le mod
        if (window.launcher && window.launcher.installMod) {
          window.launcher.installMod(modId)
            .then(() => {
              showNotification('Mod installé avec succès', 'success');
              // Rafraîchir la liste des mods installés
              refreshInstalledMods();
            })
            .catch(error => {
              console.error('Erreur lors de l\'installation du mod:', error);
              showNotification('Erreur lors de l\'installation du mod', 'error');
            })
            .finally(() => {
              btn.disabled = false;
              btn.innerHTML = '<i class="fas fa-download"></i> Installer';
            });
        } else {
          // Mode démo
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-download"></i> Installer';
            showNotification('Mod installé avec succès (mode démo)', 'success');
          }, 1500);
        }
      });
    });
  }
  
  // Mettre à jour la pagination
  function updatePagination() {
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    if (currentPageElement) {
      currentPageElement.textContent = state.mods.currentPage;
    }
    
    if (totalPagesElement) {
      totalPagesElement.textContent = state.mods.totalPages;
    }
    
    if (prevBtn) {
      prevBtn.disabled = state.mods.currentPage <= 1;
    }
    
    if (nextBtn) {
      nextBtn.disabled = state.mods.currentPage >= state.mods.totalPages;
    }
  }
  
  // Afficher les paramètres
  function renderSettings() {
    // Répertoire du jeu
    if (elements.gameDirectoryInput) {
      elements.gameDirectoryInput.value = state.settings.gameDirectory;
    }
    
    // Résolution
    if (elements.resolutionSelect) {
      elements.resolutionSelect.value = state.settings.resolution;
      
      if (state.settings.resolution === 'custom') {
        elements.customResolution.style.display = 'flex';
      } else {
        elements.customResolution.style.display = 'none';
      }
    }
    
    if (elements.widthInput && elements.heightInput) {
      elements.widthInput.value = state.settings.customWidth;
      elements.heightInput.value = state.settings.customHeight;
    }
    
    // Plein écran
    if (elements.fullscreenToggle) {
      elements.fullscreenToggle.checked = state.settings.fullscreen;
    }
    
    // Thème du launcher
    if (elements.launcherThemeSelect) {
      elements.launcherThemeSelect.value = state.settings.launcherTheme;
    }
    
    // Lancer au démarrage
    if (elements.launcherStartupToggle) {
      elements.launcherStartupToggle.checked = state.settings.launcherStartup;
    }
    
    // Fermer après lancement
    if (elements.closeAfterLaunchToggle) {
      elements.closeAfterLaunchToggle.checked = state.settings.closeAfterLaunch;
    }
    
    // Mémoire
    if (elements.memorySlider && elements.memoryValue) {
      elements.memorySlider.value = state.settings.memory;
      elements.memoryValue.textContent = `${state.settings.memory} Go`;
    }
    
    // Chemin Java
    if (elements.javaPathInput) {
      elements.javaPathInput.value = state.settings.javaPath;
    }
    
    // Arguments Java
    if (elements.javaArgsInput) {
      elements.javaArgsInput.value = state.settings.javaArgs;
    }
  }
  
  // Afficher une notification
  function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Icône selon le type
    let icon;
    switch (type) {
      case 'success': icon = 'check-circle'; break;
      case 'error': icon = 'times-circle'; break;
      case 'warning': icon = 'exclamation-triangle'; break;
      default: icon = 'info-circle';
    }
    
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="notification-content">
        ${message}
      </div>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Ajouter la notification au conteneur (le créer s'il n'existe pas)
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Fermeture automatique après 5 secondes
    const timeout = setTimeout(() => {
      closeNotification(notification);
    }, 5000);
    
    // Fermeture manuelle
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      clearTimeout(timeout);
      closeNotification(notification);
    });
  }
  
  // Fermer une notification
  function closeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
  
  // Générer des mods de démo
  function generateDemoMods() {
    const categories = ['utility', 'performance', 'content'];
    const demoMods = [];
    
    for (let i = 1; i <= 12; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const downloads = Math.floor(Math.random() * 1000000) + 1000;
      
      demoMods.push({
        id: `mod-${i}`,
        name: `Mod Exemple ${i}`,
        version: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        description: `Description du mod exemple ${i}. Ceci est un mod de démonstration.`,
        author: `Auteur ${i}`,
        category: category,
        downloads: downloads,
        icon: `./assets/images/mods/mod${(i % 3) + 1}.png`
      });
    }
    
    return demoMods;
  }
  
  // === INITIALISATION ===
  function init() {
    console.log('Initialisation du gestionnaire de mods et paramètres');
    
    // Charger les mods installés
    refreshInstalledMods();
    
    // Charger les mods disponibles
    loadAvailableMods();
    
    // Charger les paramètres
    loadSettings();
  }
  
  // Démarrer l'initialisation
  init();
});