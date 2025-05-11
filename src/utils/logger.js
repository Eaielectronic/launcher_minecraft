const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Chemin du fichier de log
const logFile = path.join(logsDir, `launcher-${new Date().toISOString().split('T')[0]}.log`);

/**
 * Module de journalisation simple
 */
const logger = {
    /**
     * Enregistre un message d'information
     */
    info: function(message, data) {
        const logMessage = this._formatMessage('INFO', message, data);
        console.log(logMessage);
        this._writeToFile(logMessage);
    },
    
    /**
     * Enregistre un message d'avertissement
     */
    warn: function(message, data) {
        const logMessage = this._formatMessage('WARN', message, data);
        console.warn(logMessage);
        this._writeToFile(logMessage);
    },
    
    /**
     * Enregistre un message d'erreur
     */
    error: function(message, data) {
        const logMessage = this._formatMessage('ERROR', message, data);
        console.error(logMessage);
        this._writeToFile(logMessage);
    },
    
    /**
     * Formate un message de log
     */
    _formatMessage: function(level, message, data) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `${timestamp} › ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                try {
                    return `${formattedMessage} ${JSON.stringify(data)}`;
                } catch (error) {
                    return `${formattedMessage} [Object non sérialisable]`;
                }
            } else {
                return `${formattedMessage} ${data}`;
            }
        }
        
        return formattedMessage;
    },
    
    /**
     * Écrit un message dans le fichier de log
     */
    _writeToFile: function(message) {
        try {
            fs.appendFileSync(logFile, message + '\n');
        } catch (error) {
            console.error('Erreur d\'écriture dans le fichier de log:', error);
        }
    }
};

module.exports = logger;