/**
 * VALIDATOR - Validation des données
 */

const Validator = {
  validerCheval(cheval) {
    const erreurs = [];
    
    if (!cheval.nom || cheval.nom.trim() === '') erreurs.push('Nom manquant');
    
    const cote = parseFloat(cheval.cote);
    if (isNaN(cote) || cote <= 0 || cote > 100) erreurs.push('Cote invalide');
    
    if (!Array.isArray(cheval.performances) || cheval.performances.length !== 5) {
      erreurs.push('5 performances requises');
    }
    
    return {
      valide: erreurs.length === 0,
      erreurs,
      cheval: {
        ...cheval,
        nom: (cheval.nom || '').trim(),
        cote: parseFloat(cheval.cote) || 0,
        performances: (cheval.performances || []).map(p => parseInt(p) || 0)
      }
    };
  },

  validerCourse(course) {
    const erreurs = [];
    const chevauxValides = [];
    
    if (!course.hippodrome) erreurs.push('Hippodrome non spécifié');
    
    if (!Array.isArray(course.chevaux) || course.chevaux.length === 0) {
      erreurs.push('Aucun cheval');
    } else {
      course.chevaux.forEach((cheval, index) => {
        const validation = this.validerCheval(cheval);
        if (!validation.valide) {
          erreurs.push(`Cheval #${index + 1}: ${validation.erreurs.join(', ')}`);
        } else {
          chevauxValides.push(validation.cheval);
        }
      });
    }
    
    return {
      valide: erreurs.length === 0 && chevauxValides.length > 0,
      erreurs,
      course: { ...course, chevaux: chevauxValides, date: course.date || new Date().toISOString() }
    };
  },

  validerParams(params) {
    const erreurs = [];
    const paramsValides = {};
    
    paramsValides.hippodrome = params.hippodrome || 'Vincennes';
    paramsValides.distance = params.distance || '2700m';
    paramsValides.corde = ['gauche', 'droite', 'mobile'].includes(params.corde) ? params.corde : 'gauche';
    paramsValides.meteo = params.meteo || 'bon';
    
    return { valide: erreurs.length === 0, erreurs, params: paramsValides };
  },

  /**
   * Valide la saisie manuelle des méthodes personnelles de Karamoko
   * (Gazette, méthode 21/21, liste des scores spéciaux).
   * Chaque champ est optionnel : une saisie vide retourne simplement un
   * tableau vide, ce qui désactive cette source dans les combinaisons
   * sans bloquer le calcul.
   */
  validerMethodesKaramoko(input) {
    const parseListe = (str) => (str || '')
      .split(/[,\-\s/]+/)
      .map(s => parseInt(s, 10))
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 30);

    return {
      gazette: parseListe(input.gazette),
      methode21sur21: parseListe(input.methode21sur21),
      scoresSpeciaux: parseListe(input.scoresSpeciaux).length > 0
        ? parseListe(input.scoresSpeciaux)
        : MethodesKaramoko.SCORES_SPECIAUX_DEFAUT
    };
  }
};