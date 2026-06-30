/**
 * RENDERER — Méthodes personnelles de Karamoko (v3)
 * Gazette, Doublons, Méthode 21/21, Scores Spéciaux,
 * + zone PRESSE 4 journaux avec Top 3 automatique
 */

const MethodesRenderer = {
  echapper(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  },

  renderZoneSaisie(course, containerId = 'methodes-saisie-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const speciauxDefaut = MethodesKaramoko.SCORES_SPECIAUX_DEFAUT.join(', ');

    container.innerHTML = `
      <!-- PRESSE : 4 journaux + Top 3 -->
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">📰 Pronostics de la presse</h2>
          <button class="btn btn-primary" id="btn-calculer-top3">🏆 Calculer Top 3</button>
        </div>
        <div class="panel-body">
          <p style="font-size:.84rem;color:var(--text-muted);margin-bottom:14px;">
            Saisissez les numéros dans l'ordre donné par chaque journal (ex : <em>1, 3, 2, 10, 12, 9, 8, 6</em>)
          </p>
          <div class="presse-grid">
            <div class="presse-card">
              <div class="presse-card-header parisien">LE PARISIEN</div>
              <textarea id="presse-parisien" placeholder="1, 3, 2, 10, 12, 9, 8, 6" rows="2"></textarea>
            </div>
            <div class="presse-card">
              <div class="presse-card-header turfr">TURF.FR</div>
              <textarea id="presse-turfr" placeholder="1, 3, 8, 2, 10, 4, 9, 12" rows="2"></textarea>
            </div>
            <div class="presse-card">
              <div class="presse-card-header alsace">ALSACE</div>
              <textarea id="presse-alsace" placeholder="1, 8, 2, 3, 5, 9, 10, 12" rows="2"></textarea>
            </div>
            <div class="presse-card">
              <div class="presse-card-header equidia">EQUIDIA</div>
              <textarea id="presse-equidia" placeholder="8, 1, 5, 9, 10, 3, 2, 6" rows="2"></textarea>
            </div>
          </div>
          <div id="top3-container" style="margin-top:16px;display:none;"></div>
        </div>
      </div>

      <!-- MÉTHODES PERSONNELLES -->
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">🎯 Mes méthodes personnelles</h2>
        </div>
        <div class="panel-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:clamp(12px,2vw,18px);">
            <div class="form-group">
              <label class="form-label tooltip" data-tip="Les 2 numéros donnés par le site Gazette">
                📰 Gazette <span style="color:var(--text-muted);font-weight:400;">(2 chevaux)</span>
              </label>
              <input type="text" class="form-input" id="input-gazette" placeholder="ex : 13, 7">
            </div>
            <div class="form-group">
              <label class="form-label tooltip" data-tip="Résultat de ta méthode 21/21, calculée à la main">
                🔢 Méthode 21/21 <span style="color:var(--text-muted);font-weight:400;">(2 chevaux)</span>
              </label>
              <input type="text" class="form-input" id="input-21sur21" placeholder="ex : 6, 10">
            </div>
            <div class="form-group">
              <label class="form-label tooltip" data-tip="Scores Sinayoko considérés comme spéciaux">
                ⭐ Scores spéciaux
              </label>
              <input type="text" class="form-input" id="input-scores-speciaux"
                     placeholder="${speciauxDefaut}" value="${speciauxDefaut}">
            </div>
          </div>

          <div class="divider"></div>

          <!-- Aide comptage 21/21 -->
          <div class="accordion" id="accordion-aide-21sur21">
            <div class="accordion-header" onclick="document.getElementById('accordion-aide-21sur21').classList.toggle('open')">
              <span>🧮 Outil d'aide au comptage 21/21 <span style="font-weight:400;font-size:.82rem;">(indicatif)</span></span>
              <span class="accordion-icon">▾</span>
            </div>
            <div class="accordion-body">
              <p style="font-size:.84rem;color:var(--text-muted);margin-bottom:12px;">
                Colle la liste d'un journal ci-dessous : l'outil numérotera chaque cheval
                à partir de <em>nb partants − 3 + 1</em>, pour t'aider à repérer les "21".
                Le résultat final reste à saisir toi-même dans "Méthode 21/21".
              </p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
                <div class="form-group" style="flex:2;min-width:180px;margin-bottom:0;">
                  <label class="form-label">Liste presse</label>
                  <input type="text" class="form-input" id="input-aide-liste" placeholder="ex : 1, 3, 2, 10, 12, 9, 8, 6">
                </div>
                <div class="form-group" style="flex:1;min-width:110px;margin-bottom:0;">
                  <label class="form-label">Nb partants</label>
                  <input type="number" class="form-input" id="input-aide-partants"
                         min="2" max="30" value="${course?.nbPartants || 16}">
                </div>
                <button class="btn btn-secondary" id="btn-aide-compter">Compter</button>
              </div>
              <div id="aide-comptage-resultat" style="margin-top:12px;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachZoneSaisieEvents();
  },

  attachZoneSaisieEvents() {
    ['input-gazette', 'input-21sur21', 'input-scores-speciaux'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () =>
        window.dispatchEvent(new CustomEvent('pmu:recalculer')));
    });

    document.getElementById('btn-calculer-top3')?.addEventListener('click', () =>
      this.calculerEtAfficherTop3());

    document.getElementById('btn-aide-compter')?.addEventListener('click', () => {
      const liste = (document.getElementById('input-aide-liste')?.value || '')
        .split(/[,\-\s\/]+/).map(n => parseInt(n)).filter(n => Number.isInteger(n));
      const nb = parseInt(document.getElementById('input-aide-partants')?.value) || 16;
      if (liste.length) this.renderAideComptage(
        MethodesKaramoko.genererAideComptage21sur21(liste, nb));
    });

    // Remplir automatiquement l'aide avec le Parisien si dispo
    document.getElementById('presse-parisien')?.addEventListener('change', (e) => {
      const inputAide = document.getElementById('input-aide-liste');
      if (inputAide && !inputAide.value) inputAide.value = e.target.value;
    });
  },

  // ── Calcul Top 3 presse ──────────────────────────────────────────────────
  calculerEtAfficherTop3() {
    const journaux = {
      'Parisien': document.getElementById('presse-parisien')?.value,
      'Turf.fr':  document.getElementById('presse-turfr')?.value,
      'Alsace':   document.getElementById('presse-alsace')?.value,
      'Equidia':  document.getElementById('presse-equidia')?.value,
    };

    const parseListe = str => (str || '').split(/[,\-\s\/]+/)
      .map(n => parseInt(n)).filter(n => Number.isInteger(n) && n >= 1 && n <= 30);

    // Compte les apparitions de chaque numéro parmi les listes saisies
    const scores = new Map();
    let totalJournaux = 0;

    for (const [journal, val] of Object.entries(journaux)) {
      const nums = parseListe(val);
      if (!nums.length) continue;
      totalJournaux++;
      const max = nums.length;
      nums.forEach((n, i) => {
        // Pondération : 1ère place = max pts, dernière = 1 pt
        const pts = max - i;
        scores.set(n, (scores.get(n) || 0) + pts);
      });
    }

    if (totalJournaux === 0) {
      this.showToast('Saisissez au moins un journal pour calculer le Top 3', 'error');
      return;
    }

    // Trier par score décroissant → Top 3
    const classement = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const totalPts = classement.reduce((s, [,v]) => s + v, 0);
    this.renderTop3(classement, totalJournaux, totalPts);

    // Déclencher recalcul avec ces données
    window.dispatchEvent(new CustomEvent('pmu:recalculer'));
  },

  renderTop3(classement, nbJournaux, totalPts) {
    const container = document.getElementById('top3-container');
    if (!container) return;

    container.style.display = 'block';

    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];

    let items = classement.map(([num, pts], i) => {
      const pct = Math.round((pts / totalPts) * 100);
      return `
        <div class="top3-item ${classes[i]}">
          <div class="top3-medal">${medals[i]}</div>
          <div class="top3-num">${num}</div>
          <div class="top3-pct">${pct}% des voix</div>
          <div class="top3-name">TOP ${i+1}</div>
        </div>
      `;
    }).join('');

    // Compléter avec des cases vides si < 3 journaux
    while (classement.length < 3) {
      items += `<div class="top3-item" style="opacity:.35;"><div class="top3-medal">—</div><div class="top3-num">?</div><div class="top3-name">Manque de données</div></div>`;
      classement.push([null, 0]);
    }

    container.innerHTML = `
      <div class="top3-container">
        <div class="top3-title">🏆 Synthèse des ${nbJournaux} journal${nbJournaux > 1 ? 'x' : ''} — Numéros les plus plébiscités</div>
        <div class="top3-grid">${items}</div>
      </div>
    `;
  },

  showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  },

  renderAideComptage(aide) {
    const container = document.getElementById('aide-comptage-resultat');
    if (!container) return;

    let html = `<div class="table-container"><table class="pmu-table">
      <thead><tr><th>Position</th><th>N° cheval</th><th>Compte</th></tr></thead>
      <tbody>`;

    aide.forEach(a => {
      const sur21 = a.compte % 21 === 0;
      html += `<tr ${sur21 ? 'style="background:var(--green-light);font-weight:700;"' : ''}>
        <td>${a.position}</td>
        <td><strong>${a.numeroCheval}</strong></td>
        <td>${a.compte} ${sur21 ? '<span class="badge badge-success">21 !</span>' : ''}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  lireValeursSaisies() {
    return Validator.validerMethodesKaramoko({
      gazette:       document.getElementById('input-gazette')?.value,
      methode21sur21: document.getElementById('input-21sur21')?.value,
      scoresSpeciaux: document.getElementById('input-scores-speciaux')?.value
    });
  },

  lirePresseDetectee() {
    return {
      parisien: (document.getElementById('presse-parisien')?.value || '').trim(),
      turfr:    (document.getElementById('presse-turfr')?.value || '').trim(),
      alsace:   (document.getElementById('presse-alsace')?.value || '').trim(),
      equidia:  (document.getElementById('presse-equidia')?.value || '').trim(),
    };
  },

  preremplirPresse(pronosticPresse) {
    if (!pronosticPresse) return;
    const mapping = {
      'PARISIEN': 'presse-parisien',
      'TURF.FR':  'presse-turfr',
      'TURF':     'presse-turfr',
      'ALSACE':   'presse-alsace',
      'EQUIDIA':  'presse-equidia',
    };
    for (const [journal, nums] of Object.entries(pronosticPresse)) {
      const id = mapping[journal.toUpperCase()];
      const el = id && document.getElementById(id);
      if (el && !el.value && nums.length) el.value = nums.join(', ');
    }
  },

  // ── Résultats des 4 sources Karamoko ────────────────────────────────────
  renderResultats(analyses, containerId = 'methodes-resultats-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:clamp(10px,2vw,18px);">';
    html += this.renderDoublons(analyses.doublons);
    html += this.renderScoresSpeciaux(analyses.scoresSpeciaux);
    html += '</div>';
    html += this.renderCombinaisonsKaramoko(analyses);

    container.innerHTML = html;
  },

  renderDoublons(doublons) {
    if (!doublons?.length) return `<div class="gazette"><div class="gazette-header"><h3>🪞 Scores identiques</h3></div><div class="empty-state"><div class="empty-state-icon">🪞</div><div class="empty-state-title">Aucun doublon</div></div></div>`;

    let html = `<div class="gazette"><div class="gazette-header"><h3>🪞 Scores identiques</h3><span class="gazette-count">${doublons.length} groupe${doublons.length>1?'s':''}</span></div>`;
    doublons.forEach(d => {
      html += `<div class="horse-card" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="badge badge-accent">Score ${d.score}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${d.chevaux.map(c => `<span class="tag">N°${c.numero} ${this.echapper(c.cheval)}</span>`).join('')}
        </div>
      </div>`;
    });
    return html + '</div>';
  },

  renderScoresSpeciaux(speciaux) {
    if (!speciaux?.length) return `<div class="gazette"><div class="gazette-header"><h3>⭐ Scores spéciaux</h3></div><div class="empty-state"><div class="empty-state-icon">⭐</div><div class="empty-state-title">Aucun score spécial</div></div></div>`;

    let html = `<div class="gazette"><div class="gazette-header"><h3>⭐ Scores spéciaux</h3><span class="gazette-count">${speciaux.length}</span></div>`;
    speciaux.forEach(s => {
      html += `<div class="horse-card" style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span class="horse-name">N°${s.numero??'?'} ${this.echapper(s.cheval)}</span>
        <span class="badge badge-accent">${s.score}</span>
      </div>`;
    });
    return html + '</div>';
  },

  renderCombinaisonsKaramoko(analyses) {
    const { basesKaramoko, groupesBase, combinaisonsKaramoko } = analyses;
    if (!basesKaramoko?.length) return `
      <div class="panel"><div class="panel-body"><div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">Aucune combinaison personnelle</div>
        <p>Renseignez au moins une source (Gazette, 21/21, Presse…) pour générer vos combinaisons.</p>
      </div></div></div>`;

    let html = `
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">🎯 Combinaisons (bases Karamoko)</h2>
          <span class="gazette-count">${combinaisonsKaramoko.length} combinaison${combinaisonsKaramoko.length>1?'s':''}</span>
        </div>
        <div class="panel-body">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            ${basesKaramoko.map(b=>`<span class="tag">Base ${b.niveau} — ${this.echapper(b.nom)} : <strong>${b.numeros.join(', ')}</strong></span>`).join('')}
          </div>`;

    groupesBase?.forEach((groupe, i) => {
      if (!groupe.combinaisons.length) return;
      html += `
        <div class="accordion ${i===0?'open':''}" style="margin-bottom:8px;">
          <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
            <span>Base ${groupe.lettre} — Cheval N°<strong>${groupe.numeroBase}</strong>
              <span class="badge badge-outline" style="margin-left:8px;">${groupe.combinaisons.length} combo${groupe.combinaisons.length>1?'s':''}</span>
            </span>
            <span class="accordion-icon">▾</span>
          </div>
          <div class="accordion-body">
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${groupe.combinaisons.map(c=>`
                <div class="horse-card" style="padding:10px 14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                  ${c.map(n=>`<span class="tag" style="font-weight:700;">${n}</span>`).join('<span style="color:var(--green);font-weight:700;">·</span>')}
                </div>`).join('')}
            </div>
          </div>
        </div>`;
    });

    return html + '</div></div>';
  }
};
