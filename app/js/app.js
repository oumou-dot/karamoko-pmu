/**
 * KARAMOKO PMU PRO - Application Principale v3
 * Thème "Piste Lumineuse" — fond gris clair
 */

class KaramokoPMApp {
  constructor() {
    this.course = null;
    this.analyse = null;
    this.params = { hippodrome: 'Vincennes', distance: '2700m', corde: 'gauche', meteo: 'bon' };
  }

  async init() {
    await loadHippodromeData();
    await PMUDatabase.init();

    this.peuplerSelectHippodrome();
    this.mettreAJourDistances();
    this.attachGlobalEvents();
    this.afficherVueAccueil();
    await this.mettreAJourStats();

    const autoSave = await PMUDatabase.recupererAutoSave();
    if (autoSave) {
      if (confirm('Une session précédente a été trouvée. Reprendre où vous en étiez ?')) {
        this.course = autoSave;
        this.afficherVueAnalyse();
      }
    }

    BackupManager.startAutoSave(() => this.course ? { course: this.course, params: this.params } : null);
    setInterval(() => this.autoSave(), 30000);
  }

  // ── Events ──────────────────────────────────────────────────────────────

  attachGlobalEvents() {
    // Navigation
    document.querySelectorAll('.nav-btn[data-vue]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this['afficherVue' + btn.dataset.vue.charAt(0).toUpperCase() + btn.dataset.vue.slice(1)]?.();
      });
    });

    // Upload accueil
    document.getElementById('btn-import-pdf-accueil')?.addEventListener('click', () => {
      const z = document.getElementById('upload-zone-container');
      if (z) { z.style.display = z.style.display === 'none' ? 'block' : 'none'; }
    });

    document.getElementById('file-input')?.addEventListener('change', e => {
      if (e.target.files[0]) this.traiterFichier(e.target.files[0]);
    });

    // Upload vue saisie
    document.getElementById('btn-import-pdf-saisie')?.addEventListener('click', () =>
      document.getElementById('file-input-saisie')?.click());

    document.getElementById('file-input-saisie')?.addEventListener('change', e => {
      if (e.target.files[0]) this.traiterFichier(e.target.files[0]);
    });

    // Drag & drop sur la zone accueil
    const uploadZone = document.getElementById('upload-zone');
    if (uploadZone) {
      uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
      uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
      uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) this.traiterFichier(e.dataTransfer.files[0]);
      });
    }

    // Accueil → saisie manuelle
    document.getElementById('btn-saisie-manuelle-accueil')?.addEventListener('click', () => {
      this.naviguerVers('saisie');
      this.nouvelleSaisie();
    });

    // Params
    document.getElementById('hippodrome-select')?.addEventListener('change', e => {
      this.params.hippodrome = e.target.value;
      this.mettreAJourDistances();
    });
    document.getElementById('distance-select')?.addEventListener('change', e => this.params.distance = e.target.value);
    document.getElementById('corde-select')?.addEventListener('change', e => this.params.corde = e.target.value);
    document.getElementById('type-course-select')?.addEventListener('change', e => this.params.typeCourse = e.target.value);

    // Analyse
    document.getElementById('btn-recalculer')?.addEventListener('click', () => this.calculer());
    document.getElementById('btn-sauvegarder')?.addEventListener('click', () => this.sauvegarderCourse());
    document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exporter());

    // Historique
    document.getElementById('btn-vider-historique')?.addEventListener('click', async () => {
      if (confirm('Supprimer tout l\'historique ?')) {
        await PMUDatabase.viderHistorique?.();
        this.afficherVueHistorique();
      }
    });

    // Events globaux
    window.addEventListener('pmu:course-pret', e => { this.course = e.detail; this.naviguerVers('analyse'); this.afficherVueAnalyse(); });
    window.addEventListener('pmu:recalculer', () => this.calculer());
    window.addEventListener('pmu:charger-course', async e => {
      const course = await PMUDatabase.getCourse(e.detail.id);
      if (course) { this.course = course; this.naviguerVers('analyse'); this.afficherVueAnalyse(); }
    });
    window.addEventListener('pmu:supprimer-course', async e => {
      await PMUDatabase.supprimerCourse(e.detail.id);
      this.afficherVueHistorique();
    });
  }

  naviguerVers(vue) {
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.vue === vue);
    });
  }

  // ── Vues ────────────────────────────────────────────────────────────────

  cacherToutesVues() {
    document.querySelectorAll('.vue').forEach(v => v.style.display = 'none');
  }

  afficherVueAccueil() {
    this.cacherToutesVues();
    document.getElementById('vue-accueil').style.display = 'block';
    this.mettreAJourStats();
  }

  afficherVueSaisie() {
    this.cacherToutesVues();
    document.getElementById('vue-saisie').style.display = 'block';
    ManualEntry.genererFormulaire(this.course?.nbPartants || 16);
    if (this.course) {
      // Pré-remplir les sélecteurs depuis la course actuelle
      this.appliquerParamsDetectes(this.course);
    }
  }

  afficherVueAnalyse() {
    this.cacherToutesVues();
    document.getElementById('vue-analyse').style.display = 'block';

    if (this.course) {
      // Badge nb partants
      const badge = document.getElementById('nb-partants-badge');
      if (badge) badge.textContent = `${this.course.chevaux?.length || 0} partants`;

      // Infos course
      const panelInfo = document.getElementById('panel-course-info');
      if (panelInfo) panelInfo.style.display = '';
      const elHippo = document.getElementById('info-hippodrome');
      if (elHippo) elHippo.textContent = this.course.hippodrome || 'Course';
      const elDetails = document.getElementById('info-course-details');
      if (elDetails) elDetails.textContent = [
        this.course.date ? new Date(this.course.date).toLocaleDateString('fr-FR') : '',
        this.course.distance,
        this.course.corde ? 'Corde ' + this.course.corde : '',
        this.course.typeCourse
      ].filter(Boolean).join(' · ');

      UIRenderer.renderTableauChevaux(this.course.chevaux);
      MethodesRenderer.renderZoneSaisie(this.course);

      // Pré-remplir presse si détectée dans le PDF
      if (this.course.pronosticPresse && Object.keys(this.course.pronosticPresse).length) {
        MethodesRenderer.preremplirPresse(this.course.pronosticPresse);
      }

      this.calculer();
    }
  }

  async afficherVueHistorique() {
    this.cacherToutesVues();
    document.getElementById('vue-historique').style.display = 'block';
    const courses = await PMUDatabase.getCourses();
    UIRenderer.renderHistorique(courses);
  }

  // ── Import multi-format ──────────────────────────────────────────────────

  async traiterFichier(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const nom = file.name;

    PMUModals.chargement(`Analyse du fichier "${nom}"…`);

    try {
      let course;

      if (ext === 'pdf') {
        course = await PDFParser.parse(file);
      } else if (['png','jpg','jpeg','webp'].includes(ext)) {
        // PDF scanné / image → on essaie le parser PDF qui peut gérer les images
        // via pdf.js (si le fichier est reconnu), sinon on crée une course vide
        try {
          course = await PDFParser.parse(file);
        } catch {
          course = this.creerCourseVide(nom);
          PMUModals.fermer();
          PMUModals.info('📷 Image détectée', 'L\'image a été reçue mais ne peut pas être lue automatiquement (PDF scanné non reconnu). Vous pouvez saisir les données manuellement ci-dessous.');
        }
      } else if (['doc','docx'].includes(ext)) {
        course = await this.parserWord(file);
      } else if (['csv','txt'].includes(ext)) {
        course = await this.parserCSV(file);
      } else {
        throw new Error('Format non supporté. Utilisez PDF, Word, CSV ou image JPG/PNG.');
      }

      this.course = course;
      this.appliquerParamsDetectes(course);
      PMUModals.fermer();
      this.naviguerVers('analyse');
      this.afficherVueAnalyse();

      if (course.avertissements?.length) {
        PMUModals.info('⚠️ Vérification recommandée', course.avertissements.join('<br>'));
      }

    } catch (err) {
      PMUModals.fermer();
      PMUModals.info('❌ Erreur d\'import', err.message || String(err));
    }
  }

  creerCourseVide(nom) {
    const chevaux = [];
    for (let i = 1; i <= 10; i++) {
      chevaux.push({ numero: i, nom: `Cheval ${i}`, cote: 10, corde: i, performances: [0,0,0,0,0], source: 'manuel' });
    }
    return { nomFichier: nom, hippodrome: 'Inconnu', date: new Date().toISOString(), chevaux };
  }

  async parserWord(file) {
    // Word → texte brut via FileReader, puis parser ligne par ligne
    const text = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsText(file);
    });
    return this.parserTexte(text, file.name);
  }

  async parserCSV(file) {
    const text = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsText(file, 'utf-8');
    });
    return this.parserTexte(text, file.name);
  }

  parserTexte(text, nom) {
    const chevaux = [];
    const lignes = text.split(/\r?\n/).filter(l => l.trim());

    for (const ligne of lignes) {
      // Format attendu : numéro;nom;corde;cote;p1;p2;p3;p4;p5
      const cols = ligne.split(/[;,\t]+/).map(c => c.trim());
      if (cols.length < 3) continue;
      const num = parseInt(cols[0]);
      if (!Number.isInteger(num) || num < 1) continue;
      chevaux.push({
        numero: num,
        nom: cols[1] || `Cheval ${num}`,
        corde: parseInt(cols[2]) || num,
        cote: parseFloat(cols[3]) || 10,
        performances: [4,5,6,7,8].map(i => parseInt(cols[i]) || 0),
        source: 'csv'
      });
    }

    if (!chevaux.length) throw new Error('Aucun cheval trouvé dans ce fichier. Vérifiez le format (N°;Nom;Corde;Cote;P1;P2;P3;P4;P5).');

    return { nomFichier: nom, hippodrome: 'Inconnu', date: new Date().toISOString(), chevaux };
  }

  // ── Calcul ──────────────────────────────────────────────────────────────

  calculer() {
    if (!this.course?.chevaux?.length) return;

    this.mettreAJourDonneesTableau();

    const pv = Validator.validerParams(this.params);
    this.params = pv.params;

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
      .map(s => ({ label: `N°${s.numero ?? '?'}`, value: Math.max(s.score, 0), color: s.niveau.couleur }));

    const largeur = Math.max(320, data.length * 52);
    container.innerHTML = PMUCharts.barChart(data, { width: largeur, height: 200 });
  }

  mettreAJourDonneesTableau() {
    const rows = document.querySelectorAll('#tableau-chevaux tbody tr');
    rows.forEach((row, i) => {
      if (!this.course.chevaux[i]) return;
      const nom   = row.querySelector('.input-nom')?.value?.trim();
      const cote  = row.querySelector('.input-cote')?.value;
      const corde = row.querySelector('.input-corde')?.value;
      const perfs = Array.from(row.querySelectorAll('.input-perf')).map(p => p.value);
      if (nom !== undefined) {
        if (nom) this.course.chevaux[i].nom = nom;
        this.course.chevaux[i].cote  = parseFloat(cote) || 0;
        this.course.chevaux[i].corde = corde ? parseInt(corde, 10) : null;
        this.course.chevaux[i].performances = perfs.map(p => parseInt(p) || 0);
      }
    });
  }

  // ── Params ──────────────────────────────────────────────────────────────

  peuplerSelectHippodrome() {
    const select = document.getElementById('hippodrome-select');
    if (!select || !HippodromeData) return;
    select.innerHTML = Object.keys(HippodromeData)
      .map(h => `<option value="${h}">${h}</option>`).join('');
  }

  mettreAJourDistances() {
    const hippodrome = HippodromeData?.[this.params.hippodrome];
    const select = document.getElementById('distance-select');
    if (!hippodrome || !select) return;
    select.innerHTML = hippodrome.distances.map(d => `<option value="${d}">${d}</option>`).join('');
    if (hippodrome.distances[0]) this.params.distance = hippodrome.distances[0];
  }

  appliquerParamsDetectes(course) {
    if (course.hippodrome && course.hippodrome !== 'Inconnu') {
      this.params.hippodrome = course.hippodrome;
      const sel = document.getElementById('hippodrome-select');
      if (sel) {
        if (!Array.from(sel.options).some(o => o.value === course.hippodrome)) {
          const opt = document.createElement('option');
          opt.value = opt.textContent = course.hippodrome;
          sel.appendChild(opt);
        }
        sel.value = course.hippodrome;
      }
      this.mettreAJourDistances();
    }
    if (course.distance) {
      this.params.distance = course.distance;
      const sel = document.getElementById('distance-select');
      if (sel) {
        if (!Array.from(sel.options).some(o => o.value === course.distance)) {
          const opt = document.createElement('option');
          opt.value = opt.textContent = course.distance;
          sel.appendChild(opt);
        }
        sel.value = course.distance;
      }
    }
    if (course.corde) {
      this.params.corde = course.corde;
      const sel = document.getElementById('corde-select');
      if (sel) sel.value = course.corde;
    }
    if (course.handicapDivise) {
      PMUModals.info('🏁 Handicap divisé détecté',
        'Vérifiez les numéros de corde dans le tableau (colonne "Corde") — ils peuvent différer de la numérotation habituelle.');
    }
  }

  nouvelleSaisie() {
    this.course = null;
    ManualEntry.genererFormulaire(16);
  }

  // ── Sauvegarde / Export ──────────────────────────────────────────────────

  async sauvegarderCourse() {
    if (!this.course) return;
    try {
      const id = await PMUDatabase.sauvegarderCourse(this.course);
      this.showToast('💾 Course sauvegardée !', 'success');
      await this.mettreAJourStats();
    } catch (e) {
      this.showToast('Erreur : ' + e.message, 'error');
    }
  }

  async autoSave() {
    if (this.course) await PMUDatabase.sauvegardeAuto(this.course);
  }

  exporter() {
    if (!this.course) return;
    PMUExporter.exportCourseRapide(this.course, this.analyse?.analyses);
    this.showToast('📥 Export CSV téléchargé', 'success');
  }

  async mettreAJourStats() {
    try {
      const stats = await PMUDatabase.getStatistiques();
      const el = id => document.getElementById(id);
      if (el('stat-total-courses')) el('stat-total-courses').textContent = stats.totalCourses || 0;
      if (el('stat-hippodromes')) el('stat-hippodromes').textContent = Object.keys(stats.hippodromes || {}).length;
      if (el('stat-derniere')) el('stat-derniere').textContent = stats.derniereCourse
        ? new Date(stats.derniereCourse).toLocaleDateString('fr-FR') : '—';
    } catch {}
  }

  showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new KaramokoPMApp();
  window.app.init();
});
