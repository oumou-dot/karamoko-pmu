/**
 * MÉTHODES PERSONNELLES KARAMOKO
 * ================================
 * Ce module implémente les 4 sources de pronostic que Karamoko croise
 * pour construire ses combinaisons, EN PLUS du score Sinayoko de base :
 *
 *   1. GAZETTE     — saisie manuelle (site externe "Gazette", donne 2 chevaux)
 *   2. DOUBLONS     — calculé automatiquement : chevaux qui obtiennent EXACTEMENT
 *                     le même score Sinayoko (ex: N°3 et N°5 = 90 tous les deux)
 *   3. MÉTHODE 21/21 — saisie manuelle (calcul fait à la main par Karamoko à
 *                     partir du pronostic de la presse) + un outil d'aide au
 *                     comptage fourni à titre indicatif seulement
 *   4. SPÉCIAUX     — calculé automatiquement : chevaux dont le score Sinayoko
 *                     tombe sur une valeur "spéciale" (ex: 100, 101, 106, 107)
 *
 * Priorité des bases dans les combinaisons (du plus fiable au moins fiable,
 * selon Karamoko) : Gazette > Doublons > 21/21 > Spéciaux.
 *
 * Ce fichier ne touche PAS au calcul du score Sinayoko lui-même
 * (voir engine.js) : il consomme les scores déjà calculés.
 */

