/**
 * KARAMOKO PMU PRO - Application Principale
 */

class KaramokoPMApp {
  constructor() {
    this.course = null;
    this.analyse = null;
    this.params = {
      hippodrome: 'Vincennes',
      distance: '2700m',
      corde: 'gauche',
      meteo: 'bon'
    };
  }

  async init() {
    console.log('🚀 Initialisation Karamoko PMU Pro...');
    
    await loadHippodromeData();
    await PMUDatabase.init();
    
    const autoSave = await PMUDatabase.recupererAutoSave();
    if (autoSave) {
      if (confirm('Une session précédente a été trouvée. Reprendre ?')) {
        this.course = autoSave;
        this.afficherVueAnalyse();
      }
    }
    
    this.attachGlobalEvents();
    this.afficherVueAccueil();

    // Sauvegarde de secours en localStorage, complémentaire à IndexedDB
    // (utile si IndexedDB est indisponible : mode privé, vieux navigateur...)
    BackupManager.startAutoSave(() => this.course ? { course: this.course, params: this.params } : null);
    
    console.log('✅ Application prête');
  }

  attachGlobalEvents() {
    document.getElementById('btn-import-pdf')?.addEventListener('click', () => this.importerPDF());
    document.getElementById('btn-manuel')?.addEventListener('click', () => this.nouvelleSaisie());
    document.getElementById('btn-calculer')?.addEventListener('click', () => this.calculer());
    document.getElementById('btn-sauvegarder')?.addEventListener('click', () => this.sauvegarderCourse());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exporter());
    
    document.getElementById('hippodrome-select')?.addEventListener('change', (e) => {
      this.params.hippodrome = e.target.value;
      this.mettreAJourDistances();
    });
    
    document.getElementById('distance-select')?.addEventListener('change', (e) => {
      this.params.distance = e.target.value;
    });
    
    document.getElementById('corde-select')?.addEventListener('change', (e) => {
      this.params.corde = e.target.value;
    });

    window.addEventListener('pmu:course-pret', (e) => {
      this.course = e.detail;
      this.afficherVueAnalyse();
    });
    
    window.addEventListener('pmu:recalculer', () => this.calculer());
    
    window.addEventListener('pmu:charger-course', async (e) => {
      const course = await PMUDatabase.getCourse(e.detail.id);
      if (course) {
        this.course = course;
        this.afficherVueAnalyse();
      }
    });
    
    window.addEventListener('pmu:supprimer-course', async (e) => {
      await PMUDatabase.supprimerCourse(e.detail.id);
      this.afficherHistorique();
    });
    
