// Inspector visual de cables T568A/B.

import { PINOUTS, LINKS, nodeById } from './data.js';

const state = { a: 'T568B', b: 'T568B' };

export function initCable() {
  // Listeners de los segmented buttons
  document.querySelectorAll('.cable-controls .segbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const end = btn.dataset.end;
      const norm = btn.dataset.norm;
      state[end] = norm;
      document.querySelectorAll(`.cable-controls .segbtn[data-end="${end}"]`).forEach(b => b.classList.toggle('is-active', b === btn));
      renderCable();
    });
  });
  renderCable();
  renderUsage();
}

function renderCable() {
  const host = document.getElementById('cableContainer');
  const verdict = document.getElementById('cableVerdict');
  if (!host) return;

  const isCross = state.a !== state.b;
  verdict.textContent = isCross ? 'Cable CRUZADO' : 'Cable DIRECTO';
  verdict.dataset.kind = isCross ? 'cruzado' : 'directo';

  host.innerHTML = `
    <div class="cable">
      ${renderEnd('A', state.a)}
      ${renderEnd('B', state.b)}
    </div>
  `;
}

function renderEnd(label, norm) {
  const pinout = PINOUTS[norm];
  const pinsRJ = pinout.map(p => {
    const bg = p.stripe
      ? `linear-gradient(90deg, ${p.hex} 50%, ${p.stripe} 50%)`
      : p.hex;
    return `<div class="connector__pin" style="background:${bg}"></div>`;
  }).join('');
  const rows = pinout.map(p => {
    const bg = p.stripe
      ? `linear-gradient(90deg, ${p.hex} 50%, ${p.stripe} 50%)`
      : p.hex;
    return `<div class="connector__row">
              <span class="connector__pinNum">${p.pin}</span>
              <span class="connector__wirebar" style="background:${bg}" title="${p.color}"></span>
            </div>`;
  }).join('');

  return `
    <div class="cable__end">
      <h4>Punta ${label} <span class="cable__norm">${norm}</span></h4>
      <div class="connector">
        <div class="connector__rj">${pinsRJ}</div>
        <div class="connector__list">${rows}</div>
      </div>
    </div>
  `;
}

function renderUsage() {
  const ul = document.getElementById('cableUsage');
  if (!ul) return;
  const items = LINKS
    .filter(l => l.kind === 'directo' || l.kind === 'cruzado' || l.kind === 'fijo')
    .map(l => {
      const a = nodeById(l.a), b = nodeById(l.b);
      const cls = l.kind === 'cruzado' ? 'cross' : '';
      const kind = l.kind === 'cruzado' ? 'Cruzado A/B' : (l.kind === 'fijo' ? 'Fijo (T568B)' : 'Directo (T568B)');
      return `<li class="${cls}"><strong>${kind}</strong> · ${a.label} ↔ ${b.label}<br><span style="color:var(--text-mut)">${l.label || ''}</span></li>`;
    }).join('');
  ul.innerHTML = items;
}
