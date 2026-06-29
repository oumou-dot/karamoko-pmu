/**
 * MODALS — utilise les classes CSS du design system (main.css)
 */

const PMUModals = {
  info(titre, message) {
    this.afficher({
      titre,
      contenu: `<p>${message}</p>`,
      boutons: [{ label: 'OK', action: () => this.fermer(), classe: 'btn-primary' }]
    });
  },

  confirm(titre, message, onConfirm) {
    this.afficher({
      titre,
      contenu: `<p>${message}</p>`,
      boutons: [
        { label: 'Annuler', action: () => this.fermer(), classe: 'btn-secondary' },
        { label: 'Confirmer', action: () => { onConfirm(); this.fermer(); }, classe: 'btn-danger' }
      ]
    });
  },

  chargement(message = 'Chargement...') {
    this.fermer();
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-loading">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  fermer() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  },

  afficher(config) {
    this.fermer();

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${config.titre}</h3>
          <button class="btn-close" data-modal-close>×</button>
        </div>
        <div class="modal-body">${config.contenu}</div>
        <div class="modal-footer" id="modal-boutons"></div>
      </div>
    `;

    overlay.querySelector('[data-modal-close]').addEventListener('click', () => this.fermer());

    const boutonsContainer = overlay.querySelector('#modal-boutons');
    config.boutons.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.className = `btn ${b.classe || 'btn-secondary'}`;
      btn.addEventListener('click', () => b.action());
      boutonsContainer.appendChild(btn);
    });

    document.body.appendChild(overlay);
  }
};
