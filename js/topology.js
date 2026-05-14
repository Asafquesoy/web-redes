// Render del SVG de topología: nodos, enlaces curvos, interacciones.
// Sin dependencias: SVG construido manualmente. Pensado para ~12 nodos.

import { NODES, LINKS, VLANS, nodeById } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ===== Iconos por tipo de nodo =====
   Devuelve un fragmento SVG (string) que se insertará centrado en el nodo. */
const NODE_RADIUS = 38;
const ICONS = {
  cloud: () => `
    <path class="node__icon" d="M -18 4 Q -22 -6 -12 -8 Q -10 -16 0 -14 Q 10 -18 16 -8 Q 24 -6 20 6 Z" />
  `,
  router: () => `
    <rect class="node__icon" x="-22" y="-6" width="44" height="14" rx="3"/>
    <circle class="node__icon-fill" cx="-12" cy="1" r="2"/>
    <circle class="node__icon-fill" cx="-4"  cy="1" r="2"/>
    <circle class="node__icon-fill" cx="4"   cy="1" r="2"/>
    <circle class="node__icon-fill" cx="12"  cy="1" r="2"/>
    <path class="node__icon" d="M -16 -10 L -8 -16 M 16 -10 L 8 -16 M 0 -10 L 0 -18"/>
  `,
  switch_core: () => `
    <rect class="node__icon" x="-22" y="-8" width="44" height="16" rx="2"/>
    <rect class="node__icon" x="-22" y="-3" width="44" height="6"  rx="1"/>
    <circle class="node__icon-fill" cx="-15" cy="6" r="1.6"/>
    <circle class="node__icon-fill" cx="-9"  cy="6" r="1.6"/>
    <circle class="node__icon-fill" cx="-3"  cy="6" r="1.6"/>
    <circle class="node__icon-fill" cx="3"   cy="6" r="1.6"/>
    <circle class="node__icon-fill" cx="9"   cy="6" r="1.6"/>
    <circle class="node__icon-fill" cx="15"  cy="6" r="1.6"/>
  `,
  switch_access: () => `
    <rect class="node__icon" x="-22" y="-6" width="44" height="12" rx="2"/>
    <circle class="node__icon-fill" cx="-14" cy="3" r="1.6"/>
    <circle class="node__icon-fill" cx="-7"  cy="3" r="1.6"/>
    <circle class="node__icon-fill" cx="0"   cy="3" r="1.6"/>
    <circle class="node__icon-fill" cx="7"   cy="3" r="1.6"/>
    <circle class="node__icon-fill" cx="14"  cy="3" r="1.6"/>
  `,
  server: () => `
    <rect class="node__icon" x="-16" y="-14" width="32" height="10" rx="2"/>
    <rect class="node__icon" x="-16" y="-2"  width="32" height="10" rx="2"/>
    <circle class="node__icon-fill" cx="-9" cy="-9" r="1.6"/>
    <circle class="node__icon-fill" cx="-9" cy="3"  r="1.6"/>
    <line class="node__icon" x1="-4" y1="-9" x2="10" y2="-9"/>
    <line class="node__icon" x1="-4" y1="3"  x2="10" y2="3"/>
  `,
  patch: () => `
    <rect class="node__icon" x="-22" y="-7" width="44" height="14" rx="2"/>
    <line class="node__icon" x1="-16" y1="-7" x2="-16" y2="7"/>
    <line class="node__icon" x1="-8"  y1="-7" x2="-8"  y2="7"/>
    <line class="node__icon" x1="0"   y1="-7" x2="0"   y2="7"/>
    <line class="node__icon" x1="8"   y1="-7" x2="8"   y2="7"/>
    <line class="node__icon" x1="16"  y1="-7" x2="16"  y2="7"/>
  `,
  laptop: () => `
    <rect class="node__icon" x="-15" y="-12" width="30" height="18" rx="2"/>
    <path class="node__icon" d="M -20 8 L 20 8 L 17 12 L -17 12 Z"/>
  `
};

/* ===== Utilidades SVG ===== */
function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    node.setAttribute(k, v);
  }
  if (parent) parent.appendChild(node);
  return node;
}

/* Calcula una curva Bezier suave entre dos nodos */
function pathBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  // Punto medio + ligera curvatura perpendicular para que los enlaces no se pisen
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const curv = Math.min(60, dist * 0.18);
  // Curvatura: hacia afuera del eje vertical para los laterales
  const offsetX = (a.id === 'sw_central' || b.id === 'sw_central') ? 0 : 0;
  const cx = mx + offsetX;
  const cy = my - curv * 0.25;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

