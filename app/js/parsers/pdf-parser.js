/**
 * PARSER PDF — PROGRAMME OFFICIEL PMU-MALI
 *
 * Adapté précisément au format des programmes PMU-Mali
 * (QUARTE/TIERCE/COUPLE, Quinté+, etc.)
 *
 * Le PDF est imprimé en double colonne : le tableau des chevaux
 * occupe la moitié gauche de la page, les commentaires de la presse
 * occupent la moitié droite. On utilise les COORDONNÉES (x, y) de
 * chaque mot — fournies par pdf.js — pour reconstruire les lignes du
 * tableau sans se laisser polluer par le texte des commentaires.
 *
 * Format d'une ligne du tableau (colonnes par position x, en points) :
 *   N°(~10) NOM(~18-75) CORDE(~75) SEXE/AGE(~90) POIDS(~106)
 *   ORIGINES(~122-205) GAINS(~205-233) JOCKEY(~233-277)
 *   ENTRAINEUR(~277-323) PROPRIETAIRE(~323-388) PERF(~388-418) COTE(~418+)
 *
 * Ex: 1 CHESS 7 M5 60 FAS-THAT'S CRAZY 106.326 M. Guyon P&J.BRANDT
 *     MME P.BRANDT 2-2-3-1-0 4.5/1
 */