    setInterval(() => this.autoSave(), 30000);
  }

  afficherVueAccueil() {
    this.cacherToutesVues();
    document.getElementById('vue-accueil').style.display = 'block';
  }

  afficherVueSaisie() {
    this.cacherToutesVues();
    document.getElementById('vue-saisie').style.display = 'block';
    ManualEntry.genererFormulaire(16);
  }

  afficherVueAnalyse() {
    this.cacherToutesVues();
    document.getElementById('vue-analyse').style.display = 'block';
    
    if (this.course) {
      UIRenderer.renderTableauChevaux(this.course.chevaux);
      MethodesRenderer.renderZoneSaisie(this.course);
      this.preremplirAideComptage(this.course);
      this.calculer();
    }
  }

  async afficherHistorique() {
    this.cacherToutesVues();
    document.getElementById('vue-historique').style.display = 'block';
    
    const courses = await PMUDatabase.getCourses();
    UIRenderer.renderHistorique(courses);
    
    const stats = await PMUDatabase.getStatistiques();
    UIRenderer.renderStats(stats);
  }

  cacherToutesVues() {
    ['vue-accueil', 'vue-saisie', 'vue-analyse', 'vue-historique'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  async importerPDF() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      PMUModals.chargement('Analyse du PDF...');
      
      try {
        const course = await PDFParser.parse(file);
        this.course = course;
        this.appliquerParamsDetectes(course);
        PMUModals.fermer();
        this.afficherVueAnalyse();

        if (course.avertissements && course.avertissements.length > 0) {
          PMUModals.info('⚠️ Vérification recommandée', course.avertissements.join('<br>'));
        }
      } catch (err) {
        PMUModals.fermer();
        alert('Erreur: ' + err.message);
      }
    };
    
    input.click();
  }

  /**
   * Met à jour les sélecteurs de paramètres avec les valeurs détectées
   * automatiquement dans le PDF importé (hippodrome, distance, corde).
   */
  appliquerParamsDetectes(course) {
    if (course.hippodrome && course.hippodrome !== 'Inconnu') {
      this.params.hippodrome = course.hippodrome;
      const select = document.getElementById('hippodrome-select');
      if (select) {
        const optionExiste = Array.from(select.options).some(o => o.value === course.hippodrome);
        if (!optionExiste) {
          const opt = document.createElement('option');
          opt.value = course.hippodrome;
          opt.textContent = course.hippodrome;
          select.appendChild(opt);
        }
        select.value = course.hippodrome;
      }
      this.mettreAJourDistances();
    }

    if (course.distance) {
      this.params.distance = course.distance;
      const select = document.getElementById('distance-select');
      if (select) {
        const optionExiste = Array.from(select.options).some(o => o.value === course.distance);
        if (!optionExiste) {
          const opt = document.createElement('option');
          opt.value = course.distance;
          opt.textContent = course.distance;
          select.appendChild(opt);
        }
        select.value = course.distance;
      }
    }

    if (course.corde) {
      this.params.corde = course.corde;
      const select = document.getElementById('corde-select');
      if (select) select.value = course.corde;
    }

    if (course.handicapDivise) {
      PMUModals.info(
        '🏁 Handicap divisé détecté',
        'Cette course est un handicap divisé : vérifie les numéros de corde de chaque cheval dans le tableau, ils peuvent différer de la numérotation habituelle.'
      );
    }
  }

  /**
   * Pré-remplit la zone de saisie "Méthode 21/21" avec la liste presse
   * détectée automatiquement dans le PDF (purement indicatif — Karamoko
   * reste libre de corriger ou ignorer cette suggestion).
   */
  preremplirAideComptage(course) {
    if (!course.pronosticPresse || Object.keys(course.pronosticPresse).length === 0) return;

    const premierJournal = Object.keys(course.pronosticPresse)[0];
    const liste = course.pronosticPresse[premierJournal];
    const inputListe = document.getElementById('input-aide-liste');
    const inputPartants = document.getElementById('input-aide-partants');

    if (inputListe) inputListe.value = liste.join(', ');
    if (inputPartants && course.nbPartants) inputPartants.value = course.nbPartants;
  }

  nouvelleSaisie() {
    this.course = null;
    this.afficherVueSaisie();
  }

  calculer() {
    if (!this.course || !this.course.chevaux.length) return;
    
    this.mettreAJourDonneesTableau();
    
    const paramsValidation = Validator.validerParams(this.params);
    this.params = paramsValidation.params;

    const methodesInput = MethodesRenderer.lireValeursSaisies();
    
    this.analyse = SinayokoEngine.analyserCourse(this.course, this.params, methodesInput);
    
    UIRenderer.updateScores(this.analyse.analyses.tousScores);
    UIRenderer.renderFavoris(this.analyse.analyses.favoris);
    UIRenderer.renderConsensus(this.analyse.analyses.consensus);
    UIRenderer.renderOutsiders(this.analyse.analyses.outsiders);
    UIRenderer.renderCombinaisonsConfiance(this.analyse.analyses.combinaisonsConfiance);
    MethodesRenderer.renderResultats(this.analyse.analyses);
    this.renderGraphiqueScores(this.analyse.analyses.tousScores);
    
    this.autoSave();
  }

  renderGraphiqueScores(tousScores) {
    const container = document.getElementById('chart-scores-container');
    if (!container || !tousScores.length) return;

    const data = [...tousScores]
      .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
      .map(s => ({
        label: `N°${s.numero ?? '?'}`,
        value: Math.max(s.score, 0),
        color: s.niveau.couleur
      }));

    const largeur = Math.max(400, data.length * 50);
    container.innerHTML = PMUCharts.barChart(data, { width: largeur, height: 180 });
  }

  mettreAJourDonneesTableau() {
    const rows = document.querySelectorAll('#tableau-chevaux tbody tr');
    
    rows.forEach((row, i) => {
      if (this.course.chevaux[i]) {
        const nom = row.querySelector('.input-nom')?.value?.trim();
        const cote = row.querySelector('.input-cote')?.value;
        const corde = row.querySelector('.input-corde')?.value;
        const perfs = Array.from(row.querySelectorAll('.input-perf')).map(p => p.value);
        
        if (nom) {
          this.course.chevaux[i].nom = nom;
          this.course.chevaux[i].cote = parseFloat(cote) || 0;
          this.course.chevaux[i].corde = corde ? parseInt(corde, 10) : null;
          this.course.chevaux[i].performances = perfs.map(p => parseInt(p) || 0);
        }
      }
    });
  }

  async sauvegarderCourse() {
    if (!this.course) return;
    
    try {
      const id = await PMUDatabase.sauvegarderCourse(this.course);
      alert(`Course sauvegardée (ID: ${id})`);
    } catch (e) {
      alert('Erreur de sauvegarde: ' + e.message);
    }
  }

  async autoSave() {
    if (this.course) {
      await PMUDatabase.sauvegardeAuto(this.course);
    }
  }

  exporter() {
    if (!this.course) return;
    
    PMUExporter.exportCourseRapide(this.course, this.analyse?.analyses);
    alert('Export réussi !');
  }

  mettreAJourDistances() {
    const hippodrome = HippodromeData[this.params.hippodrome];
    const select = document.getElementById('distance-select');
    
    if (hippodrome && select) {
      select.innerHTML = hippodrome.distances.map(d => 
        `<option value="${d}">${d}</option>`
      ).join('');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new KaramokoPMApp();
  window.app.init();
});