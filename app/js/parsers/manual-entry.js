/**
 * MANUAL ENTRY - Saisie manuelle des courses
 * Interface simple et rapide pour entrer les données
 */

const ManualEntry = {
  /**
   * Génère un formulaire de saisie pour N chevaux
   */
  genererFormulaire(nbChevaux = 16) {
    const container = document.getElementById('manual-entry-container');
    if (!container) return;

    let html = `
      <div class="manual-entry-header">
        <h3>✏️ Saisie Manuelle</h3>
        <div class="manual-controls">
          <label>Nb chevaux: <input type="number" id="nb-chevaux" value="${nbChevaux}" min="2" max="24" class="small-input"></label>
          <button id="btn-generer-form" class="btn-secondary">Générer</button>
          <button id="btn-remplir-demo" class="btn-secondary">🎲 Démo</button>
        </div>
      </div>
      <div class="manual-entry-form">
        <div class="form-row header">
          <span>N°</span>
          <span>Nom</span>
          <span>Corde</span>
          <span>Cote</span>
          <span>P1</span>
          <span>P2</span>
          <span>P3</span>
          <span>P4</span>
          <span>P5</span>
        </div>
    `;

    for (let i = 1; i <= nbChevaux; i++) {
      html += `
        <div class="form-row" data-index="${i}">
          <span class="numero">${i}</span>
          <input type="text" class="input-nom" placeholder="Cheval ${i}" maxlength="30">
          <input type="number" class="input-corde" placeholder="${i}" min="1" max="30">
          <input type="number" class="input-cote" placeholder="10" min="1" max="100" step="0.1" value="10">
          <input type="number" class="input-perf" placeholder="0" min="0" max="9" value="0">
          <input type="number" class="input-perf" placeholder="0" min="0" max="9" value="0">
          <input type="number" class="input-perf" placeholder="0" min="0" max="9" value="0">
          <input type="number" class="input-perf" placeholder="0" min="0" max="9" value="0">
          <input type="number" class="input-perf" placeholder="0" min="0" max="9" value="0">
        </div>
      `;
    }

    html += `
      </div>
      <div class="manual-actions">
        <button id="btn-valider-saisie" class="btn-primary">✅ Valider la saisie</button>
        <button id="btn-effacer" class="btn-danger">🗑️ Effacer tout</button>
      </div>
    `;

    container.innerHTML = html;
    this.attachEvents();
  },

  attachEvents() {
    document.getElementById('btn-generer-form')?.addEventListener('click', () => {
      const nb = parseInt(document.getElementById('nb-chevaux')?.value) || 16;
      this.genererFormulaire(nb);
    });

    document.getElementById('btn-remplir-demo')?.addEventListener('click', () => {
      this.remplirDemo();
    });

    document.getElementById('btn-valider-saisie')?.addEventListener('click', () => {
      this.validerSaisie();
    });

    document.getElementById('btn-effacer')?.addEventListener('click', () => {
      if (confirm('Effacer toutes les données ?')) {
        this.genererFormulaire(16);
      }
    });

    // Navigation au clavier (Tab entre les champs)
    document.querySelectorAll('.form-row input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const inputs = Array.from(document.querySelectorAll('.form-row input'));
          const currentIndex = inputs.indexOf(e.target);
          if (currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          }
        }
      });
    });
  },

  /**
   * Remplit avec des données de démonstration
   */
  remplirDemo() {
    const nomsDemo = [
      'ETOILE D\'OR', 'VENT DU NORD', 'FLEUR DE LYS', 'TONNERRE',
      'LUNE ARGENTEE', 'SOLEIL LEVANT', 'VENT D\'OUEST', 'ORAGE NOIR',
      'NEIGE ETERNELLE', 'FEU SACRE', 'ROCHE BRILLANTE', 'RIVIERE D\'OR',
      'MONTAGNE BLEUE', 'CIEL ETOILE', 'TEMPETE ROUGE', 'OCEAN PROFOND'
    ];

    const rows = document.querySelectorAll('.form-row[data-index]');
    rows.forEach((row, i) => {
      const nom = row.querySelector('.input-nom');
      const cote = row.querySelector('.input-cote');
      const perfs = row.querySelectorAll('.input-perf');

      if (nom) nom.value = nomsDemo[i] || `Cheval ${i + 1}`;
      if (cote) cote.value = (5 + Math.random() * 25).toFixed(1);
      
      perfs.forEach(perf => {
        perf.value = Math.floor(Math.random() * 7);
      });
    });
  },

  /**
   * Valide et retourne les données saisies
   */
  validerSaisie() {
    const rows = document.querySelectorAll('.form-row[data-index]');
    const chevaux = [];

    rows.forEach(row => {
      const nom = row.querySelector('.input-nom')?.value?.trim();
      const cote = row.querySelector('.input-cote')?.value;
      const corde = row.querySelector('.input-corde')?.value;
      const perfs = Array.from(row.querySelectorAll('.input-perf')).map(p => p.value);

      if (nom && cote) {
        const cheval = {
          numero: parseInt(row.dataset.index),
          nom: nom,
          corde: corde ? parseInt(corde, 10) : parseInt(row.dataset.index, 10),
          cote: parseFloat(cote) || 0,
          performances: perfs.map(p => parseInt(p) || 0),
          source: 'manuel'
        };

        const validation = Validator.validerCheval(cheval);
        if (validation.valide) {
          chevaux.push(validation.cheval);
        }
      }
    });

    if (chevaux.length === 0) {
      alert('Aucun cheval valide saisi. Vérifiez les noms et cotes.');
      return null;
    }

    const course = {
      hippodrome: document.getElementById('hippodrome-select')?.value || 'Vincennes',
      date: new Date().toISOString(),
      chevaux: chevaux,
      source: 'manuel'
    };

    // Émettre l'événement de course prête
    window.dispatchEvent(new CustomEvent('pmu:course-pret', { detail: course }));
    
    return course;
  }
};