const PDFParser = {
  config: {
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    workerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    timeout: 30000,
    maxSize: 15 * 1024 * 1024, // 15MB
    fallbackActif: false,
    // Largeur (en points PDF) au-delà de laquelle un mot appartient à la
    // colonne "commentaires de la presse" et doit être ignoré pour le
    // tableau. Calibré sur le format PMU-Mali A4 paysage habituel.
    limiteColonneTableau: 0.52 // fraction de la largeur de page
  },

  /**
   * Initialise PDF.js avec fallback
   */
  async init() {
    if (typeof pdfjsLib !== 'undefined') return true;

    try {
      await this.loadScript(this.config.cdnUrl);
      pdfjsLib.GlobalWorkerOptions.workerSrc = this.config.workerUrl;
      console.log('✅ PDF.js chargé depuis CDN');
      return true;
    } catch (e) {
      console.warn('⚠️ CDN indisponible:', e.message);
      this.config.fallbackActif = true;
      return false;
    }
  },

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${url}`));
      script.timeout = this.config.timeout;
      document.head.appendChild(script);
    });
  },

  /**
   * Parse un fichier PDF de programme PMU-Mali
   */
  async parse(file) {
    if (!file || file.size === 0) {
      throw new Error('Fichier vide ou invalide');
    }

    if (file.size > this.config.maxSize) {
      throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB > 15MB)`);
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Le fichier doit être au format PDF');
    }

    const pdfDisponible = await this.init();

    if (!pdfDisponible) {
      throw new Error('PDF.js non disponible. Utilisez la saisie manuelle ou vérifiez votre connexion.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // On ne traite que la première page : c'est elle qui contient le
      // tableau de la course (les pages suivantes sont des synthèses
      // presse / grilles de mises qui ne contiennent pas de nouveaux chevaux).
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      // items pdf.js : { str, transform: [a,b,c,d,e,f], width, height, ... }
      // transform[4] = x, transform[5] = y (origine en bas à gauche)
      const mots = content.items
        .filter(item => item.str && item.str.trim().length > 0)
        .map(item => ({
          texte: item.str.trim(),
          x: item.transform[4],
          // pdf.js donne y depuis le bas ; on le convertit en "top" comme un repère écran
          top: viewport.height - item.transform[5]
        }));

      return this.extraireDonnees(mots, viewport.width, file.name);
    } catch (e) {
      console.error('Erreur parsing PDF:', e);
      throw new Error(`Erreur lors de la lecture du PDF: ${e.message}`);
    }
  },

  /**
   * Extrait les données structurées à partir des mots positionnés
   */
  extraireDonnees(mots, largeurPage, nomFichier = '') {
    const limiteX = largeurPage * this.config.limiteColonneTableau;

    // Tout le texte concaténé (utile pour détecter hippodrome/date/course/distance,
    // qui sont en haut de page et ne posent pas de problème de colonne).
    const texteEnTete = mots
      .filter(m => m.top < 180) // zone d'en-tête approximative
      .sort((a, b) => a.top - b.top || a.x - b.x)
      .map(m => m.texte)
      .join(' ');

    // Texte complet de la page (utile pour détecter la corde générale et le
    // type de course, qui peuvent apparaître n'importe où dans l'en-tête
    // élargi, et pour le pronostic de la presse qui est dans la colonne droite).
    const texteComplet = mots
      .sort((a, b) => a.top - b.top || a.x - b.x)
      .map(m => m.texte)
      .join(' ');

    const handicapDivise = this.detecterHandicapDivise(texteComplet);

    const course = {
      nomFichier: nomFichier,
      hippodrome: this.detecterHippodrome(texteEnTete),
      date: this.detecterDate(texteEnTete),
      heure: this.detecterHeure(texteEnTete),
      numeroCourse: this.detecterNumeroCourse(texteEnTete),
      typeCourse: this.detecterTypeCourse(texteEnTete),
      distance: this.detecterDistance(texteEnTete),
      nbPartants: this.detecterNbPartants(texteEnTete),
      nomCourse: this.detecterNomCourse(texteEnTete),
      corde: this.detecterCordeGenerale(texteComplet),
      handicapDivise,
      chevaux: [],
      metadonnees: {
        nbMots: mots.length,
        dateExtraction: new Date().toISOString(),
        format: 'PMU-Mali'
      }
    };

    // Ne garder que les mots de la colonne "tableau" (gauche)
    const motsTableau = mots.filter(m => m.x < limiteX);

    // Regrouper les mots en lignes par proximité verticale (tolérance 4pt)
    const lignes = this.regrouperEnLignes(motsTableau);

    // Chaque ligne candidate "cheval" commence par un numéro isolé en tout début de ligne
    for (const ligne of lignes) {
      const cheval = this.parserLigneCheval(ligne);
      if (cheval) course.chevaux.push(cheval);
    }

    if (course.chevaux.length === 0) {
      throw new Error(
        'Aucun cheval détecté dans le PDF. Vérifiez qu\'il s\'agit bien d\'un programme officiel PMU-Mali (et non un PDF scanné/image).'
      );
    }

    // Dédoublonner par numéro (au cas où une ligne aurait été comptée deux fois)
    const parNumero = new Map();
    for (const c of course.chevaux) {
      if (!parNumero.has(c.numero)) parNumero.set(c.numero, c);
    }
    course.chevaux = Array.from(parNumero.values()).sort((a, b) => a.numero - b.numero);

    // Course de plat handicap divisé : on ajoute le numéro de corde sur
    // chaque cheval s'il n'a pas déjà été détecté ligne par ligne (corde
    // individuelle), en repli sur l'ordre de poids/numéro habituel PMU-Mali.
    if (handicapDivise) {
      course.chevaux.forEach((c) => {
        if (c.corde == null) {
          c.numeroCordeHandicap = c.numero;
        }
      });
    }

    // Avertissement si le nombre de chevaux trouvés ne correspond pas au nombre de partants annoncé
    if (course.nbPartants && course.chevaux.length !== course.nbPartants) {
      course.avertissements = [
        `${course.chevaux.length} cheval(aux) détecté(s) sur ${course.nbPartants} partants annoncés. Vérifiez les données avant de lancer le calcul.`
      ];
    }

    // Pronostic de la presse (colonne droite) — meilleur effort uniquement :
    // ce bloc est très variable d'un PDF à l'autre, donc en cas d'échec on
    // laisse simplement le tableau vide et l'utilisateur passe par la saisie
    // manuelle (méthode 21/21) sans que cela bloque l'import.
    const motsPresse = mots.filter(m => m.x >= limiteX);
    course.pronosticPresse = this.extrairePronosticPresse(motsPresse);

    return course;
  },

  /**
   * Détecte si la course est un "handicap divisé" (plat), ce qui implique
   * généralement une numérotation de corde spécifique par division.
   */
  detecterHandicapDivise(texte) {
    return /HANDICAP\s+DIVIS[EÉ]/i.test(texte);
  },

  /**
   * Détecte la corde GÉNÉRALE de la course (contrairement à la corde
   * individuelle de chaque cheval, parfois indiquée colonne par colonne).
   * Format PMU-Mali habituel : "CORDE A GAUCHE" / "CORDE A DROITE".
   */
  detecterCordeGenerale(texte) {
    if (/CORDE\s*[AÀ]\s*GAUCHE/i.test(texte)) return 'gauche';
    if (/CORDE\s*[AÀ]\s*DROITE/i.test(texte)) return 'droite';
    if (/CORDE\s*MOBILE/i.test(texte)) return 'mobile';
    return null;
  },

  /**
   * Extrait le "pronostic de la presse" (ex : PARISIEN, TURF.FR, ALSACE,
   * EQUIDIA...), chacun donnant une liste ordonnée de numéros de chevaux.
   * Meilleur effort : on cherche un nom de journal connu suivi d'une liste
   * de numéros séparés par des tirets/virgules. Si rien n'est trouvé, on
   * retourne un objet vide — la saisie manuelle (méthode 21/21) prend le
   * relais sans bloquer l'utilisateur.
   */
  extrairePronosticPresse(motsPresse) {
    const journauxConnus = [
      'PARISIEN', 'TURF.FR', 'TURF', 'ALSACE', 'EQUIDIA',
      'PARIS-TURF', 'PARISTURF', 'WEEKEND', "FRANCE-SOIR", 'RTL'
    ];

    const lignes = this.regrouperEnLignes(motsPresse, 5);
    const resultat = {};

    for (const ligne of lignes) {
      const texteLigne = ligne.map(m => m.texte).join(' ').toUpperCase();
      const journal = journauxConnus.find(j => texteLigne.includes(j));
      if (!journal) continue;

      // Liste de numéros séparés par - , ou espaces, après le nom du journal
      const apresJournal = texteLigne.split(journal)[1] || '';
      const numeros = apresJournal
        .match(/\d{1,2}/g)
        ?.map(n => parseInt(n, 10))
        .filter(n => n >= 1 && n <= 30);

      if (numeros && numeros.length >= 3) {
        resultat[journal] = numeros;
      }
    }

    return resultat;
  },

  /**
   * Regroupe les mots en lignes selon leur position verticale (top)
   */
  regrouperEnLignes(mots, tolerance = 4) {
    const tries = [...mots].sort((a, b) => a.top - b.top || a.x - b.x);
    const lignes = [];

    for (const mot of tries) {
      let ligne = lignes.find(l => Math.abs(l.top - mot.top) <= tolerance);
      if (!ligne) {
        ligne = { top: mot.top, mots: [] };
        lignes.push(ligne);
      }
      ligne.mots.push(mot);
      // Recalcule le top moyen pour absorber les petites variations
      ligne.top = ligne.mots.reduce((s, m) => s + m.top, 0) / ligne.mots.length;
    }

    return lignes.map(l => l.mots.sort((a, b) => a.x - b.x));
  },

  /**
   * Tente d'interpréter une ligne de mots positionnés comme un cheval.
   * Retourne null si la ligne ne correspond pas au format attendu.
   */
  parserLigneCheval(mots) {
    if (mots.length < 6) return null;

    const premier = mots[0];
    // Le numéro doit être en tout début de ligne (x < 16) et purement numérique (1 à 2 chiffres)
    if (premier.x > 16 || !/^\d{1,2}$/.test(premier.texte)) return null;
    const numero = parseInt(premier.texte, 10);
    if (numero < 1 || numero > 30) return null;

    // Reconstituer le texte complet de la ligne pour les regex globaux (cote, perf)
    const texteLigne = mots.map(m => m.texte).join(' ');

    // Cote : format fraction "4.5/1", "10/1", "30/1" — toujours en fin de ligne
    const matchCote = texteLigne.match(/(\d+(?:[.,]\d+)?)\s*\/\s*1\b/);
    if (!matchCote) return null;
    const cote = parseFloat(matchCote[1].replace(',', '.'));

    // Performances : format "2-2-3-1-0" (5 chiffres séparés par des tirets)
    const matchPerf = texteLigne.match(/\b(\d)-(\d)-(\d)-(\d)-(\d)\b/);
    if (!matchPerf) return null;
    const performances = [
      parseInt(matchPerf[1], 10),
      parseInt(matchPerf[2], 10),
      parseInt(matchPerf[3], 10),
      parseInt(matchPerf[4], 10),
      parseInt(matchPerf[5], 10)
    ];

    // Sexe/Âge : motif "M5", "H6" (collés), ou "4 F" / "6 F" (avec espace, parfois
    // fusionnés en un seul item texte par pdf.js, parfois en deux items distincts)
    const motsApresNumero = mots.slice(1);
    let sexeAgeIndex = -1;
    let sexe = null;
    let age = null;
    for (let i = 0; i < motsApresNumero.length; i++) {
      const m = motsApresNumero[i].texte;

      // Cas "M5" / "H6" collés
      const matchColle = m.match(/^([MHF])(\d{1,2})$/);
      if (matchColle) {
        sexe = matchColle[1];
        age = parseInt(matchColle[2], 10);
        sexeAgeIndex = i;
        break;
      }

      // Cas "4 F" fusionné en un seul item texte par pdf.js
      const matchFusionne = m.match(/^(\d{1,2})\s+F$/);
      if (matchFusionne) {
        age = parseInt(matchFusionne[1], 10);
        sexe = 'F';
        sexeAgeIndex = i;
        break;
      }

      // Cas "4" et "F" en deux items distincts consécutifs
      if (/^\d{1,2}$/.test(m) && motsApresNumero[i + 1] && motsApresNumero[i + 1].texte === 'F') {
        age = parseInt(m, 10);
        sexe = 'F';
        sexeAgeIndex = i + 1;
        break;
      }
    }

    // Le nom du cheval = tous les mots avant le marqueur sexe/âge
    let motsNom = sexeAgeIndex >= 0 ? motsApresNumero.slice(0, sexeAgeIndex) : [];
    // Le dernier mot avant le sexe/âge est généralement le numéro de corde
    // (purement numérique, court) — on l'exclut du nom.
    let corde = null;
    if (motsNom.length > 0) {
      const dernier = motsNom[motsNom.length - 1];
      if (/^\d{1,2}$/.test(dernier.texte)) {
        corde = parseInt(dernier.texte, 10);
        motsNom = motsNom.slice(0, -1);
      }
    }

    const nom = this.nettoyerNom(motsNom.map(m => m.texte).join(' '));
    if (!nom || nom.length < 2) return null;

    return {
      numero,
      nom,
      corde: corde,
      sexe,
      age,
      cote,
      performances,
      source: 'pdf-pmu-mali'
    };
  },

  nettoyerNom(nom) {
    return nom
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);
  },

  detecterHippodrome(texte) {
    // Format PMU-Mali : "<HIPPODROME> - <N> PARTANTS"
    // Les PDF PMU-Mali écrivent les hippodromes SANS accents (ex: "COMPIEGNE").
    // On normalise vers le nom correctement accentué quand on le reconnaît,
    // pour que la recherche dans hippodromes.json fonctionne.
    const hippodromesConnus = [
      'Compiègne', 'Vincennes', 'Auteuil', 'Enghien', 'Cagnes-sur-Mer', 'Cagnes',
      'Marseille', 'Paris', 'Lyon', 'Toulouse', 'Bordeaux', 'Bamako',
      'Nantes', 'Strasbourg', 'Deauville', 'Chantilly', 'Longchamp'
    ];

    const normaliser = (str) => str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const match = texte.match(/\b([A-ZÀ-Ý][A-ZÀ-Ý'\s-]{2,30}?)\s*-\s*\d+\s*PARTANTS/);
    const candidat = match ? match[1].trim() : null;

    if (candidat) {
      const candidatNorm = normaliser(candidat);
      for (const h of hippodromesConnus) {
        if (normaliser(h) === candidatNorm) return h;
      }
      // Hippodrome non répertorié : on garde le nom détecté, proprement formaté
      return this.titreCase(candidat);
    }

    const texteNorm = normaliser(texte);
    for (const h of hippodromesConnus) {
      if (texteNorm.includes(normaliser(h))) return h;
    }

    return 'Inconnu';
  },

  detecterNbPartants(texte) {
    const match = texte.match(/(\d+)\s*PARTANTS/);
    return match ? parseInt(match[1], 10) : null;
  },

  detecterNomCourse(texte) {
    // Format : "PRIX <NOM> - <N>ème COURSE (R<n>)"
    const match = texte.match(/PRIX\s+([A-ZÀ-Ý0-9'\s-]+?)\s*-\s*\d+(?:ème|ER|ère)\s*COURSE/i);
    return match ? this.titreCase(match[1].trim()) : null;
  },

  detecterDate(texte) {
    // Format PMU-Mali : "DU SAMEDI 20 JUIN 2026"
    const mois = {
      janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
      mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
      septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12'
    };
    const matchLitteral = texte.match(/(\d{1,2})\s+([A-ZÀ-Ýa-zà-ý]+)\s+(\d{4})/i);
    if (matchLitteral) {
      const moisNom = matchLitteral[2].toLowerCase();
      if (mois[moisNom]) {
        return `${matchLitteral[3]}-${mois[moisNom]}-${matchLitteral[1].padStart(2, '0')}`;
      }
    }

    const match1 = texte.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match1) return `${match1[3]}-${match1[2]}-${match1[1]}`;

    const match2 = texte.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`;

    return new Date().toISOString().split('T')[0];
  },

  detecterHeure(texte) {
    const match = texte.match(/(\d{1,2})[hH:](\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
  },

  detecterNumeroCourse(texte) {
    const match = texte.match(/\(R(\d+)\)/i);
    return match ? match[1] : '1';
  },

  detecterTypeCourse(texte) {
    const t = texte.toLowerCase();
    if (t.includes('trot')) return 'Trot';
    if (t.includes('plat')) return 'Plat';
    if (t.includes('obstacle') || t.includes('haies')) return 'Obstacle';
    if (t.includes('steeple')) return 'Steeple';
    return 'Inconnu';
  },

  detecterDistance(texte) {
    const match = texte.match(/(\d{3,4})\s*m(?:ètres)?\b/i);
    return match ? match[1] + 'm' : null;
  },

  titreCase(str) {
    return str
      .toLowerCase()
      .split(/\s+/)
      .map(w => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
};
