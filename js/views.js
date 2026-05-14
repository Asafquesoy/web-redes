// Vistas CLI y Tour.

import { CLI_BLOCKS, TOUR_STEPS } from './data.js';
import { renderTopology } from './topology.js';
import { highlightTourEdges } from './simulation.js';

/* ===== CLI ===== */
export function renderCLI(containerId = 'cliContainer') {
  const root = document.getElementById(containerId);
  if (!root) return;
  root.innerHTML = CLI_BLOCKS.map(block => `
    <article class="terminal">
      <header class="terminal__head">
        <span class="terminal__dots">
          <span class="terminal__dot"></span>
          <span class="terminal__dot"></span>
          <span class="terminal__dot"></span>
        </span>
        <span class="terminal__title">${block.title} · <span style="color:var(--acc)">${block.prompt}</span></span>
      </header>
      <div class="terminal__body">
        ${block.steps.map(s => `
          <section class="terminal__section">
            <div class="terminal__heading">▸ ${s.heading}</div>
            <pre>${highlightCode(s.code, block.prompt)}</pre>
          </section>
        `).join('')}
      </div>
    </article>
  `).join('');
}

function highlightCode(code, prompt) {
  // Mini syntax highlighter: comentarios, números, strings
  return code
    .split('\n')
    .map(line => {
      let out = escapeHtml(line);
      // Comentarios IOS estilo `! ...`
      out = out.replace(/^(\s*!\s.*)$/g, '<span class="com">$1</span>');
      // Comentario shell `# ...`
      out = out.replace(/^(\s*#\s.*)$/g, '<span class="com">$1</span>');
      // Números (vlans, baud rates, IPs cortas)
      out = out.replace(/\b(\d{1,3}(?:\.\d{1,3}){0,3})\b/g, '<span class="num">$1</span>');
      // Cadenas entre comillas (raras aquí)
      out = out.replace(/(&quot;[^&]+&quot;)/g, '<span class="str">$1</span>');
      // Comandos clave al inicio
      out = out.replace(/^(\s*)(configure|interface|switchport|vlan|name|enable|line|password|login|exit|hostname|copy|save|do|sudo|apt)\b/g,
        '$1<span class="cmd">$2</span>');
      return out;
    })
    .join('\n');
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===== Tour ===== */
let tourIndex = 0;

export function initTour() {
  // Render del SVG dentro del contenedor del tour
  renderTopology('tourSvg', { tour: true });
  document.getElementById('tourTotal').textContent = TOUR_STEPS.length;
  document.getElementById('tourPrev').addEventListener('click', () => goTour(tourIndex - 1));
  document.getElementById('tourNext').addEventListener('click', () => goTour(tourIndex + 1));
  document.getElementById('tourReplay').addEventListener('click', () => goTour(0));
  goTour(0);
}

function goTour(idx) {
  if (idx < 0) idx = 0;
  if (idx >= TOUR_STEPS.length) idx = TOUR_STEPS.length - 1;
  tourIndex = idx;
  const step = TOUR_STEPS[idx];
  document.getElementById('tourPos').textContent = idx + 1;
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourBody').textContent = step.body;
  highlightTourEdges('tourSvg', step.edges, step.focus);
  document.getElementById('tourPrev').disabled = (idx === 0);
  document.getElementById('tourNext').disabled = (idx === TOUR_STEPS.length - 1);
}
