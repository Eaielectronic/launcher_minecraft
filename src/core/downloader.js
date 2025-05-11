/**
 * Gestionnaire de téléchargement
 * Télécharge Forge et les ressources nécessaires
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const log = require('electron-log');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const os = require('os');

class Downloader {
  constructor(userDataPath, config) {
    this.userDataPath = userDataPath;
    this.config = config || {
      forgeVersion: '1.20.1-47.2.0',
      minecraftVersion: '1.20.1',
      forgeBaseUrl: 'https://files.minecraftforge.net/maven/net/minecraftforge/forge'
    };
    
    this.cachePath = path.join(userDataPath, 'cache');
    this.forgePath = path.join(userDataPath, 'forge');
    this.forgeCachePath = path.join(this.cachePath, 'forge');
    
    // Créer les dossiers nécessaires
    this.init();
  }
  
  /**
   * Initialisation des dossiers
   */
  async init() {
    try {
      await fs.ensureDir(this.cachePath);
      await fs.ensureDir(this.forgePath);
      await fs.ensureDir(this.forgeCachePath);
    } catch (error) {
      log.error('Erreur lors de l\'initialisation du téléchargeur:', error);
    }
  }
  
  /**
   * Vérifie si Forge est installé
   */
  async checkForgeInstalled() {
    try {
      const minecraftDir = path.join(os.homedir(), '.minecraft');
      const forgeVersionDir = path.join(minecraftDir, 'versions', this.config.forgeVersion);
      
      // Vérifier si le dossier de version Forge existe
      const forgeVersionExists = await fs.pathExists(forgeVersionDir);
      
      // Vérifier si le JAR de Forge existe
      const forgeJarPath = path.join(forgeVersionDir, `${this.config.forgeVersion}.jar`);
      const forgeJarExists = await fs.pathExists(forgeJarPath);
      
      // Vérifier si le JSON de Forge existe
      const forgeJsonPath = path.join(forgeVersionDir, `${this.config.forgeVersion}.json`);
      const forgeJsonExists = await fs.pathExists(forgeJsonPath);
      
      // Vérifier si les libraries de Forge sont installées
      const librariesDir = path.join(minecraftDir, 'libraries', 'net', 'minecraftforge', 'forge', this.config.forgeVersion);
      const librariesExist = await fs.pathExists(librariesDir);
      
      return forgeVersionExists && forgeJarExists && forgeJsonExists && librariesExist;
    } catch (error) {
      log.error('Erreur lors de la vérification de l\'installation de Forge:', error);
      return false;
    }
  }
  
  /**
   * Télécharge et installe Forge
   */
  async downloadAndInstallForge(progressCallback) {
    try {
      const forgeFileName = `forge-${this.config.forgeVersion}-installer.jar`;
      const forgeUrl = `${this.config.forgeBaseUrl}/${this.config.forgeVersion}/${forgeFileName}`;
      const forgeInstallerPath = path.join(this.forgeCachePath, forgeFileName);
      
      // Vérifier si l'installateur est déjà téléchargé
      if (!await fs.pathExists(forgeInstallerPath)) {
        log.info(`Téléchargement de Forge ${this.config.forgeVersion}...`);
        
        // Télécharger l'installateur
        await this.downloadFile(forgeUrl, forgeInstallerPath, progressCallback);
      } else {
        log.info(`Installateur Forge ${this.config.forgeVersion} déjà téléchargé.`);
      }
      
      // Installer Forge
      log.info(`Installation de Forge ${this.config.forgeVersion}...`);
      
      // Simuler 50% de progression avant installation
      if (progressCallback) progressCallback(50);
      
      // Exécuter l'installateur en mode silencieux
      await this.runForgeInstaller(forgeInstallerPath);
      
      // Installation terminée
      if (progressCallback) progressCallback(100);
      
      return true;
    } catch (error) {
      log.error('Erreur lors du téléchargement et de l\'installation de Forge:', error);
      throw error;
    }
  }
  
  /**
   * Exécute l'installateur Forge
   */
  async runForgeInstaller(installerPath) {
    return new Promise((resolve, reject) => {
      // Commande pour installer Forge en mode silencieux (client uniquement)
      const javaExe = this.getJavaExecutable();
      const process = spawn(javaExe, [
        '-jar', installerPath,
        '--installClient'
      ]);
      
      let output = '';
      
      process.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        log.info(`Forge installer stdout: ${text}`);
      });
      
      process.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        log.error(`Forge installer stderr: ${text}`);
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          log.info('Installation de Forge terminée avec succès');
          resolve();
        } else {
          log.error(`Installation de Forge échouée avec le code ${code}`);
          reject(new Error(`Installation de Forge échouée: ${output}`));
        }
      });
      
      process.on('error', (err) => {
        log.error('Erreur lors de l\'exécution de l\'installateur Forge:', err);
        reject(err);
      });
    });
  }
  
  /**
   * Obtient le chemin de l'exécutable Java
   */
  getJavaExecutable() {
    // Essayer d'utiliser le Java intégré à Minecraft si disponible
    const minecraftDir = path.join(os.homedir(), '.minecraft');
    const runtimeDir = path.join(minecraftDir, 'runtime');
    
    // Vérifier la plateforme
    let javaPath;
    
    if (process.platform === 'win32') {
      javaPath = path.join(runtimeDir, 'jre-x64', 'bin', 'java.exe');
    } else if (process.platform === 'darwin') {
      javaPath = path.join(runtimeDir, 'jre-x64', 'jre.bundle', 'Contents', 'Home', 'bin', 'java');
    } else {
      javaPath = path.join(runtimeDir, 'jre-x64', 'bin', 'java');
    }
    
    // Vérifier si le chemin existe
    if (fs.existsSync(javaPath)) {
      return javaPath;
    }
    
    // Sinon, utiliser 'java' si disponible dans le PATH
    return 'java';
  }
  
  /**
   * Télécharge un fichier avec suivi de progression
   */
  async downloadFile(url, destination, progressCallback) {
    try {
      // Créer le dossier de destination si nécessaire
      await fs.ensureDir(path.dirname(destination));
      
      // Télécharger le fichier avec suivi de progression
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000, // 30 secondes
        headers: {
          'User-Agent': 'MinecraftLauncherPro/1.0.0'
        }
      });
      
      const totalLength = parseInt(response.headers['content-length'], 10);
      let downloadedLength = 0;
      
      // Créer le flux d'écriture
      const writer = fs.createWriteStream(destination);
      
      // Configurer le flux de réponse
      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        const progress = Math.floor((downloadedLength / totalLength) * 100);
        if (progressCallback) progressCallback(progress);
      });
      
      // Traiter le téléchargement
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      log.error(`Erreur lors du téléchargement du fichier ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Télécharge un fichier et l'extrait (pour les mods au format ZIP)
   */
  async downloadAndExtract(url, destination, progressCallback) {
    try {
      // Créer un nom de fichier temporaire pour le téléchargement
      const tempFile = path.join(this.cachePath, `temp_${Date.now()}.zip`);
      
      // Télécharger le fichier
      await this.downloadFile(url, tempFile, progressCallback);
      
      // Extraire le fichier
      log.info(`Extraction de ${tempFile} vers ${destination}...`);
      const zip = new AdmZip(tempFile);
      zip.extractAllTo(destination, true);
      
      // Supprimer le fichier temporaire
      await fs.remove(tempFile);
      
      return true;
    } catch (error) {
      log.error(`Erreur lors du téléchargement et de l'extraction du fichier ${url}:`, error);
      throw error;
    }
  }
}

module.exports = Downloader;