const MethodesKaramoko = {
  /**
   * Liste des valeurs de score considérées comme "spéciales" par Karamoko.
   * Modifiable librement : il suffit d'ajouter/retirer des valeurs ici.
   * Valeurs de départ fournies par Karamoko : 100, 101, 106, 107.
   */
  SCORES_SPECIAUX_DEFAUT: [100, 101, 106, 107],

  /**
   * 1) SCORES IDENTIQUES (doublons)
   * Regroupe les chevaux qui partagent EXACTEMENT le même score Sinayoko
   * (arrondi à 2 décimales, comme l'affichage). Un groupe de moins de 2
   * chevaux n'est pas un doublon.
   *
   * @param {Array} tousScores - sortie de SinayokoEngine.analyserCourse(...).analyses.tousScores
   * @returns {Array<{score:number, chevaux:Array}>}
   */
  detecterDoublons(tousScores) {
    const groupes = new Map();

    tousScores.forEach(s => {
      const cle = s.score.toFixed(2);
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(s);
    });

    const doublons = [];
    for (const [cle, chevaux] of groupes) {
      if (chevaux.length >= 2) {
        doublons.push({
          score: parseFloat(cle),
          chevaux: chevaux.sort((a, b) => a.numero - b.numero)
        });
      }
    }

    return doublons.sort((a, b) => b.score - a.score);
  },

  /**
   * 2) SCORES SPÉCIAUX
   * Chevaux dont le score Sinayoko correspond à une valeur de la liste
   * des scores spéciaux (configurable).
   *
   * @param {Array} tousScores
   * @param {Array<number>} listeSpeciaux
   * @returns {Array}
   */
  detecterScoresSpeciaux(tousScores, listeSpeciaux = this.SCORES_SPECIAUX_DEFAUT) {
    const ensemble = new Set(listeSpeciaux.map(v => Math.round(v)));
    return tousScores
      .filter(s => ensemble.has(Math.round(s.score)))
      .sort((a, b) => b.score - a.score);
  },

  /**
   * Outil d'AIDE au comptage pour la méthode 21/21 — purement indicatif.
   * Karamoko fait le calcul final lui-même et le saisit manuellement ;
   * cet outil se contente de numéroter visuellement une liste de presse
   * à partir d'un numéro de départ (ex: 14, 15, 16... pour 16 partants),
   * pour faciliter le comptage, sans imposer de résultat.
   *
   * @param {Array<number>} listePresse - ex: [1,3,2,10,12,9,8,6]
   * @param {number} nbPartants - ex: 16
   * @returns {Array<{position:number, numeroCheval:number, compte:number}>}
   */
  genererAideComptage21sur21(listePresse, nbPartants) {
    const depart = nbPartants - 3 + 1;
    return listePresse.map((numeroCheval, i) => ({
      position: i + 1,
      numeroCheval,
      compte: depart + i
    }));
  },

  /**
   * Construit les "bases" de combinaison selon l'ordre de priorité de
   * Karamoko : Gazette (1ère base) × Doublons (2e) × 21/21 (3e) × Spéciaux (4e).
   *
   * Chaque base est une LISTE de numéros de chevaux (pas de scores) — on
   * suit fidèlement l'exemple concret fourni par Karamoko : la combinaison
   * de base est [gazette, doublon, 21/21, spécial], un cheval de chaque
   * catégorie quand elle est disponible.
   *
   * @param {Object} sources
   * @param {Array<number>} sources.gazette - ex: [13, 7]
   * @param {Array} sources.doublons - sortie de detecterDoublons (peut contenir plusieurs groupes)
   * @param {Array<number>} sources.methode21sur21 - ex: [6, 10]
   * @param {Array} sources.speciaux - sortie de detecterScoresSpeciaux
   * @param {string} [sources.xFinal] - jokers/numéro "x" optionnel à ajouter en 5e position
   * @returns {{bases: Array, combinaisons: Array<Array<number>>}}
   */
  genererCombinaisons(sources) {
    const gazette = (sources.gazette || []).filter(n => Number.isInteger(n));
    const doublonsNumeros = this.extraireNumerosUniques(sources.doublons || []);
    const methode21 = (sources.methode21sur21 || []).filter(n => Number.isInteger(n));
    const speciauxNumeros = this.extraireNumerosUniques(sources.speciaux || [], true);

    const bases = [
      { nom: 'Gazette', niveau: 1, numeros: gazette },
      { nom: 'Doublons', niveau: 2, numeros: doublonsNumeros },
      { nom: 'Méthode 21/21', niveau: 3, numeros: methode21 },
      { nom: 'Spéciaux', niveau: 4, numeros: speciauxNumeros }
    ].filter(b => b.numeros.length > 0);

    if (bases.length === 0) {
      return { bases: [], combinaisons: [], groupesBase: [] };
    }

    // Produit cartésien des bases disponibles, dans l'ordre de priorité,
    // exactement comme l'exemple concret de Karamoko :
    // Base A (gazette=13) : 13-3-6-9 ; 13-3-6-12 ; 13-3-6-11 ; 13-3-6-14 ...
    // Base B (gazette=7)  : 7-3-6-9  ; 7-3-6-12  ; ...
    let combinaisons = [[]];
    for (const base of bases) {
      const nouvelles = [];
      for (const combo of combinaisons) {
        for (const numero of base.numeros) {
          if (!combo.includes(numero)) {
            nouvelles.push([...combo, numero]);
          }
        }
      }
      combinaisons = nouvelles;
    }

    // Regroupement par "Base A / Base B / ..." = une combinaison par valeur
    // de la 1ère base disponible (comme dans l'exemple de Karamoko)
    const premiereBase = bases[0];
    const groupesBase = premiereBase.numeros.map((numeroBase, i) => ({
      lettre: String.fromCharCode(65 + i), // A, B, C...
      numeroBase,
      combinaisons: combinaisons.filter(c => c[0] === numeroBase)
    }));

    return { bases, combinaisons, groupesBase };
  },

  /**
   * Extrait les numéros de chevaux uniques depuis une sortie de
   * detecterDoublons ou detecterScoresSpeciaux (qui contiennent des objets
   * {cheval, numero, score, ...} ou {chevaux:[...]}), triés par score desc.
   */
  extraireNumerosUniques(source, estListeScores = false) {
    const numeros = [];
    const vus = new Set();

    if (estListeScores) {
      // sortie de detecterScoresSpeciaux : liste plate de scores
      for (const s of source) {
        if (s.numero != null && !vus.has(s.numero)) {
          vus.add(s.numero);
          numeros.push(s.numero);
        }
      }
    } else {
      // sortie de detecterDoublons : liste de groupes {chevaux:[...]}
      for (const groupe of source) {
        for (const c of groupe.chevaux || []) {
          if (c.numero != null && !vus.has(c.numero)) {
            vus.add(c.numero);
            numeros.push(c.numero);
          }
        }
      }
    }

    return numeros;
  }
};
