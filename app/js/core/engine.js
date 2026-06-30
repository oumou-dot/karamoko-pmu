/**
 * MOTEUR SINAYOKO v2.0
 * Logique métier pure
 */

const SinayokoEngine = {
  COEFFICIENTS: {
    COTE_BASE: 100,
    PERFORMANCE_MAX: 9,
    CORRECTION_DEFAUT: 0,
    SEUIL_GAZETTE: 80,
    SEUIL_CONSENSUS: 70,
    SEUIL_SPECIAL: 60
  },

  calculerScore(cheval, params) {
    const { cote, performances, nom, numero } = cheval;
    const { hippodrome, distance, corde } = params;
    
    const coteNum = parseFloat(cote) || 0;
    const perfs = Array.isArray(performances) ? performances : [0,0,0,0,0];
    
    const scoreBase = this.COEFFICIENTS.COTE_BASE - coteNum;
    const bonusPerf = perfs.reduce((sum, p) => sum + (parseInt(p) || 0), 0);
    const correctionCorde = this.getCorrectionCorde(hippodrome, corde, distance);
    const scoreFinal = scoreBase + bonusPerf + correctionCorde;
    const niveau = this.determinerNiveau(scoreFinal, coteNum);
    
    return {
      score: Math.round(scoreFinal * 100) / 100,
      details: { base: scoreBase, performances: bonusPerf, corde: correctionCorde, total: scoreFinal },
      niveau,
      cheval: nom || 'Inconnu',
      numero: numero != null ? parseInt(numero, 10) : null,
      cote: coteNum
    };
  },

  determinerNiveau(score, cote) {
    const { SEUIL_GAZETTE, SEUIL_CONSENSUS, SEUIL_SPECIAL } = this.COEFFICIENTS;
    
    if (score >= SEUIL_GAZETTE && cote <= 15) {
      return { label: 'FAVORI', couleur: '#4CAF50', confiance: 95, description: 'Score Sinayoko élevé, cote raisonnable' };
    }
    if (score >= SEUIL_CONSENSUS && cote <= 20) {
      return { label: 'CONSENSUS', couleur: '#2196F3', confiance: 85, description: 'Bonne chance, score solide' };
    }
    if (score >= SEUIL_SPECIAL) {
      return { label: 'OUTSIDER', couleur: '#FF9800', confiance: 70, description: 'Surprise possible' };
    }
    return { label: 'À SURVEILLER', couleur: '#9E9E9E', confiance: 50, description: 'Faible confiance' };
  },

  getCorrectionCorde(hippodrome, corde, distance) {
    const data = HippodromeData[hippodrome];
    if (!data) return this.COEFFICIENTS.CORRECTION_DEFAUT;
    
    const cordeKey = corde === 'gauche' ? 'corde_gauche' : 'corde_droite';
    const distKey = distance || data.distances[0];
    const calibration = data.calibrations[distKey];
    if (!calibration) return this.COEFFICIENTS.CORRECTION_DEFAUT;
    
    const correction = (calibration[cordeKey] - 1) * 10;
    return Math.round(correction * 10) / 10;
  },

  /**
   * Chevaux dont le NIVEAU DE CONFIANCE Sinayoko est "FAVORI" (score élevé +
   * cote raisonnable). À ne pas confondre avec la "Gazette" de Karamoko, qui
   * est une source externe distincte (voir methodes.js).
   */
  genererFavoris(chevaux, params, limite = 5) {
    const scores = chevaux.map(c => this.calculerScore(c, params));
    return scores.filter(s => s.niveau.label === 'FAVORI').sort((a, b) => b.score - a.score).slice(0, limite);
  },

  genererConsensus(chevaux, params) {
    const scores = chevaux.map(c => this.calculerScore(c, params));
    return scores.filter(s => s.niveau.label === 'CONSENSUS').sort((a, b) => b.score - a.score);
  },

  /**
   * Chevaux dont le NIVEAU DE CONFIANCE Sinayoko est "OUTSIDER" (surprise
   * possible). À ne pas confondre avec les "Scores Spéciaux" de Karamoko
   * (valeurs de score précises comme 100/101/106/107, voir methodes.js).
   */
  genererOutsiders(chevaux, params) {
    const scores = chevaux.map(c => this.calculerScore(c, params));
    return scores.filter(s => s.niveau.label === 'OUTSIDER').sort((a, b) => b.score - a.score);
  },

  genererCombinaisonsParConfiance(favoris, doublons, outsiders, maxCombos = 20) {
    const combos = [];
    
    if (favoris.length > 0 && doublons.length > 0) {
      for (const g of favoris) {
        for (const d of doublons) {
          if (g.cheval !== d.cheval) {
            combos.push({
              type: 'F×C',
              chevaux: [g.cheval, d.cheval],
              score: Math.round((g.score + d.score) * 100) / 100,
              confiance: Math.round(Math.min(g.niveau.confiance, d.niveau.confiance) * 0.9),
              details: `${g.cheval} (Favori) + ${d.cheval} (Consensus)`
            });
          }
        }
      }
    }
    
    if (outsiders.length > 0 && favoris.length > 0) {
      const topFavoris = favoris.slice(0, 3);
      for (const s of outsiders) {
        for (const g of topFavoris) {
          if (s.cheval !== g.cheval) {
            combos.push({
              type: 'O×F',
              chevaux: [s.cheval, g.cheval],
              score: Math.round((s.score + g.score) * 100) / 100,
              confiance: Math.round(Math.min(s.niveau.confiance, g.niveau.confiance) * 0.8),
              details: `${s.cheval} (Outsider) + ${g.cheval} (Favori)`
            });
          }
        }
      }
    }
    
    return combos.sort((a, b) => b.score - a.score).slice(0, maxCombos);
  },

  /**
   * Analyse complète d'une course : scores Sinayoko + niveaux de confiance
   * + les 4 sources personnelles de Karamoko (Gazette, Doublons, 21/21,
   * Scores Spéciaux) + les combinaisons générées selon ses bases.
   *
   * @param {Object} course
   * @param {Object} params
   * @param {Object} [methodesInput] - { gazette:[n,n], methode21sur21:[n,n], scoresSpeciaux:[100,101,...] }
   */
  analyserCourse(course, params, methodesInput = {}) {
    const chevaux = course.chevaux || [];
    const tousScores = chevaux.map(c => this.calculerScore(c, params));
    const favoris = this.genererFavoris(chevaux, params);
    const consensus = this.genererConsensus(chevaux, params);
    const outsiders = this.genererOutsiders(chevaux, params);
    const combinaisonsConfiance = this.genererCombinaisonsParConfiance(favoris, consensus, outsiders);

    // Les 4 sources personnelles de Karamoko
    const doublons = MethodesKaramoko.detecterDoublons(tousScores);
    const scoresSpeciaux = MethodesKaramoko.detecterScoresSpeciaux(
      tousScores,
      methodesInput.scoresSpeciaux || MethodesKaramoko.SCORES_SPECIAUX_DEFAUT
    );
    const { bases, combinaisons, groupesBase } = MethodesKaramoko.genererCombinaisons({
      gazette: methodesInput.gazette || [],
      doublons,
      methode21sur21: methodesInput.methode21sur21 || [],
      speciaux: scoresSpeciaux
    });

    return {
      course: course.hippodrome || 'Inconnu',
      date: course.date || new Date().toISOString(),
      totalChevaux: chevaux.length,
      analyses: {
        tousScores, favoris, consensus, outsiders, combinaisonsConfiance,
        doublons, scoresSpeciaux, basesKaramoko: bases, combinaisonsKaramoko: combinaisons, groupesBase
      },
      resume: {
        nbFavoris: favoris.length,
        nbConsensus: consensus.length,
        nbOutsiders: outsiders.length,
        nbDoublons: doublons.length,
        nbScoresSpeciaux: scoresSpeciaux.length,
        nbCombosKaramoko: combinaisons.length,
        meilleurScore: tousScores.length > 0 ? Math.max(...tousScores.map(s => s.score)) : 0
      }
    };
  }
};

let HippodromeData = {};

async function loadHippodromeData() {
  try {
    const response = await fetch('data/hippodromes.json');
    HippodromeData = await response.json();
    console.log('✅ Données hippodromes chargées');
  } catch (e) {
    console.warn('⚠️ Impossible de charger hippodromes.json');
    HippodromeData = {};
  }
}