/* ===== Render principal ===== */
export function renderTopology(svgId = 'topoSvg', { tour = false } = {}) {
  const svg = document.getElementById(svgId);
  if (!svg) return null;
  svg.innerHTML = '';

  // <defs> con un marcador opcional (no estrictamente necesario aquí)
  const defs = el('defs', {}, svg);

  // Capa 1: glow detrás de los enlaces
  const gLinks = el('g', { class: 'links' }, svg);

  // Capa 2: enlaces visibles
  // Capa 3: etiquetas trunk
  const gTags = el('g', { class: 'link-tags' }, svg);

  // Capa 4: nodos
  const gNodes = el('g', { class: 'nodes' }, svg);

  // Capa 5: paquete (overlay)
  const gPackets = el('g', { class: 'packets' }, svg);

  // Construir enlaces
  const linkEls = {};
  LINKS.forEach(link => {
    const a = nodeById(link.a);
    const b = nodeById(link.b);
    if (!a || !b) return;

    const g = el('g', { class: 'link', 'data-id': link.id, 'data-kind': link.kind, 'data-vlans': link.vlans.join(',') }, gLinks);
    const d = pathBetween(a, b);
    el('path', { class: 'link-glow', d }, g);
    el('path', { class: 'link-line', d, id: `path-${link.id}` }, g);
    linkEls[link.id] = g;

    // Etiqueta para trunks
    if (link.tagged) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - 8;
      const t = el('text', { class: 'link__tag', x: mx, y: my, 'text-anchor': 'middle' }, gTags);
      t.textContent = `802.1Q · VLAN ${link.vlans.join(',')}`;
    }

    if (!tour) {
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        emitSelect({ kind: 'link', id: link.id });
      });
    }
  });

  // Construir nodos
  const nodeEls = {};
  NODES.forEach(n => {
    const g = el('g', {
      class: 'node',
      'data-id': n.id,
      'data-type': n.type,
      'data-vlans': (n.vlans || []).join(','),
      'data-vlan': (n.vlans && n.vlans.length === 1) ? n.vlans[0] : null,
      transform: `translate(${n.x} ${n.y})`
    }, gNodes);

    // Halo (rect redondeado)
    el('rect', { class: 'node__halo', x: -NODE_RADIUS, y: -NODE_RADIUS+8, width: NODE_RADIUS*2, height: NODE_RADIUS*2-16, rx: 12 }, g);

    // Pad clicable más grande (transparente)
    el('rect', { class: 'node__pad', x: -NODE_RADIUS-6, y: -NODE_RADIUS+2, width: (NODE_RADIUS+6)*2, height: NODE_RADIUS*2-4, rx: 14 }, g);

    // Icono (insertado como innerHTML para no clonar mucho)
    const iconWrap = el('g', { class: 'node__iconwrap' }, g);
    iconWrap.innerHTML = (ICONS[n.type] || ICONS.switch_access)();

    // Texto
    const tLabel = el('text', { class: 'node__label', x: 0, y: NODE_RADIUS + 14 }, g);
    tLabel.textContent = n.label;
    const tSub = el('text', { class: 'node__sub', x: 0, y: NODE_RADIUS + 30 }, g);
    tSub.textContent = n.sub;

    nodeEls[n.id] = g;

    if (!tour) {
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        emitSelect({ kind: 'node', id: n.id });
      });
    }
  });

  // Click en zona vacía → deselecciona
  if (!tour) {
    svg.addEventListener('click', () => emitSelect(null));
  }

  return { svg, linkEls, nodeEls, gPackets };
}

/* ===== Filtrado por VLAN ===== */
export function applyVlanFilter(svgId, vlan) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  if (vlan === 'all' || vlan == null) {
    svg.classList.remove('is-filtered');
    svg.querySelectorAll('.node, .link').forEach(el => el.classList.remove('match-vlan'));
    return;
  }
  svg.classList.add('is-filtered');
  const v = String(vlan);
  svg.querySelectorAll('.link').forEach(elNode => {
    const vlans = (elNode.getAttribute('data-vlans') || '').split(',');
    elNode.classList.toggle('match-vlan', vlans.includes(v));
  });
  svg.querySelectorAll('.node').forEach(elNode => {
    const vlans = (elNode.getAttribute('data-vlans') || '').split(',');
    elNode.classList.toggle('match-vlan', vlans.includes(v));
  });
}

/* ===== Selección visible ===== */
export function markSelected({ kind, id } = {}) {
  document.querySelectorAll('#topoSvg .is-selected').forEach(e => e.classList.remove('is-selected'));
  if (!kind) return;
  const sel = kind === 'node'
    ? document.querySelector(`#topoSvg .node[data-id="${id}"]`)
    : document.querySelector(`#topoSvg .link[data-id="${id}"]`);
  if (sel) sel.classList.add('is-selected');
}

