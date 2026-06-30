/**
 * RENDERER — Affichage des résultats Sinayoko (niveaux de confiance)
 * Utilise les classes CSS du design system (main.css / components.css).
 */

const UIRenderer = {
  renderTableauChevaux(chevaux, containerId = 'tableau-chevaux') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
      <div class="table-container">
        <table class="pmu-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Nom</th>
              <th>Corde</th>
              <th>Cote</th>
              <th colspan="5" style="text-align:center;">Performances</th>
              <th>Score</th>
              <th>Niveau</th>
            </tr>
          </thead>
          <tbody>
    `;

    chevaux.forEach((c, i) => {
      html += `
        <tr data-index="${i}" data-numero="${c.numero}">
          <td><span class="horse-number" style="width:28px;height:28px;font-size:0.85rem;">${c.numero}</span></td>
          <td><input type="text" class="input-nom" value="${this.echapper(c.nom || '')}" data-field="nom"></td>
          <td><input type="number" class="input-corde" value="${c.corde ?? ''}" min="1" max="30" style="width:55px;" data-field="corde"></td>
          <td><input type="number" class="input-cote" value="${c.cote || 10}" min="0.1" max="100" step="0.1" style="width:65px;" data-field="cote"></td>
          ${(c.performances || [0,0,0,0,0]).map((p, j) => `
            <td><input type="text" inputmode="numeric" class="input-perf" value="${this.echapper(String(p))}" maxlength="2" style="width:42px;text-align:center;" data-field="perf-${j}" title="Chiffre = position d'arrivée. Lettre = D (Distancé), A (Arrêté), T (Tombé), R (Retiré)"></td>
          `).join('')}
          <td class="score-cell">-</td>
          <td class="niveau-cell"><span class="badge badge-default">-</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    this.attachTableListeners(container);
  },

  echapper(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  attachTableListeners(container) {
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        window.dispatchEvent(new CustomEvent('pmu:recalculer'));
      });
    });
  },

  updateScores(scores) {
    const rows = document.querySelectorAll('#tableau-chevaux tbody tr');

    rows.forEach(row => {
      const numero = parseInt(row.dataset.numero, 10);
      const scoreData = scores.find(s => s.numero === numero);

      if (scoreData) {
        const scoreCell = row.querySelector('.score-cell');
        const niveauCell = row.querySelector('.niveau-cell');

        if (scoreCell) scoreCell.textContent = scoreData.score.toFixed(1);
        if (niveauCell) {
          niveauCell.innerHTML = `<span class="badge" style="background:${scoreData.niveau.couleur};color:white;">${scoreData.niveau.label}</span>`;
        }
      }
    });
  },

  renderFavoris(favoris, containerId = 'favoris-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (favoris.length === 0) {
      container.innerHTML = `
        <div class="gazette">
          <div class="empty-state">
            <div class="empty-state-icon">🏆</div>
            <div class="empty-state-title">Aucun cheval FAVORI</div>
          </div>
        </div>`;
      return;
    }

    let html = `
      <div class="gazette">
        <div class="gazette-header">
          <h3>🏆 FAVORIS SINAYOKO</h3>
          <span class="gazette-count">${favoris.length} cheval${favoris.length > 1 ? 'x' : ''}</span>
        </div>
    `;

    favoris.forEach((g, i) => {
      html += `
        <div class="gazette-item gazette-rank-${i + 1}" style="border-left-color:${g.niveau.couleur};">
          <div class="gazette-rank">${g.numero ?? (i + 1)}</div>
          <div class="gazette-info">
            <div class="gazette-name">${this.echapper(g.cheval)}</div>
            <div class="gazette-details">Score : <strong>${g.score}</strong> · Cote : ${g.cote} · Confiance : <strong>${g.niveau.confiance}%</strong></div>
          </div>
          <div class="gazette-badge" style="background:${g.niveau.couleur};">${g.niveau.label}</div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderConsensus(consensus, containerId = 'consensus-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (consensus.length === 0) {
      container.innerHTML = `<div class="gazette"><div class="empty-state"><div class="empty-state-icon">🤝</div><div class="empty-state-title">Aucun CONSENSUS</div></div></div>`;
      return;
    }

    let html = `<div class="gazette"><h3 style="color:var(--info);margin-bottom:15px;">🤝 CONSENSUS</h3>`;

    consensus.forEach(c => {
      html += `
        <div class="horse-card" style="display:flex;justify-content:space-between;margin-bottom:8px;border-left:3px solid ${c.niveau.couleur};">
          <span class="horse-name">N°${c.numero ?? '?'} ${this.echapper(c.cheval)}</span>
          <span style="color:var(--text-secondary);">${c.score} · ${c.niveau.confiance}%</span>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderOutsiders(outsiders, containerId = 'outsiders-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (outsiders.length === 0) {
      container.innerHTML = `<div class="gazette"><div class="empty-state"><div class="empty-state-icon">⭐</div><div class="empty-state-title">Aucun OUTSIDER</div></div></div>`;
      return;
    }

    let html = `<div class="gazette"><h3 style="color:var(--warning);margin-bottom:15px;">⭐ OUTSIDERS</h3>`;

    outsiders.forEach(s => {
      html += `
        <div class="horse-card" style="display:flex;justify-content:space-between;margin-bottom:8px;border-left:3px solid ${s.niveau.couleur};">
          <span class="horse-name">N°${s.numero ?? '?'} ${this.echapper(s.cheval)}</span>
          <span style="color:var(--text-secondary);">${s.score}</span>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderCombinaisonsConfiance(combos, containerId = 'combos-confiance-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (combos.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-title">Aucune combinaison</div></div>`;
      return;
    }

    let html = `
      <div class="gazette">
        <h3 style="margin-bottom:15px;">🎯 COMBINAISONS PAR NIVEAU DE CONFIANCE</h3>
        <div class="combos-grid">
    `;

    combos.forEach((c, i) => {
      const color = c.confiance >= 80 ? 'var(--success)' : c.confiance >= 70 ? 'var(--warning)' : 'var(--info)';
      html += `
        <div class="combo-card ${c.confiance >= 80 ? 'combo-top' : ''}">
          <div class="combo-header">
            <span class="combo-type">${c.type}</span>
            <span class="combo-rank">#${i + 1}</span>
          </div>
          <div class="combo-horses">${c.chevaux.map(h => this.echapper(h)).join(' <span class="combo-plus">+</span> ')}</div>
          <div class="combo-stats">
            <div class="combo-stat"><span class="label">Score</span><div class="value">${c.score.toFixed(1)}</div></div>
            <div class="combo-stat"><span class="label">Confiance</span><div class="value">${c.confiance}%</div></div>
          </div>
          <div class="combo-bar-container">
            <div class="combo-bar" style="width:${c.confiance}%;background:${color};"></div>
          </div>
          ${c.miseRecommandee ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-secondary);">💰 ${c.miseRecommandee}</div>` : ''}
        </div>
      `;
    });

    html += '</div></div>';
    container.innerHTML = html;
  },

  renderStats(stats, containerId = 'stats-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalCourses || 0}</div>
          <div class="stat-label">Courses analysées</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Object.keys(stats.hippodromes || {}).length}</div>
          <div class="stat-label">Hippodromes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.derniereCourse ? new Date(stats.derniereCourse).toLocaleDateString() : '-'}</div>
          <div class="stat-label">Dernière course</div>
        </div>
      </div>
    `;
  },

  renderHistorique(courses, containerId = 'historique-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (courses.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">Aucune course dans l'historique</div></div>`;
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';

    courses.forEach(c => {
      html += `
        <div class="historique-item" data-id="${c.id}">
          <div>
            <div class="historique-title">${this.echapper(c.hippodrome || 'Course')}</div>
            <div class="historique-meta">${new Date(c.date).toLocaleDateString()} · ${c.chevaux?.length || 0} chevaux</div>
          </div>
          <div class="historique-actions">
            <button class="btn btn-icon btn-secondary" title="Ouvrir" onclick="window.dispatchEvent(new CustomEvent('pmu:charger-course', {detail: {id: ${c.id}}}))">📂</button>
            <button class="btn btn-icon btn-danger" title="Supprimer" onclick="if(confirm('Supprimer cette course ?')) window.dispatchEvent(new CustomEvent('pmu:supprimer-course', {detail: {id: ${c.id}}}))">🗑️</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }
};
