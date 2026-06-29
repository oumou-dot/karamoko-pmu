/**
 * CHARTS - Graphiques SVG simples
 */

const PMUCharts = {
  barChart(data, options = {}) {
    const { width = 400, height = 200, color = '#e94560' } = options;
    const max = Math.max(...data.map(d => d.value), 1);
    const barWidth = (width / data.length) * 0.7;
    const gap = (width / data.length) * 0.3;
    
    let svg = `<svg width="${width}" height="${height + 30}" viewBox="0 0 ${width} ${height + 30}">`;
    
    data.forEach((d, i) => {
      const barHeight = (d.value / max) * (height - 20);
      const x = i * (barWidth + gap) + gap / 2;
      const y = height - barHeight;
      
      svg += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${d.color || color}" rx="3" opacity="0.8"/>
        <text x="${x + barWidth/2}" y="${height + 15}" text-anchor="middle" fill="#ccc" font-size="10">${d.label}</text>
        <text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" fill="#fff" font-size="10">${d.value}</text>
      `;
    });
    
    svg += '</svg>';
    return svg;
  }
};