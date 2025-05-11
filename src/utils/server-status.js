/**
 * Vérificateur de statut du serveur Minecraft
 * Utilise le protocole de ping Minecraft pour vérifier si un serveur est en ligne
 */

const net = require('net');
const log = require('electron-log');

/**
 * Vérifie si un serveur Minecraft est en ligne
 * @param {string} host L'adresse du serveur
 * @param {number} port Le port du serveur (25565 par défaut)
 * @param {number} timeout Le délai d'attente en ms (5000 par défaut)
 * @returns {Promise<boolean>} true si le serveur est en ligne, sinon false
 */
async function getServerStatus(host, port = 25565, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    
    // Configurer le délai d'attente
    socket.setTimeout(timeout);
    
    // Gérer la connexion réussie
    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        log.info(`Serveur ${host}:${port} est en ligne`);
        resolve(true);
      }
    });
    
    // Gérer les erreurs
    socket.on('error', (error) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        log.info(`Serveur ${host}:${port} est hors ligne (erreur: ${error.message})`);
        resolve(false);
      }
    });
    
    // Gérer les délais d'attente
    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        log.info(`Serveur ${host}:${port} a dépassé le délai d'attente`);
        resolve(false);
      }
    });
    
    // Tenter la connexion
    log.info(`Vérification du statut du serveur ${host}:${port}...`);
    socket.connect(port, host);
  });
}

module.exports = {
  getServerStatus
};