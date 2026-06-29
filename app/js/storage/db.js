/**
 * DATABASE - IndexedDB
 */

const PMUDatabase = {
  DB_NAME: 'KaramokoPMU',
  VERSION: 1,
  db: null,
  initialized: false,

  async init() {
    if (this.initialized && this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('courses')) {
          const store = db.createObjectStore('courses', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('hippodrome', 'hippodrome', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('parametres')) {
          db.createObjectStore('parametres', { keyPath: 'cle' });
        }
      };
    });
  },

  async sauvegarderCourse(course) {
    await this.init();
    const tx = this.db.transaction(['courses'], 'readwrite');
    const store = tx.objectStore('courses');
    
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...course,
        date: course.date || new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getCourses() {
    await this.init();
    const tx = this.db.transaction(['courses'], 'readonly');
    const store = tx.objectStore('courses');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const courses = request.result;
        courses.sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(courses);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getCourse(id) {
    await this.init();
    const tx = this.db.transaction(['courses'], 'readonly');
    const store = tx.objectStore('courses');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async supprimerCourse(id) {
    await this.init();
    const tx = this.db.transaction(['courses'], 'readwrite');
    const store = tx.objectStore('courses');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async sauvegardeAuto(course) {
    await this.init();
    const tx = this.db.transaction(['parametres'], 'readwrite');
    const store = tx.objectStore('parametres');
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        cle: 'autosave',
        valeur: course,
        date: new Date().toISOString()
      });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async recupererAutoSave() {
    await this.init();
    const tx = this.db.transaction(['parametres'], 'readonly');
    const store = tx.objectStore('parametres');
    
    return new Promise((resolve, reject) => {
      const request = store.get('autosave');
      request.onsuccess = () => resolve(request.result?.valeur || null);
      request.onerror = () => reject(request.error);
    });
  },

  async exportComplet() {
    await this.init();
    const courses = await this.getCourses();
    
    return {
      version: this.VERSION,
      dateExport: new Date().toISOString(),
      total: courses.length,
      courses
    };
  },

  /**
   * Calcule des statistiques globales sur l'historique des courses
   */
  async getStatistiques() {
    await this.init();
    const courses = await this.getCourses();

    const hippodromes = {};
    let derniereCourse = null;

    courses.forEach(c => {
      const h = c.hippodrome || 'Inconnu';
      hippodromes[h] = (hippodromes[h] || 0) + 1;

      if (!derniereCourse || new Date(c.date) > new Date(derniereCourse)) {
        derniereCourse = c.date;
      }
    });

    return {
      totalCourses: courses.length,
      hippodromes,
      derniereCourse
    };
  }
};