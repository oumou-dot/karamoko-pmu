/* ============================================
   KARAMOKO PMU PRO - Sauvegarde automatique
   ============================================ */

const BackupManager = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    autoSaveInterval: 30000,      // Sauvegarde auto toutes les 30s
    maxBackups: 10,               // Nombre max de sauvegardes conservées
    backupPrefix: 'karamoko_backup_',
    settingsKey: 'karamoko_settings'
  };

  let autoSaveTimer = null;

  // ---------- UTILITAIRES INTERNES ----------

  function getTimestamp() {
    return new Date().toISOString();
  }

  function generateBackupId() {
    return CONFIG.backupPrefix + Date.now();
  }

  function getAllBackups() {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CONFIG.backupPrefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          backups.push({ id: key, ...data });
        } catch (e) {
          console.warn('Backup corrompu ignoré:', key);
        }
      }
    }
    // Trier du plus récent au plus ancien
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  function cleanOldBackups() {
    const backups = getAllBackups();
    if (backups.length > CONFIG.maxBackups) {
      const toDelete = backups.slice(CONFIG.maxBackups);
      toDelete.forEach(b => localStorage.removeItem(b.id));
      console.log(`[Backup] ${toDelete.length} anciennes sauvegardes supprimées`);
    }
  }

  // ---------- FONCTIONS PUBLIQUES ----------

  /**
   * Crée une sauvegarde manuelle
   * @param {Object} data - Données à sauvegarder (courses, résultats, etc.)
   * @param {string} label - Nom descriptif de la sauvegarde
   * @returns {string} ID de la sauvegarde créée
   */
  function createBackup(data, label = 'Sauvegarde manuelle') {
    const backup = {
      id: generateBackupId(),
      label: label,
      timestamp: Date.now(),
      dateISO: getTimestamp(),
      version: '1.0',
      data: data
    };

    localStorage.setItem(backup.id, JSON.stringify(backup));
    cleanOldBackups();

    console.log(`[Backup] Créée: "${label}" (${new Date(backup.timestamp).toLocaleString()})`);
    return backup.id;
  }

  /**
   * Restaure une sauvegarde par son ID
   * @param {string} backupId
   * @returns {Object|null} Données restaurées ou null
   */
  function restoreBackup(backupId) {
    const raw = localStorage.getItem(backupId);
    if (!raw) {
      console.error('[Backup] Sauvegarde introuvable:', backupId);
      return null;
    }

    try {
      const backup = JSON.parse(raw);
      console.log(`[Backup] Restaurée: "${backup.label}"`);
      return backup.data;
    } catch (e) {
      console.error('[Backup] Erreur de restauration:', e);
      return null;
    }
  }

  /**
   * Supprime une sauvegarde
   * @param {string} backupId
   */
  function deleteBackup(backupId) {
    localStorage.removeItem(backupId);
    console.log('[Backup] Supprimée:', backupId);
  }

  /**
   * Liste toutes les sauvegardes disponibles
   * @returns {Array} Liste des sauvegardes
   */
  function listBackups() {
    return getAllBackups().map(b => ({
      id: b.id,
      label: b.label,
      date: new Date(b.timestamp).toLocaleString(),
      timestamp: b.timestamp
    }));
  }

  /**
   * Démarre la sauvegarde automatique
   * @param {Function} dataProvider - Fonction qui retourne les données à sauvegarder
   */
  function startAutoSave(dataProvider) {
    if (autoSaveTimer) {
      console.warn('[Backup] Auto-save déjà active');
      return;
    }

    if (typeof dataProvider !== 'function') {
      console.error('[Backup] dataProvider doit être une fonction');
      return;
    }

    autoSaveTimer = setInterval(() => {
      const data = dataProvider();
      if (data) {
        createBackup(data, 'Sauvegarde automatique');
      }
    }, CONFIG.autoSaveInterval);

    console.log(`[Backup] Auto-save démarrée (intervalle: ${CONFIG.autoSaveInterval}ms)`);
  }

  /**
   * Arrête la sauvegarde automatique
   */
  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
      console.log('[Backup] Auto-save arrêtée');
    }
  }

  /**
   * Exporte toutes les sauvegardes en JSON (téléchargement)
   */
  function exportAllBackups() {
    const backups = getAllBackups();
    const blob = new Blob([JSON.stringify(backups, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `karamoko_backups_${new Date().toISOString().slice(0,10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('[Backup] Export de', backups.length, 'sauvegardes');
  }

  /**
   * Sauvegarde les paramètres utilisateur
   * @param {Object} settings
   */
  function saveSettings(settings) {
    localStorage.setItem(CONFIG.settingsKey, JSON.stringify({
      ...settings,
      savedAt: Date.now()
    }));
  }

  /**
   * Charge les paramètres utilisateur
   * @returns {Object|null}
   */
  function loadSettings() {
    const raw = localStorage.getItem(CONFIG.settingsKey);
    return raw ? JSON.parse(raw) : null;
  }

  // ---------- API PUBLIQUE ----------
  return {
    create: createBackup,
    restore: restoreBackup,
    delete: deleteBackup,
    list: listBackups,
    startAutoSave: startAutoSave,
    stopAutoSave: stopAutoSave,
    exportAll: exportAllBackups,
    saveSettings: saveSettings,
    loadSettings: loadSettings
  };

})();