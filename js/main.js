// Bootstrap: conecta todas las piezas.

import { NODES, LINKS, VLANS } from './data.js';
import { renderTopology, applyVlanFilter, markSelected, onSelect, renderDetail } from './topology.js';
import { simulate, findPath } from './simulation.js';
import { renderRacks } from './rack.js';
import { initCable } from './cable.js';
import { renderCLI, initTour } from './views.js';

const state = {
  view: 'topo',
  vlan: 'all',
  selected: null,
  initedViews: new Set(['topo'])
};

document.addEventListener('DOMContentLoaded', () => {
  // 1) Topología
  renderTopology('topoSvg');

  // 2) Detalle: callback de selección
  const detailHost = document.getElementById('detailPanel');
  function setDetail(payload) {
    state.selected = payload;
    markSelected(payload || {});
    const inner = detailHost.querySelector('.detail') || (() => {
      const d = document.createElement('div');
      d.className = 'detail';
      detailHost.innerHTML = '';
      detailHost.appendChild(d);
      return d;
    })();
    renderDetail(inner, payload);
  }
  onSelect(setDetail);
  setDetail(null);

  // 3) Stats
  document.getElementById('statDev').textContent = NODES.length;
  document.getElementById('statLnk').textContent = LINKS.length;

  // 4) VLAN filter
  document.querySelectorAll('.vlanchip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.vlanchip').forEach(c => c.classList.toggle('is-active', c === chip));
      const v = chip.dataset.vlan;
      state.vlan = v;
      applyVlanFilter('topoSvg', v);
    });
  });

  // 5) Simulación
  populateSimSelects();
  document.getElementById('simRun').addEventListener('click', () => {
    const from = document.getElementById('simFrom').value;
    const to   = document.getElementById('simTo').value;
    if (from === to) {
      flashHint('El origen y el destino deben ser distintos.');
      return;
    }
    const path = findPath(from, to);
    if (!path) { flashHint('No hay ruta posible.'); return; }
    simulate('topoSvg', from, to);
  });

  // 6) View navigation
  document.querySelectorAll('.viewnav__btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // 7) Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    const map = { t: 'topo', r: 'rack', c: 'cable', l: 'cli', g: 'tour' };
    const v = map[e.key.toLowerCase()];
    if (v) switchView(v);
  });
});

function populateSimSelects() {
  const fromSel = document.getElementById('simFrom');
  const toSel   = document.getElementById('simTo');
  // Sólo dispositivos finales y servidor son orígenes/destinos útiles
  const choices = NODES.filter(n => ['laptop','server','internet'].includes(n.type) || n.id === 'gateway');
  const opts = choices.map(n => `<option value="${n.id}">${n.label} · ${n.sub}</option>`).join('');
  fromSel.innerHTML = opts;
  toSel.innerHTML = opts;
  // Defaults útiles: Alumno → Raspberry Pi
  fromSel.value = 'mesa1';
  toSel.value   = 'pi';
}

function switchView(view) {
  if (state.view === view) return;
  state.view = view;
  document.querySelectorAll('.viewnav__btn').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === view));

  // Inicialización perezosa de cada vista (ahorra trabajo en Pi 3)
  if (!state.initedViews.has(view)) {
    state.initedViews.add(view);
    switch (view) {
      case 'rack':  renderRacks(); break;
      case 'cable': initCable(); break;
      case 'cli':   renderCLI(); break;
      case 'tour':  initTour(); break;
    }
  }
}

function flashHint(msg) {
  const hint = document.querySelector('.canvas-hint');
  if (!hint) return;
  const prev = hint.textContent;
  hint.textContent = msg;
  hint.style.color = 'var(--warn)';
  setTimeout(() => { hint.textContent = prev; hint.style.color = ''; }, 2400);
}
