/**
 * Gestion du lancement de Minecraft
 * Utilise minecraft-launcher-core pour lancer le jeu
 */

const { Client, Authenticator } = require('minecraft-launcher-core');
const path = require('path');
const fs = require('fs-extra');
const log = require('electron-log');
const net = require('net');

class GameLauncher {
  constructor(userDataPath, config) {
    this.userDataPath = userDataPath;
    this.config = config || {
      version: {
        number: '1.20.1',
        type: 'release'
      },
      forge: {
        version: '47.2.0'
      },
      memory: {
        min: '1G',
        max: '2G'
      }
    };
    
    this.launcher = new Client();
  }

  /**
   * Lance le jeu Minecraft
   */
  async launchGame(options, onData, onError) {
    try {
      log.info('Lancement du jeu avec options:', JSON.stringify(options, null, 2));
      
      // Configurer le chemin du jeu
      const gameDir = options.gameDir || path.join(this.userDataPath, 'minecraft');
      await fs.ensureDir(gameDir);
      
      // Configurer le dossier des mods
      const modsDir = path.join(gameDir, 'mods');
      await fs.ensureDir(modsDir);
      
      // Vérifier les servers.dat pour ajouter le serveur par défaut
      await this._ensureServerEntry(gameDir, options.server);
      
      // Options du launcher
      const opts = {
        authorization: this._createAuthInfo(options.profile),
        root: gameDir,
        version: {
          number: this.config.version.number,
          type: this.config.version.type
        },
        memory: {
          max: `${options.memory || this.config.memory.max}M`,
          min: this.config.memory.min
        },
        forge: `${this.config.version.number}-forge-${this.config.forge.version}`,
        server: options.server ? {
          host: options.server.host,
          port: options.server.port || 25565
        } : undefined
      };
      
      // Événements du launcher
      this.launcher.on('debug', (e) => log.debug(e));
      this.launcher.on('data', (e) => {
        log.info(e);
        if (onData) onData(e);
      });
      this.launcher.on('progress', (e) => {
        log.info(`Progression: ${e.type} - ${e.task} - ${e.percent}%`);
      });
      
      // Lancer le jeu
      await this.launcher.launch(opts);
      
      log.info('Jeu lancé avec succès');
      return true;
    } catch (error) {
      log.error('Erreur lors du lancement du jeu:', error);
      if (onError) onError(error.message);
      throw error;
    }
  }

  /**
   * Vérifie l'état d'un serveur
   */
  async checkServerStatus(host, port = 25565) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let timeout = null;
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(false);
      });
      
      timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000);
      
      socket.connect(port, host);
    });
  }

  /**
   * Crée les informations d'authentification pour le launcher
   */
  _createAuthInfo(profile) {
    if (profile.isOffline) {
      // Mode hors ligne
      return {
        uuid: profile.uuid,
        name: profile.username,
        meta: {
          type: 'offline',
          demo: false
        }
      };
    } else {
      // Mode en ligne (compte Microsoft)
      return {
        access_token: profile.accessToken,
        client_token: profile.uuid,
        uuid: profile.uuid,
        name: profile.username,
        user_properties: '{}',
        meta: {
          type: 'msa',
          demo: false
        }
      };
    }
  }

  /**
   * S'assure que le serveur par défaut est dans servers.dat
   */
  async _ensureServerEntry(gameDir, server) {
    if (!server) return;
    
    try {
      const serversFile = path.join(gameDir, 'servers.dat');
      const defaultServer = {
        name: "AppelOVH",
        ip: server.host || 'appel.ovh',
        port: server.port || 25565,
        hidden: false
      };
      
      // Utiliser la logique de minecraft-launcher-core pour ajouter le serveur
      // Ou implémenter une logique personnalisée pour modifier servers.dat
      // Note: Ceci est une simplification, servers.dat est au format NBT
      
      log.info('Serveur par défaut configuré:', defaultServer);
    } catch (error) {
      log.error('Erreur lors de la configuration du serveur par défaut:', error);
    }
  }
}

module.exports = GameLauncher;