/* ===== Bus de eventos sencillo ===== */
const listeners = new Set();
export function onSelect(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emitSelect(payload) { listeners.forEach(cb => cb(payload)); }

/* ===== Helpers para el detalle ===== */
export function renderDetail(target, payload) {
  const empty = `<div class="detail__empty">
      <div class="detail__emptyIcon">◇</div>
      <p>Selecciona un nodo o una conexión para inspeccionarla.</p>
    </div>`;
  if (!payload) { target.innerHTML = empty; return; }
  target.classList.remove('is-fresh');
  // forzar reflow para reanimar
  void target.offsetWidth;
  target.classList.add('is-fresh');

  if (payload.kind === 'node') {
    target.innerHTML = renderNodeDetail(payload.id);
  } else if (payload.kind === 'link') {
    target.innerHTML = renderLinkDetail(payload.id);
  }
}

function vlanPills(vlans = []) {
  return vlans.map(v => `<span class="detail__pill detail__pill--v${v}">VLAN ${v} · ${VLANS[v].name}</span>`).join('');
}

function renderNodeDetail(id) {
  const n = nodeById(id);
  if (!n) return '';
  let sections = '';

  // Sección de info
  sections += `<div class="detail__section">
    <h4>Descripción</h4>
    <p style="margin:0;font-size:12.5px;color:var(--text)">${n.info || ''}</p>
  </div>`;

  if (n.vlans && n.vlans.length) {
    sections += `<div class="detail__section">
      <h4>VLANs</h4>
      <div>${vlanPills(n.vlans)}</div>
    </div>`;
  }

  if (n.net) {
    sections += `<div class="detail__section">
      <h4>Configuración IP</h4>
      <div class="detail__row"><span>IP</span><span>${n.net.ip}</span></div>
      <div class="detail__row"><span>Máscara</span><span>${n.net.mask}</span></div>
      <div class="detail__row"><span>Gateway</span><span>${n.net.gw}</span></div>
    </div>`;
  }

  if (n.interfaces) {
    sections += `<div class="detail__section">
      <h4>Interfaces virtuales (Inter-VLAN)</h4>
      ${n.interfaces.map(i => `
        <div class="detail__row"><span>VLAN ${i.vlan}</span><span>${i.ip} / ${i.mask}</span></div>
        <div class="detail__row"><span>DHCP</span><span>${i.dhcp}</span></div>
      `).join('<hr style="border:0;border-top:1px dashed var(--line);margin:6px 0">')}
    </div>`;
  }

  if (n.console) {
    sections += `<div class="detail__section">
      <h4>Acceso por consola</h4>
      ${Object.entries(n.console).map(([k,v]) => `<div class="detail__row"><span>${k}</span><span>${v}</span></div>`).join('')}
    </div>`;
  }
  if (n.access) {
    sections += `<div class="detail__section">
      <h4>Acceso</h4>
      ${Object.entries(n.access).map(([k,v]) => `<div class="detail__row"><span>${k}</span><span>${v}</span></div>`).join('')}
    </div>`;
  }
  if (n.services) {
    sections += `<div class="detail__section">
      <h4>Servicios</h4>
      <ul class="detail__list">${n.services.map(s => `<li>${s}</li>`).join('')}</ul>
    </div>`;
  }
  if (n.portMap) {
    sections += `<div class="detail__section">
      <h4>Puertos configurados</h4>
      ${Object.entries(n.portMap).map(([p, info]) => `
        <div class="detail__row"><span>Puerto ${p}</span><span>${info.mode === 'trunk' ? 'TRUNK '+info.vlans.join(',') : 'ACCESS '+info.vlans[0]}</span></div>
        <div class="detail__row"><span></span><span style="opacity:.7">${info.desc}</span></div>
      `).join('')}
    </div>`;
  }
  if (n.panelMap) {
    sections += `<div class="detail__section">
      <h4>Mapa del Patch Panel</h4>
      ${n.panelMap.map(p => `
        <div class="detail__row"><span>P${p.port} · VLAN ${p.vlan}</span><span>${p.from} → ${p.to}</span></div>
      `).join('')}
    </div>`;
  }

  return `
    <div class="detail__head">
      <div class="detail__icon">${iconForType(n.type)}</div>
      <div>
        <h3 class="detail__name">${n.label}</h3>
        <div class="detail__sub">${n.sub}</div>
      </div>
    </div>
    ${sections}
  `;
}

function renderLinkDetail(id) {
  const link = LINKS.find(l => l.id === id);
  if (!link) return '';
  const a = nodeById(link.a);
  const b = nodeById(link.b);
  const kindLabels = { directo: 'Cable directo (T568B / T568B)', cruzado: 'Cable cruzado (T568A / T568B)', fijo: 'Cableado fijo en canaleta (T568B)', wan: 'Enlace WAN' };
  return `
    <div class="detail__head">
      <div class="detail__icon">↔</div>
      <div>
        <h3 class="detail__name">${a.label} ↔ ${b.label}</h3>
        <div class="detail__sub">${link.label || ''}</div>
      </div>
    </div>
    <div class="detail__section">
      <h4>Tipo de enlace</h4>
      <div class="detail__codeline">${kindLabels[link.kind] || link.kind}</div>
    </div>
    ${link.vlans.length ? `<div class="detail__section">
      <h4>VLANs que transporta</h4>
      <div>${vlanPills(link.vlans)}</div>
      <div class="detail__row" style="margin-top:8px"><span>Etiquetado 802.1Q</span><span>${link.tagged ? 'Sí (trunk)' : 'No (access)'}</span></div>
    </div>` : ''}
  `;
}

function iconForType(t) {
  const map = { cloud: '☁', router: '◈', switch_core: '▣', switch_access: '▥', server: '▦', patch: '▤', laptop: '▭' };
  return map[t] || '◆';
}
