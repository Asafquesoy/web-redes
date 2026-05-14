// Simulación de un paquete viajando por la red.
// 1) BFS sobre el grafo de enlaces para hallar el camino más corto.
// 2) Anima un círculo SVG sobre cada path (getPointAtLength) en secuencia.

import { NODES, LINKS, nodeById } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Construye grafo a partir de LINKS. */
function buildGraph() {
  const adj = new Map();
  NODES.forEach(n => adj.set(n.id, []));
  LINKS.forEach(l => {
    adj.get(l.a).push({ to: l.b, link: l });
    adj.get(l.b).push({ to: l.a, link: l });
  });
  return adj;
}

/* Encuentra el camino más corto (lista de links). */
export function findPath(fromId, toId) {
  if (fromId === toId) return [];
  const adj = buildGraph();
  const queue = [[fromId, []]];
  const seen = new Set([fromId]);
  while (queue.length) {
    const [cur, path] = queue.shift();
    for (const { to, link } of adj.get(cur)) {
      if (seen.has(to)) continue;
      const next = [...path, link];
      if (to === toId) return next;
      seen.add(to);
      queue.push([to, next]);
    }
  }
  return null;
}

/* Elige color del paquete según VLAN dominante del camino. */
function pickColorClass(srcNode, dstNode) {
  const v = (srcNode.vlans && srcNode.vlans[0]) || (dstNode.vlans && dstNode.vlans[0]);
  if (v === 10) return 'packet--v10';
  if (v === 20) return 'packet--v20';
  if (v === 30) return 'packet--v30';
  return '';
}

/* Anima el paquete por una secuencia de paths. */
export function simulate(svgId, fromId, toId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const fromNode = nodeById(fromId);
  const toNode   = nodeById(toId);
  if (!fromNode || !toNode) return;

  const path = findPath(fromId, toId);
  if (!path || !path.length) return;

  // Determinar dirección de cada path (a→b o b→a) según el avance
  let currentNode = fromId;
  const ordered = path.map(link => {
    const reverse = (link.a !== currentNode);
    currentNode = (link.a === currentNode) ? link.b : link.a;
    return { link, reverse };
  });

  // Limpiar overlay anterior
  const overlay = svg.querySelector('.packets');
  if (overlay) overlay.innerHTML = '';
  svg.querySelectorAll('.link.is-active').forEach(e => e.classList.remove('is-active'));
  svg.querySelectorAll('.node.is-pulsing').forEach(e => e.classList.remove('is-pulsing'));

  const colorClass = pickColorClass(fromNode, toNode);

  // Crear círculos del paquete (con halo)
  const halo = document.createElementNS(SVG_NS, 'circle');
  halo.setAttribute('class', `packet__halo ${colorClass}`);
  halo.setAttribute('r', 16);
  halo.style.color = 'currentColor';
  const dot  = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', `packet ${colorClass}`);
  dot.setAttribute('r', 7);
  overlay.appendChild(halo);
  overlay.appendChild(dot);

  // Cuerpo "is-running" activa animaciones de flujo
  document.body.classList.add('is-running');

  // Animar tramo a tramo
  let i = 0;
  const stepMs = 700;
  function runStep() {
    if (i >= ordered.length) {
      // Final: pulso en el destino y limpieza
      const target = svg.querySelector(`.node[data-id="${toId}"]`);
      if (target) {
        target.classList.add('is-pulsing');
        setTimeout(() => target.classList.remove('is-pulsing'), 1800);
      }
      setTimeout(() => {
        if (halo.parentNode) halo.parentNode.removeChild(halo);
        if (dot.parentNode) dot.parentNode.removeChild(dot);
        svg.querySelectorAll('.link.is-active').forEach(e => e.classList.remove('is-active'));
      }, 1500);
      return;
    }
    const { link, reverse } = ordered[i];
    const pathEl = svg.querySelector(`#path-${link.id}`);
    const linkG  = svg.querySelector(`.link[data-id="${link.id}"]`);
    if (!pathEl) { i++; runStep(); return; }
    linkG?.classList.add('is-active');

    const len = pathEl.getTotalLength();
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / stepMs);
      const u = reverse ? (1 - t) : t;
      const p = pathEl.getPointAtLength(u * len);
      halo.setAttribute('cx', p.x); halo.setAttribute('cy', p.y);
      dot.setAttribute('cx', p.x);  dot.setAttribute('cy', p.y);
      if (t < 1) requestAnimationFrame(frame);
      else {
        // dejar el "is-active" un momento y avanzar
        setTimeout(() => linkG?.classList.remove('is-active'), 300);
        i++;
        runStep();
      }
    }
    requestAnimationFrame(frame);
  }
  runStep();
}

/* Variante "tour": no anima paquete, solo marca enlaces activos del paso. */
export function highlightTourEdges(svgId, edgeIds, focusNodeId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.querySelectorAll('.link.tour-active').forEach(e => e.classList.remove('tour-active'));
  svg.querySelectorAll('.node.is-pulsing').forEach(e => e.classList.remove('is-pulsing'));
  edgeIds.forEach(id => {
    const g = svg.querySelector(`.link[data-id="${id}"]`);
    if (g) g.classList.add('tour-active');
  });
  if (focusNodeId) {
    const n = svg.querySelector(`.node[data-id="${focusNodeId}"]`);
    if (n) n.classList.add('is-pulsing');
  }
}
