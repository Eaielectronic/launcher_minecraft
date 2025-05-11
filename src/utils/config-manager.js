/**
 * Gestionnaire de configuration
 * Gère les paramètres et la configuration du launcher
 */

const fs = require('fs-extra');
const path = require('path');
const log = require('electron-log');

class ConfigManager {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.configPath = path.join(userDataPath, 'config');
    this.launcherConfigPath = path.join(this.configPath, 'launcher-config.json');
    this.modsConfigPath = path.join(this.configPath, 'mods-config.json');
    this.authConfigPath = path.join(this.configPath, 'auth-config.json');
    this.downloadConfigPath = path.join(this.configPath, 'download-config.json');
    
    // Configuration par défaut
    this.defaultConfig = {
      launcher: {
        version: '1.0.0',
        gameVersion: '1.20.1',
        forgeVersion: '47.2.0',
        memory: {
          min: '1G',
          max: '2G'
        },
        javaPath: '',
        closeOnGameLaunch: false,
        checkUpdatesOnStartup: true
      },
      mods: {
        requiredMods: [
          {
            name: 'ExampleMod1',
            fileName: 'example-mod-1.jar',
            version: '1.0.0',
            url: 'https://example.com/mods/example-mod-1.jar',
            sha1: '123456789abcdef123456789abcdef123456789a',
            required: true
          },
          {
            name: 'ExampleMod2',
            fileName: 'example-mod-2.jar',
            version: '2.1.0',
            url: 'https://example.com/mods/example-mod-2.jar',
            sha1: '987654321abcdef987654321abcdef987654321b',
            required: true
          }
        ],
        modsDirectoryName: 'mods'
      },
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
        redirectUri: process.env.REDIRECT_URI || 'https://login.microsoftonline.com/common/oauth2/nativeclient',
        authServer: process.env.AUTH_SERVER || 'https://login.microsoftonline.com/consumers'
      },
      download: {
        forgeBaseUrl: 'https://files.minecraftforge.net/maven/net/minecraftforge/forge',
        modsBaseUrl: 'https://example.com/mods',
        connectTimeout: 10000, // ms
        retryCount: 3
      },
      server: {
        host: 'appel.ovh',
        port: 25565,
        name: 'Appel Minecraft Server'
      }
    };
    
    // Initialiser la configuration
    this.ensureConfigFiles();
  }
  
  /**
   * Assure que les fichiers de configuration existent
   */
  async ensureConfigFiles() {
    try {
      await fs.ensureDir(this.configPath);
      
      // Vérifier et créer la configuration du launcher
      if (!await fs.pathExists(this.launcherConfigPath)) {
        await fs.writeJson(this.launcherConfigPath, this.defaultConfig.launcher, { spaces: 2 });
      }
      
      // Vérifier et créer la configuration des mods
      if (!await fs.pathExists(this.modsConfigPath)) {
        await fs.writeJson(this.modsConfigPath, this.defaultConfig.mods, { spaces: 2 });
      }
      
      // Vérifier et créer la configuration de l'authentification
      if (!await fs.pathExists(this.authConfigPath)) {
        await fs.writeJson(this.authConfigPath, this.defaultConfig.auth, { spaces: 2 });
      }
      
      // Vérifier et créer la configuration du téléchargement
      if (!await fs.pathExists(this.downloadConfigPath)) {
        await fs.writeJson(this.downloadConfigPath, this.defaultConfig.download, { spaces: 2 });
      }
    } catch (error) {
      log.error('Erreur lors de l\'initialisation des fichiers de configuration:', error);
    }
  }
  
  /**
   * Charge la configuration complète
   */
  async loadConfig() {
    try {
      await this.ensureConfigFiles();
      
      const [launcher, mods, auth, download] = await Promise.all([
        fs.readJson(this.launcherConfigPath),
        fs.readJson(this.modsConfigPath),
        fs.readJson(this.authConfigPath),
        fs.readJson(this.downloadConfigPath)
      ]);
      
      this.config = {
        launcher,
        mods,
        auth,
        download,
        server: this.defaultConfig.server // La configuration du serveur est fixe
      };
      
      return this.config;
    } catch (error) {
      log.error('Erreur lors du chargement de la configuration:', error);
      // Utiliser la configuration par défaut en cas d'erreur
      this.config = this.defaultConfig;
      return this.config;
    }
  }
  
  /**
   * Retourne la configuration du launcher
   */
  getLauncherConfig() {
    return this.config ? this.config.launcher : this.defaultConfig.launcher;
  }
  
  /**
   * Retourne la configuration des mods
   */
  getModsConfig() {
    return this.config ? this.config.mods : this.defaultConfig.mods;
  }
  
  /**
   * Retourne la configuration de l'authentification
   */
  getAuthConfig() {
    return this.config ? this.config.auth : this.defaultConfig.auth;
  }
  
  /**
   * Retourne la configuration du téléchargement
   */
  getDownloadConfig() {
    return this.config ? this.config.download : this.defaultConfig.download;
  }
  
  /**
   * Retourne la configuration du serveur
   */
  getServerConfig() {
    return this.config ? this.config.server : this.defaultConfig.server;
  }
  
  /**
   * Met à jour la configuration du launcher
   */
  async updateLauncherConfig(launcherConfig) {
    try {
      const currentConfig = await fs.readJson(this.launcherConfigPath);
      const updatedConfig = { ...currentConfig, ...launcherConfig };
      await fs.writeJson(this.launcherConfigPath, updatedConfig, { spaces: 2 });
      
      if (this.config) {
        this.config.launcher = updatedConfig;
      }
      
      return updatedConfig;
    } catch (error) {
      log.error('Erreur lors de la mise à jour de la configuration du launcher:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour la configuration des mods
   */
  async updateModsConfig(modsConfig) {
    try {
      const currentConfig = await fs.readJson(this.modsConfigPath);
      const updatedConfig = { ...currentConfig, ...modsConfig };
      await fs.writeJson(this.modsConfigPath, updatedConfig, { spaces: 2 });
      
      if (this.config) {
        this.config.mods = updatedConfig;
      }
      
      return updatedConfig;
    } catch (error) {
      log.error('Erreur lors de la mise à jour de la configuration des mods:', error);
      throw error;
    }
  }
}

module.exports = ConfigManager;