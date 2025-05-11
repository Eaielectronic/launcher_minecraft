/**
 * Gestionnaire de mises à jour du launcher
 * Vérifie si des mises à jour sont disponibles
 */

const axios = require('axios');
const { app, dialog } = require('electron');
const log = require('electron-log');
const { compare } = require('compare-versions');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// URL de l'API pour vérifier les mises à jour (à remplacer par votre propre API)
const UPDATE_CHECK_URL = 'https://api.github.com/repos/user/minecraft-launcher-pro/releases/latest';

/**
 * Vérifie si une mise à jour est disponible
 * @param {BrowserWindow} mainWindow La fenêtre principale
 */
async function checkForUpdates(mainWindow) {
  try {
    log.info('Vérification des mises à jour...');
    
    const currentVersion = app.getVersion();
    log.info(`Version actuelle: ${currentVersion}`);
    
    // Récupérer les informations sur la dernière version
    const response = await axios.get(UPDATE_CHECK_URL, {
      headers: {
        'User-Agent': `MinecraftLauncherPro/${currentVersion}`
      }
    });
    
    const latestVersion = response.data.tag_name.replace('v', '');
    log.info(`Dernière version disponible: ${latestVersion}`);
    
    // Comparer les versions
    if (compare(latestVersion, currentVersion, '>')) {
      // Une mise à jour est disponible
      log.info(`Mise à jour disponible: ${latestVersion}`);
      
      // Notifier l'utilisateur
      if (mainWindow) {
        mainWindow.webContents.send('update-available', {
          currentVersion,
          newVersion: latestVersion,
          releaseNotes: response.data.body,
          downloadUrl: response.data.html_url
        });
      }
      
      return {
        updateAvailable: true,
        currentVersion,
        newVersion: latestVersion
      };
    } else {
      // Pas de mise à jour disponible
      log.info('Aucune mise à jour disponible');
      
      if (mainWindow) {
        mainWindow.webContents.send('update-not-available');
      }
      
      return {
        updateAvailable: false,
        currentVersion
      };
    }
  } catch (error) {
    log.error('Erreur lors de la vérification des mises à jour:', error);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
    
    return {
      updateAvailable: false,
      error: error.message
    };
  }
}

module.exports = {
  checkForUpdates
};