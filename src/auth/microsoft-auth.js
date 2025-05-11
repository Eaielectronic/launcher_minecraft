const { BrowserWindow, shell } = require('electron');
const express = require('express');
const http = require('http');
const url = require('url');
const fetch = require('node-fetch');
const { randomBytes } = require('crypto');

// Logger simple 
const log = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} › ${message}`, data || '');
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} › ${message}`, error || '');
  },
  warn: (message, data) => {
    const timestamp = new Date().toISOString();
    console.warn(`${timestamp} › ${message}`, data || '');
  }
};

/**
 * Classe d'authentification Microsoft utilisant OAuth 2.0 avec un serveur local
 */
class MicrosoftAuth {
  constructor(config) {
    log.info('Initialisation de l\'authentification Microsoft pour Minecraft');
    
    // Configuration par défaut
    this.config = config || {};
    
    // Utiliser l'ID client OFFICIEL du Minecraft Launcher
    this.clientId = '00000000402b5328';
    this.port = 3452;
    
    // Utiliser l'URI de redirection officielle de Microsoft
    this.redirectUri = 'https://login.live.com/oauth20_desktop.srf';
    this.authState = null;
    this.authWindow = null;
    
    // Ajoutez ces deux flags:
    this.tokenReceived = false;
    this.isAuthenticating = false;
  }
  
  /**
   * Génère une chaîne aléatoire pour le state OAuth (sécurité)
   */
  generateState() {
    return randomBytes(16).toString('hex');
  }
  
