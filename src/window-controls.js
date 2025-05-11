/**
 * Gestion des contrôles de fenêtre et de l'interface
 */

// Utilisation d'IIFE pour éviter les conflits de noms
(function() {
  // Attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', () => {
    // Contrôles de fenêtre
    setupWindowControls();
    
    // Navigation
    setupNavigation();
    
    // Sidebar toggle
    setupSidebarToggle();
    
    // Thème
    setupThemeToggle();
  });
  
  /**
   * Configure les contrôles de la fenêtre
   */
  function setupWindowControls() {
    // Récupérer les boutons
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');
    
    // Minimiser
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        window.launcher.minimizeWindow();
      });
    }
    
    // Maximiser
    if (maxBtn) {
      maxBtn.addEventListener('click', () => {
        window.launcher.maximizeWindow();
      });
    }
    
    // Fermer
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.launcher.closeWindow();
      });
    }
  }
  
  /**
   * Configure la navigation entre les sections
   */
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Retirer la classe active de tous les liens
        navLinks.forEach(l => l.classList.remove('active'));
        
        // Ajouter la classe active au lien cliqué
        link.classList.add('active');
        
        // Récupérer l'ID de section à partir du href
        const targetId = link.getAttribute('href').substring(1) + '-section';
        
        // Masquer toutes les sections
        contentSections.forEach(section => {
          section.classList.remove('active');
        });
        
        // Afficher la section cible
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
          targetSection.classList.add('active');
        }
      });
    });
  }
  
  /**
   * Configure le toggle de la sidebar
   */
  function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mainScreen = document.getElementById('main-screen');
    
    if (sidebarToggle && mainScreen) {
      sidebarToggle.addEventListener('click', () => {
        // Basculer la classe
        mainScreen.classList.toggle('sidebar-collapsed');
        
        // Changer l'icône
        const icon = sidebarToggle.querySelector('i');
        if (icon) {
          if (mainScreen.classList.contains('sidebar-collapsed')) {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
          } else {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
          }
        }
      });
    }
  }
  
  /**
   * Configure le bouton de bascule du thème
   */
  function setupThemeToggle() {
    const themeSelect = document.getElementById('theme-select');
    
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        window.launcher.saveTheme(theme);
        
        // Le changement visuel sera géré par le renderer.js
      });
    }
  }
})();