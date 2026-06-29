/**
 * RENDERER — Méthodes personnelles de Karamoko
 * (Gazette, Doublons, Méthode 21/21, Scores Spéciaux, Combinaisons par bases)
 */

const MethodesRenderer = {
  echapper(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  },

  /**
   * Zone de saisie : Gazette + Méthode 21/21 + liste des scores spéciaux,
   * avec l'outil d'aide au comptage 21/21 (indicatif, non décisionnel).
   */
  renderZoneSaisie(course, containerId = 'methodes-saisie-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const speciauxDefaut = MethodesKaramoko.SCORES_SPECIAUX_DEFAUT.join(', ');

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">📰 Mes méthodes personnelles</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:20px;">

          <div class="form-group">
            <label class="form-label tooltip" data-tip="Saisis les 2 numéros donnés par le site Gazette">
              📰 Gazette <span style="color:var(--text-secondary);">(2 chevaux)</span>
            </label>
            <input type="text" class="form-input" id="input-gazette" placeholder="ex : 13, 7">
          </div>

          <div class="form-group">
            <label class="form-label tooltip" data-tip="Résultat de ta méthode de compte 21/21, calculée à la main">
              🔢 Méthode 21/21 <span style="color:var(--text-secondary);">(2 chevaux)</span>
            </label>
            <input type="text" class="form-input" id="input-21sur21" placeholder="ex : 6, 10">
          </div>

          <div class="form-group">
            <label class="form-label tooltip" data-tip="Valeurs de score considérées comme spéciales (par défaut : 100, 101, 106, 107)">
              ⭐ Liste des scores spéciaux
            </label>
            <input type="text" class="form-input" id="input-scores-speciaux" placeholder="${speciauxDefaut}" value="${speciauxDefaut}">
          </div>

        </div>

        <div class="divider"></div>

        <div class="accordion" id="accordion-aide-21sur21">
          <div class="accordion-header" onclick="document.getElementById('accordion-aide-21sur21').classList.toggle('open')">
            <span>🧮 Outil d'aide au comptage 21/21 (indicatif — ne remplace pas ton calcul)</span>
            <span class="accordion-icon">▾</span>
          </div>
          <div class="accordion-body">
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px;">
              Renseigne une liste de pronostic presse et le nombre de partants : l'outil numérote chaque
              cheval pour t'aider à compter visuellement (départ = nb partants − 3). Le résultat final
              reste à saisir toi-même ci-dessus, dans "Méthode 21/21".
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px;">
              <div class="form-group" style="flex:2;min-width:200px;margin-bottom:0;">
                <label class="form-label">Liste presse (ex : Parisien)</label>
                <input type="text" class="form-input" id="input-aide-liste" placeholder="ex : 1, 3, 2, 10, 12, 9, 8, 6">
              </div>
              <div class="form-group" style="flex:1;min-width:120px;margin-bottom:0;">
                <label class="form-label">Nb partants</label>
                <input type="number" class="form-input" id="input-aide-partants" min="2" max="30" value="${course?.nbPartants || 16}">
              </div>
              <button class="btn btn-secondary" id="btn-aide-compter">Compter</button>
            </div>
            <div id="aide-comptage-resultat"></div>
          </div>
        </div>
      </div>
    `;

    this.attachZoneSaisieEvents();
  },

  attachZoneSaisieEvents() {
    ['input-gazette', 'input-21sur21', 'input-scores-speciaux'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        window.dispatchEvent(new CustomEvent('pmu:recalculer'));
      });
    });

    document.getElementById('btn-aide-compter')?.addEventListener('click', () => {
      const liste = (document.getElementById('input-aide-liste')?.value || '')
        .split(/[,\-\s/]+/)
        .map(n => parseInt(n, 10))
        .filter(n => Number.isInteger(n));
      const nbPartants = parseInt(document.getElementById('input-aide-partants')?.value, 10) || 16;

      if (liste.length === 0) return;

      const aide = MethodesKaramoko.genererAideComptage21sur21(liste, nbPartants);
      this.renderAideComptage(aide);
    });
  },

  renderAideComptage(aide) {
    const container = document.getElementById('aide-comptage-resultat');
    if (!container) return;

    let html = `<div class="table-container"><table class="pmu-table"><thead><tr>
      <th>Position presse</th><th>N° cheval</th><th>Compte</th>
    </tr></thead><tbody>`;

    aide.forEach(a => {
      const sur21 = a.compte % 21 === 0;
      html += `<tr ${sur21 ? 'style="background:rgba(233,69,96,0.15);"' : ''}>
        <td>${a.position}</td>
        <td><strong>${a.numeroCheval}</strong></td>
        <td>${a.compte}${sur21 ? ' <span class="badge badge-accent">21</span>' : ''}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  /**
   * Lit les valeurs actuellement saisies dans la zone de saisie (à appeler
   * avant de relancer le calcul).
   */
  lireValeursSaisies() {
    return Validator.validerMethodesKaramoko({
      gazette: document.getElementById('input-gazette')?.value,
      methode21sur21: document.getElementById('input-21sur21')?.value,
      scoresSpeciaux: document.getElementById('input-scores-speciaux')?.value
    });
  },

  /**
   * Affiche les 2 sources calculées automatiquement : doublons et scores
   * spéciaux, + les bases et combinaisons générées par croisement.
   */
  renderResultats(analyses, containerId = 'methodes-resultats-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:20px;">';
    html += this.renderDoublons(analyses.doublons);
    html += this.renderScoresSpeciaux(analyses.scoresSpeciaux);
    html += '</div>';
    html += this.renderCombinaisonsKaramoko(analyses);

    container.innerHTML = html;
  },

  renderDoublons(doublons) {
    if (!doublons || doublons.length === 0) {
      return `<div class="gazette"><h3 style="margin-bottom:10px;">🪞 Scores identiques</h3>
        <div class="empty-state"><div class="empty-state-icon">🪞</div><div class="empty-state-title">Aucun doublon détecté</div></div></div>`;
    }

    let html = `<div class="gazette"><h3 style="margin-bottom:15px;">🪞 Scores identiques (doublons)</h3>`;
    doublons.forEach(d => {
      html += `
        <div class="horse-card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span class="badge badge-accent">Score ${d.score}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${d.chevaux.map(c => `<span class="tag">N°${c.numero} ${this.echapper(c.cheval)}</span>`).join('')}
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderScoresSpeciaux(speciaux) {
    if (!speciaux || speciaux.length === 0) {
      return `<div class="gazette"><h3 style="margin-bottom:10px;">⭐ Scores spéciaux</h3>
        <div class="empty-state"><div class="empty-state-icon">⭐</div><div class="empty-state-title">Aucun score spécial détecté</div></div></div>`;
    }

    let html = `<div class="gazette"><h3 style="margin-bottom:15px;">⭐ Scores spéciaux</h3>`;
    speciaux.forEach(s => {
      html += `
        <div class="horse-card" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span class="horse-name">N°${s.numero ?? '?'} ${this.echapper(s.cheval)}</span>
          <span class="badge badge-accent">${s.score}</span>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderCombinaisonsKaramoko(analyses) {
    const { basesKaramoko, groupesBase, combinaisonsKaramoko } = analyses;

    if (!basesKaramoko || basesKaramoko.length === 0) {
      return `<div class="panel"><div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">Aucune combinaison personnelle</div>
        <p style="color:var(--text-secondary);">Renseigne au moins une source ci-dessus (Gazette, 21/21...) pour générer des combinaisons.</p>
      </div></div>`;
    }

    let html = `
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">🎯 Combinaisons (bases Karamoko)</h2>
          <span class="gazette-count">${combinaisonsKaramoko.length} combinaison${combinaisonsKaramoko.length > 1 ? 's' : ''}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px;">
          ${basesKaramoko.map(b => `<span class="tag">Base ${b.niveau} — ${this.echapper(b.nom)} : ${b.numeros.join(', ')}</span>`).join('')}
        </div>
    `;

    if (groupesBase && groupesBase.length > 0) {
      groupesBase.forEach((groupe, i) => {
        if (groupe.combinaisons.length === 0) return;
        html += `
          <div class="accordion ${i === 0 ? 'open' : ''}" style="margin-bottom:10px;">
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
              <span>Base ${groupe.lettre} — Cheval N°${groupe.numeroBase}</span>
              <span class="accordion-icon">▾</span>
            </div>
            <div class="accordion-body">
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${groupe.combinaisons.map(c => `
                  <div class="horse-card" style="padding:10px 15px;">
                    ${c.map(n => `<span class="tag" style="margin-right:4px;">${n}</span>`).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      });
    }

    html += '</div>';
    return html;
  }
};