  /**
   * Échange le code d'autorisation contre un token d'accès
   */
  async exchangeCodeForToken(code) {
    log.info('Échange du code contre un token');
    
    // Utiliser l'endpoint OFFICIEL pour l'échange de token
    const tokenEndpoint = 'https://login.live.com/oauth20_token.srf';
    
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('code', code);
    params.append('redirect_uri', this.redirectUri);
    params.append('grant_type', 'authorization_code');
    params.append('scope', 'XboxLive.signin offline_access');
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error('Erreur lors de l\'échange du code:', errorText);
      throw new Error(`Erreur d'échange de token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    log.info('Token obtenu avec succès');
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in
    };
  }
  
  /**
   * Méthode principale d'authentification
   */
  async login() {
    log.info('Démarrage de l\'authentification OAuth avec fenêtre Electron');
    
    // Vérifiez si une authentification est déjà en cours
    if (this.isAuthenticating) {
      log.warn('Une authentification est déjà en cours, ignoré');
      return Promise.reject(new Error('Une authentification est déjà en cours'));
    }
    
    // Marquer que l'authentification a commencé
    this.isAuthenticating = true;
    
    try {
      // Générer un state pour la sécurité
      this.authState = this.generateState();
      
      // Nouvelle approche: utiliser uniquement BrowserWindow sans serveur Express
      return new Promise((resolve, reject) => {
        // Construire l'URL d'autorisation avec l'endpoint OFFICIEL
        const authUrl = new URL('https://login.live.com/oauth20_authorize.srf');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', 'XboxLive.signin offline_access');
        authUrl.searchParams.append('state', this.authState);
        
        // Ajouter des paramètres pour éviter la double fenêtre
        authUrl.searchParams.append('prompt', 'select_account');
        authUrl.searchParams.append('display', 'page');
        
        log.info('URL d\'autorisation générée:', authUrl.toString());
        
        // Créer une fenêtre pour l'authentification
        this.authWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: true,
          autoHideMenuBar: true,
          title: 'Connexion Microsoft',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });
        
        // Intercepter la navigation pour détecter la redirection
        this.authWindow.webContents.on('will-redirect', (event, newUrl) => {
          handleRedirect(newUrl);
        });
        
        this.authWindow.webContents.on('will-navigate', (event, newUrl) => {
          handleRedirect(newUrl);
        });
        
        // Fonction de gestion de redirection
        const handleRedirect = async (newUrl) => {
          log.info('Navigation détectée:', newUrl);
          
          if (newUrl.startsWith(this.redirectUri)) {
            try {
              // Extraire le code d'authentification
              const urlObj = new URL(newUrl);
              const code = urlObj.searchParams.get('code');
              const state = urlObj.searchParams.get('state');
              const error = urlObj.searchParams.get('error');
              
              if (error) {
                log.error('Erreur OAuth:', urlObj.searchParams.get('error_description') || error);
                // Afficher l'erreur dans la fenêtre
                this.authWindow.loadURL(`data:text/html,
                  <html>
                    <head>
                      <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; }
                        .error { color: #e74c3c; }
                      </style>
                    </head>
                    <body>
                      <h2 class="error">Erreur d'authentification</h2>
                      <p>${urlObj.searchParams.get('error_description') || error}</p>
                      <p>La fenêtre va se fermer dans 3 secondes.</p>
                      <script>
                        setTimeout(() => window.close(), 3000);
                      </script>
                    </body>
                  </html>
                `);
                reject(new Error(`Erreur OAuth: ${urlObj.searchParams.get('error_description') || error}`));
                return;
              }
              
              if (!code) {
                log.error('Pas de code dans la redirection');
                reject(new Error('Pas de code dans la redirection OAuth'));
                return;
              }
              
              if (state !== this.authState) {
                log.error('État de sécurité invalide:', state);
                reject(new Error('État de sécurité OAuth invalide'));
                return;
              }
              
              // Afficher un message de succès
              this.authWindow.loadURL(`data:text/html,
                <html>
                  <head>
                    <style>
                      body { font-family: sans-serif; text-align: center; padding: 50px; }
                      .success { color: #2ecc71; }
                    </style>
                  </head>
                  <body>
                    <h2 class="success">Authentification réussie!</h2>
                    <p>Vous pouvez fermer cette fenêtre et revenir à l'application.</p>
                    <script>
                      setTimeout(() => window.close(), 2000);
                    </script>
                  </body>
                </html>
              `);
              
              // Échanger le code contre un token
              log.info('Échange du code contre un token');
              const tokenResponse = await this.exchangeCodeForToken(code);
              
              // Ajouter ceci avant de résoudre la promesse:
              this.tokenReceived = true;
              
              // Résoudre la promesse avec le token
              resolve(tokenResponse);
              
              // Réinitialiser le flag à la fin
              this.isAuthenticating = false;
              
              // Fermer la fenêtre après un certain délai
              setTimeout(() => {
                if (this.authWindow) {
                  this.authWindow.close();
                }
              }, 2000);
              
            } catch (error) {
              log.error('Erreur lors du traitement de la redirection:', error);
              reject(error);
              if (this.authWindow) {
                this.authWindow.close();
              }
              this.isAuthenticating = false; // Réinitialiser le flag
            }
          }
        };
        
        // Gérer la fermeture manuelle de la fenêtre
        this.authWindow.on('closed', () => {
          this.authWindow = null;
          // Si aucun token n'a été récupéré et que la fenêtre est fermée
          if (!this.tokenReceived) {
            this.isAuthenticating = false; // Réinitialiser le flag
            reject(new Error('Authentification annulée par l\'utilisateur'));
          }
        });
        
        // Charger l'URL d'authentification
        this.authWindow.loadURL(authUrl.toString());
        log.info('Fenêtre d\'authentification ouverte');
      });
      
    } catch (error) {
      log.error('Erreur lors de l\'authentification:', error);
      // Fermer la fenêtre en cas d'erreur
      if (this.authWindow) {
        this.authWindow.close();
        this.authWindow = null;
      }
      // Réinitialiser le flag d'authentification
      this.isAuthenticating = false;
      throw error;
    }
  }
  
  /**
   * Obtient un token Xbox Live à partir du token Microsoft
   */
  async getXboxToken(msAccessToken) {
    log.info('Obtention du token Xbox Live');
    
    const response = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${msAccessToken}`
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Xbox Live (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Obtient un token XSTS à partir du token Xbox Live
   */
  async getXSTSToken(xboxToken) {
    log.info('Obtention du token XSTS');
    
    const response = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xboxToken.Token]
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur XSTS: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Améliorez la méthode getMinecraftToken pour mieux gérer les erreurs
   */
  async getMinecraftToken(xstsResponse, userHash) {
    log.info('Obtention du token Minecraft');
    
    try {
      // Vérifier que tous les paramètres requis sont présents
      if (!xstsResponse || !xstsResponse.Token || !userHash) {
        throw new Error('Données XSTS ou userHash manquantes pour l\'authentification Minecraft');
      }
      
      // Construction du token d'identité Xbox
      const identityToken = `XBL3.0 x=${userHash};${xstsResponse.Token}`;
      
      log.info('Envoi de la requête d\'authentification Minecraft');
      
      const response = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          identityToken: identityToken
        })
      });
      
      // Journalisation détaillée pour le débogage
      log.info('Réponse de l\'API Minecraft:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Erreur d'authentification Minecraft: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          log.error('Détails de l\'erreur:', JSON.stringify(errorData));
          
          // Messages d'erreur plus spécifiques
          if (response.status === 401) {
            errorMessage = 'Authentification Minecraft échouée: vos identifiants ne sont pas reconnus';
            if (errorData.error === 'UnauthorizedOperationException') {
              errorMessage = 'Compte Microsoft non associé à un compte Minecraft. Assurez-vous d\'avoir acheté le jeu.';
            }
          }
        } catch (jsonError) {
          const errorText = await response.text().catch(() => 'Impossible de lire la réponse');
          log.error('Texte de la réponse d\'erreur:', errorText);
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      log.error('Erreur lors de l\'obtention du token Minecraft:', error);
      throw error;
    }
  }
  
  /**
   * Vérifie si l'utilisateur possède Minecraft Java Edition
   */
  async checkGameOwnership(minecraftToken) {
    log.info('Vérification de la possession de Minecraft Java Edition');
    
    try {
      const response = await fetch('https://api.minecraftservices.com/entitlements/mcstore', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${minecraftToken}`
        }
      });
      
      log.info('Réponse de vérification:', response.status, response.statusText);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token d\'accès Minecraft invalide ou expiré');
        } else {
          throw new Error(`Erreur de vérification: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      log.info('Entitlements reçus:', JSON.stringify(data));
      
      // Vérifier les droits
      const hasGame = data.items && data.items.some(item => 
        item.name === 'game_minecraft' || 
        item.name === 'product_minecraft' ||
        item.name.includes('minecraft')
      );
      
      if (!hasGame) {
        log.warn('Compte Microsoft sans Minecraft Java Edition');
      } else {
        log.info('Minecraft Java Edition trouvé sur le compte');
      }
      
      return hasGame;
    } catch (error) {
      log.error('Erreur lors de la vérification de possession du jeu:', error);
      throw error;
    }
  }
  
  /**
   * Améliorez la méthode getProfile pour résoudre l'erreur 401
   */
  async getProfile(accessToken) {
    log.info('Récupération du profil Minecraft avec le token');
    
    try {
      // Log le début de la requête
      log.info('Envoi de la requête de profil à api.minecraftservices.com/minecraft/profile');
      log.info('Access token utilisé (début):', accessToken.substring(0, 10) + '...');
      
      const response = await fetch('https://api.minecraftservices.com/minecraft/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      // Log détaillé pour le débogage
      log.info('Réponse du profil reçue:', response.status, response.statusText);
      
      if (!response.ok) {
        // Traitement spécifique pour l'erreur 401
        if (response.status === 401) {
          let errorMessage = 'Token d\'accès Minecraft non valide ou expiré';
          
          try {
            const errorData = await response.json();
            log.error('Détails de l\'erreur 401:', JSON.stringify(errorData));
          } catch (jsonError) {
            const errorText = await response.text().catch(() => '');
            log.error('Texte de la réponse d\'erreur:', errorText);
          }
          
          throw new Error(`Erreur de profil: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
        
        throw new Error(`Erreur de profil: ${response.status} ${response.statusText}`);
      }
      
      // Vérifier si la réponse est vide ou malformée
      const data = await response.json();
      
      log.info('Données JSON du profil reçues:', JSON.stringify(data));
      
      if (!data || !data.id || !data.name) {
        log.error('Profil Minecraft incomplet:', JSON.stringify(data));
        throw new Error('Profil Minecraft incomplet ou invalide reçu');
      }
      
      log.info('Profil Minecraft récupéré avec succès!');
      log.info('UUID:', data.id);
      log.info('Nom d\'utilisateur:', data.name);
      return data;
    } catch (error) {
      log.error('Erreur lors de la récupération du profil Minecraft:', error);
      throw error;
    }
  }
  
  /**
   * Processus complet d'authentification et de récupération du profil
   */
  async getFullProfile(msAuthResult) {
    try {
      log.info('Début de l\'obtention du profil complet');
      
      if (!msAuthResult || !msAuthResult.accessToken) {
        throw new Error('Token Microsoft invalide');
      }
      
      // Obtenir le token Xbox Live
      const xboxToken = await this.getXboxToken(msAuthResult.accessToken);
      log.info('Token Xbox Live obtenu');
      
      // Obtenir le token XSTS
      const xstsToken = await this.getXSTSToken(xboxToken);
      log.info('Token XSTS obtenu');
      
      // Obtenir le token Minecraft
      const minecraftToken = await this.getMinecraftToken(xstsToken, xboxToken.DisplayClaims.xui[0].uhs);
      log.info('Token Minecraft obtenu');
      
      // Vérifier la possession du jeu
      const ownsGame = await this.checkGameOwnership(minecraftToken.access_token);
      log.info('Vérification de la possession du jeu:', ownsGame);
      
      if (!ownsGame) {
        throw new Error('Vous ne possédez pas Minecraft. Veuillez acheter le jeu pour continuer.');
      }
      
      // Obtenir le profil
      const profile = await this.getProfile(minecraftToken.access_token);
      log.info('Profil Minecraft obtenu:', profile.name);
      
      // Créer l'objet de profil complet
      return {
        id: profile.id,
        username: profile.name,
        accessToken: minecraftToken.access_token,
        refreshToken: msAuthResult.refreshToken || null,
        expiresAt: new Date(Date.now() + (minecraftToken.expires_in || 86400) * 1000).toISOString(),
        avatar: `https://crafatar.com/avatars/${profile.id}?overlay=true`,
        createdAt: new Date().toISOString(),
        isOffline: false
      };
    } catch (error) {
      log.error('Erreur lors de l\'obtention du profil complet:', error);
      throw error;
    }
  }
}

module.exports = MicrosoftAuth;