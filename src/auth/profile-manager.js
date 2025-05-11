/**
 * Gestion des profils utilisateurs
 * Stocke et gère les profils d'authentification
 */

const fs = require('fs-extra');
const path = require('path');
const log = require('electron-log');

class ProfileManager {
  constructor(profilesDir) {
    this.profilesDir = profilesDir;
    this.currentProfilePath = path.join(profilesDir, 'current.json');
    this.profilesListPath = path.join(profilesDir, 'profiles.json');
    
    // Initialiser les dossiers et fichiers
    this.init();
  }
  
  /**
   * Initialise les dossiers et fichiers nécessaires
   */
  async init() {
    try {
      // S'assurer que le dossier de profils existe
      await fs.ensureDir(this.profilesDir);
      
      // Créer la liste de profils si elle n'existe pas
      if (!await fs.pathExists(this.profilesListPath)) {
        await fs.writeJson(this.profilesListPath, { profiles: [] });
      }
    } catch (error) {
      log.error('Erreur lors de l\'initialisation du gestionnaire de profils:', error);
    }
  }
  
  /**
   * Récupère la liste des profils enregistrés
   */
  async getProfiles() {
    try {
      if (!await fs.pathExists(this.profilesListPath)) {
        return [];
      }
      
      const data = await fs.readJson(this.profilesListPath);
      return data.profiles || [];
    } catch (error) {
      log.error('Erreur lors de la récupération des profils:', error);
      return [];
    }
  }
  
  /**
   * Récupère un profil par son ID
   */
  async getProfileById(id) {
    try {
      const profiles = await this.getProfiles();
      return profiles.find(profile => profile.id === id) || null;
    } catch (error) {
      log.error(`Erreur lors de la récupération du profil ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Récupère le profil actuellement actif
   */
  async getCurrentProfile() {
    try {
      if (!await fs.pathExists(this.currentProfilePath)) {
        return null;
      }
      
      return await fs.readJson(this.currentProfilePath);
    } catch (error) {
      log.error('Erreur lors de la récupération du profil actuel:', error);
      return null;
    }
  }
  
  /**
   * Enregistre un profil et le définit comme profil actuel
   */
  async saveProfile(profile) {
    try {
      if (!profile || !profile.id) {
        throw new Error('Profil invalide');
      }
      
      // Ajouter ou mettre à jour le profil dans la liste
      const profiles = await this.getProfiles();
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      
      if (existingIndex >= 0) {
        // Mettre à jour le profil existant
        profiles[existingIndex] = {
          ...profiles[existingIndex],
          ...profile,
          lastUsed: new Date().toISOString()
        };
      } else {
        // Ajouter un nouveau profil
        profiles.push({
          ...profile,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        });
      }
      
      // Enregistrer la liste mise à jour
      await fs.writeJson(this.profilesListPath, { profiles });
      
      // Définir comme profil actuel
      await fs.writeJson(this.currentProfilePath, profile);
      
      log.info(`Profil ${profile.username} (${profile.id}) enregistré et défini comme actuel`);
      return profile;
    } catch (error) {
      log.error('Erreur lors de l\'enregistrement du profil:', error);
      throw error;
    }
  }
  
  /**
   * Supprime un profil par son ID
   */
  async deleteProfile(id) {
    try {
      const profiles = await this.getProfiles();
      const updatedProfiles = profiles.filter(profile => profile.id !== id);
      
      await fs.writeJson(this.profilesListPath, { profiles: updatedProfiles });
      
      // Si le profil supprimé est le profil actuel, effacer le profil actuel
      const currentProfile = await this.getCurrentProfile();
      if (currentProfile && currentProfile.id === id) {
        await this.clearCurrentProfile();
      }
      
      log.info(`Profil ${id} supprimé`);
      return true;
    } catch (error) {
      log.error(`Erreur lors de la suppression du profil ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Efface le profil actuel
   */
  async clearCurrentProfile() {
    try {
      if (await fs.pathExists(this.currentProfilePath)) {
        await fs.remove(this.currentProfilePath);
        log.info('Profil actuel effacé');
      }
      return true;
    } catch (error) {
      log.error('Erreur lors de l\'effacement du profil actuel:', error);
      throw error;
    }
  }
  
  /**
   * Définit un profil existant comme profil actuel par son ID
   */
  async setCurrentProfileById(id) {
    try {
      const profile = await this.getProfileById(id);
      if (!profile) {
        throw new Error(`Profil ${id} non trouvé`);
      }
      
      await fs.writeJson(this.currentProfilePath, profile);
      
      // Mettre à jour la date de dernière utilisation
      const profiles = await this.getProfiles();
      const updatedProfiles = profiles.map(p => {
        if (p.id === id) {
          return { ...p, lastUsed: new Date().toISOString() };
        }
        return p;
      });
      
      await fs.writeJson(this.profilesListPath, { profiles: updatedProfiles });
      
      log.info(`Profil ${profile.username} (${profile.id}) défini comme actuel`);
      return profile;
    } catch (error) {
      log.error(`Erreur lors de la définition du profil ${id} comme actuel:`, error);
      throw error;
    }
  }

  /**
   * Définit l'utilisateur actuel par son ID
   */
  async setCurrentUser(userId) {
    try {
      const profile = await this.getProfileById(userId);
      if (!profile) {
        throw new Error(`Utilisateur ${userId} non trouvé`);
      }

      await fs.writeJson(this.currentProfilePath, profile);

      log.info(`Utilisateur ${profile.username} (${profile.id}) défini comme actuel`);
      return profile;
    } catch (error) {
      log.error(`Erreur lors de la définition de l'utilisateur ${userId} comme actuel:`, error);
      throw error;
    }
  }
}

module.exports = ProfileManager;