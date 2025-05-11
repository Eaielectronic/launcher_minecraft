/**
 * Gestionnaire de mods
 * Gère l'installation et la mise à jour des mods
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const log = require('electron-log');
const os = require('os');

class ModManager {
  constructor(userDataPath, config) {
    this.userDataPath = userDataPath;
    this.config = config || {
      requiredMods: [],
      modsDirectoryName: 'mods'
    };
    
    // Chemin vers le dossier .minecraft
    this.minecraftDir = path.join(os.homedir(), '.minecraft');
    
    // Chemin vers le dossier des mods Minecraft
    this.modsDir = path.join(this.minecraftDir, this.config.modsDirectoryName);
    
    // Chemin vers le cache des mods
    this.modsCachePath = path.join(userDataPath, 'cache', 'mods');
    
    // Initialiser les dossiers
    this.init();
  }
  
  /**
   * Initialise les dossiers nécessaires
   */
  async init() {
    try {
      await fs.ensureDir(this.modsDir);
      await fs.ensureDir(this.modsCachePath);
      
      log.info(`Dossier des mods initialisé: ${this.modsDir}`);
      log.info(`Cache des mods initialisé: ${this.modsCachePath}`);
    } catch (error) {
      log.error('Erreur lors de l\'initialisation du gestionnaire de mods:', error);
    }
  }
  
  /**
   * Vérifie l'état des mods
   * @returns {Promise<string>} L'état des mods ('up-to-date', 'outdated', 'unknown')
   */
  async checkModsStatus() {
    try {
      if (!this.config.requiredMods || this.config.requiredMods.length === 0) {
        log.warn('Aucun mod requis configuré');
        return 'unknown';
      }
      
      log.info('Vérification de l\'état des mods...');
      
      const modsStatus = await Promise.all(
        this.config.requiredMods.map(async (mod) => {
          const modPath = path.join(this.modsDir, mod.fileName);
          
          // Vérifier si le mod existe
          const exists = await fs.pathExists(modPath);
          if (!exists) {
            log.info(`Mod ${mod.fileName} n'existe pas`);
            return 'missing';
          }
          
          // Si le hash est défini, vérifier le hash du fichier
          if (mod.sha1) {
            const fileBuffer = await fs.readFile(modPath);
            const hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
            
            if (hash !== mod.sha1) {
              log.info(`Mod ${mod.fileName} a un hash différent (${hash} vs ${mod.sha1})`);
              return 'outdated';
            }
          }
          
          log.info(`Mod ${mod.fileName} est à jour`);
          return 'up-to-date';
        })
      );
      
      // Si tous les mods sont à jour
      if (modsStatus.every(status => status === 'up-to-date')) {
        return 'up-to-date';
      }
      
      // Si au moins un mod est manquant ou obsolète
      if (modsStatus.some(status => status === 'missing' || status === 'outdated')) {
        return 'outdated';
      }
      
      return 'unknown';
    } catch (error) {
      log.error('Erreur lors de la vérification des mods:', error);
      return 'unknown';
    }
  }
  
  /**
   * Installe ou met à jour les mods requis
   * @param {Function} progressCallback Fonction de rappel pour la progression
   */
  async installMods(progressCallback) {
    try {
      if (!this.config.requiredMods || this.config.requiredMods.length === 0) {
        log.warn('Aucun mod requis configuré');
        return;
      }
      
      log.info('Installation/mise à jour des mods...');
      
      // Nombre total de mods à installer/mettre à jour
      const totalMods = this.config.requiredMods.length;
      let installedMods = 0;
      
      for (const mod of this.config.requiredMods) {
        try {
          log.info(`Traitement du mod ${mod.fileName}...`);
          
          // Chemin vers le fichier du mod
          const modPath = path.join(this.modsDir, mod.fileName);
          const modCachePath = path.join(this.modsCachePath, mod.fileName);
          
          // Vérifier si le mod est déjà en cache et à jour
          let useCache = false;
          
          if (await fs.pathExists(modCachePath) && mod.sha1) {
            const cacheBuffer = await fs.readFile(modCachePath);
            const cacheHash = crypto.createHash('sha1').update(cacheBuffer).digest('hex');
            
            if (cacheHash === mod.sha1) {
              log.info(`Utilisation du mod en cache: ${mod.fileName}`);
              useCache = true;
            }
          }
          
          // Télécharger le mod si nécessaire
          if (!useCache) {
            log.info(`Téléchargement du mod ${mod.fileName}...`);
            
            // Télécharger le fichier
            const response = await axios({
              method: 'GET',
              url: mod.url,
              responseType: 'stream',
              timeout: 30000 // 30 secondes
            });
            
            // Sauvegarder dans le cache
            const cacheWriter = fs.createWriteStream(modCachePath);
            response.data.pipe(cacheWriter);
            
            await new Promise((resolve, reject) => {
              cacheWriter.on('finish', resolve);
              cacheWriter.on('error', reject);
            });
            
            log.info(`Mod ${mod.fileName} téléchargé dans le cache`);
          }
          
          // Copier le mod du cache vers le dossier des mods
          await fs.copy(modCachePath, modPath, { overwrite: true });
          log.info(`Mod ${mod.fileName} installé dans ${modPath}`);
          
          // Mettre à jour la progression
          installedMods++;
          if (progressCallback) {
            const progress = Math.floor((installedMods / totalMods) * 100);
            progressCallback('Mods', progress);
          }
        } catch (modError) {
          log.error(`Erreur lors de l'installation du mod ${mod.fileName}:`, modError);
          
          // Si le mod est requis, propager l'erreur
          if (mod.required) {
            throw modError;
          }
        }
      }
      
      log.info('Installation/mise à jour des mods terminée');
    } catch (error) {
      log.error('Erreur lors de l\'installation des mods:', error);
      throw error;
    }
  }
  
  /**
   * Liste tous les mods installés
   * @returns {Promise<Array>} Liste des mods installés
   */
  async getInstalledMods() {
    try {
      // Vérifier si le dossier des mods existe
      if (!await fs.pathExists(this.modsDir)) {
        return [];
      }
      
      // Lire le contenu du dossier
      const files = await fs.readdir(this.modsDir);
      
      // Filtrer pour ne garder que les fichiers JAR
      const modFiles = files.filter(file => file.endsWith('.jar'));
      
      // Préparer les informations sur les mods
      const mods = await Promise.all(
        modFiles.map(async (fileName) => {
          const filePath = path.join(this.modsDir, fileName);
          const stats = await fs.stat(filePath);
          
          // Trouver si c'est un mod requis
          const requiredMod = this.config.requiredMods.find(m => m.fileName === fileName);
          
          return {
            fileName,
            size: stats.size,
            modifiedTime: stats.mtime,
            required: requiredMod ? true : false,
            name: requiredMod ? requiredMod.name : fileName.replace('.jar', '')
          };
        })
      );
      
      return mods;
    } catch (error) {
      log.error('Erreur lors de la lecture des mods installés:', error);
      return [];
    }
  }
  
  /**
   * Supprime un mod spécifique
   * @param {string} fileName Nom du fichier du mod à supprimer
   */
  async removeMod(fileName) {
    try {
      const modPath = path.join(this.modsDir, fileName);
      
      // Vérifier si le mod existe
      if (!await fs.pathExists(modPath)) {
        log.warn(`Mod ${fileName} n'existe pas`);
        return false;
      }
      
      // Vérifier si c'est un mod requis
      const requiredMod = this.config.requiredMods.find(m => m.fileName === fileName);
      if (requiredMod && requiredMod.required) {
        log.warn(`Impossible de supprimer le mod requis ${fileName}`);
        return false;
      }
      
      // Supprimer le mod
      await fs.remove(modPath);
      log.info(`Mod ${fileName} supprimé`);
      
      return true;
    } catch (error) {
      log.error(`Erreur lors de la suppression du mod ${fileName}:`, error);
      return false;
    }
  }
  
  /**
   * Supprime tous les mods non requis
   */
  async removeNonRequiredMods() {
    try {
      const installedMods = await this.getInstalledMods();
      
      // Liste des noms de fichiers des mods requis
      const requiredModFiles = this.config.requiredMods.map(m => m.fileName);
      
      // Filtrer les mods non requis
      const nonRequiredMods = installedMods.filter(mod => !requiredModFiles.includes(mod.fileName));
      
      // Supprimer chaque mod non requis
      for (const mod of nonRequiredMods) {
        await this.removeMod(mod.fileName);
      }
      
      log.info(`${nonRequiredMods.length} mods non requis supprimés`);
      
      return nonRequiredMods.length;
    } catch (error) {
      log.error('Erreur lors de la suppression des mods non requis:', error);
      throw error;
    }
  }
}

module.exports = ModManager;