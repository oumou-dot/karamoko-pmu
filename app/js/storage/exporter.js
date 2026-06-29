/**
 * EXPORTER
 */

const PMUExporter = {
  exportCSV(course, analyses) {
    let csv = 'N°;Nom;Corde;Cote;P1;P2;P3;P4;P5;Score;Niveau\n';
    
    if (analyses && analyses.tousScores) {
      for (const score of analyses.tousScores) {
        const cheval = course.chevaux.find(c => c.numero === score.numero) || course.chevaux.find(c => c.nom === score.cheval);
        if (cheval) {
          csv += `${cheval.numero};${cheval.nom};${cheval.corde ?? ''};${cheval.cote};`;
          csv += `${cheval.performances.join(';')};`;
          csv += `${score.score};${score.niveau.label}\n`;
        }
      }
    }

    if (analyses && analyses.combinaisonsKaramoko && analyses.combinaisonsKaramoko.length > 0) {
      csv += '\nCombinaisons Karamoko\n';
      csv += analyses.combinaisonsKaramoko.map(c => c.join('-')).join('\n');
      csv += '\n';
    }
    
    return csv;
  },

  exportJSON(data) {
    return JSON.stringify(data, null, 2);
  },

  telecharger(contenu, nomFichier, typeMIME) {
    const blob = new Blob([contenu], { type: typeMIME });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  },

  exportCourseRapide(course, analyses) {
    const date = new Date().toISOString().split('T')[0];
    const hippodrome = course.hippodrome || 'Course';
    
    const csv = this.exportCSV(course, analyses);
    this.telecharger(csv, `KPMU_${hippodrome}_${date}.csv`, 'text/csv;charset=utf-8;');
    
    const json = this.exportJSON({ course, analyses, dateExport: new Date().toISOString() });
    this.telecharger(json, `KPMU_${hippodrome}_${date}.json`, 'application/json');
  }
};