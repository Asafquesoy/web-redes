// Vista "Rack": representación visual realista de cada switch con sus puertos.

import { NODES, nodeById } from './data.js';

const SWITCHES = ['sw_central', 'cisco1', 'cisco2'];

export function renderRacks(containerId = 'rackContainer') {
  const root = document.getElementById(containerId);
  if (!root) return;
  root.innerHTML = '';
  SWITCHES.forEach(id => {
    const n = nodeById(id);
    if (!n) return;
    root.appendChild(buildRack(n));
  });
}

function buildRack(node) {
  const rack = document.createElement('div');
  rack.className = 'rack';
  rack.innerHTML = `
    <div class="rack__head">
      <div>
        <div class="rack__name">${node.label}</div>
        <div class="rack__sub">${node.sub}</div>
      </div>
      <div class="rack__sub">${node.ports} puertos</div>
    </div>
    <div class="rack__bezel">
      <div class="rack__brand">${brandFor(node.id)}</div>
      <div class="rack__ports" data-ports></div>
      <div class="rack__leds">
        <span class="rack__led rack__led--pwr" title="Power"></span>
        <span class="rack__led rack__led--sys" title="System"></span>
      </div>
    </div>
    <div class="rack__legend">
      <span style="color:var(--ok)"><i style="border-color:var(--ok)"></i> En uso</span>
      <span style="color:var(--vlan-trunk)"><i style="border-color:var(--vlan-trunk)"></i> Trunk</span>
      <span style="color:var(--vlan-10)"><i style="border-color:var(--vlan-10)"></i> Access VLAN 10</span>
      <span style="color:var(--vlan-20)"><i style="border-color:var(--vlan-20)"></i> Access VLAN 20</span>
      <span style="color:var(--vlan-30)"><i style="border-color:var(--vlan-30)"></i> Access VLAN 30</span>
    </div>
  `;

  const portsHost = rack.querySelector('[data-ports]');
  const portList = generatePortList(node);
  portList.forEach(p => portsHost.appendChild(buildPort(p, node)));
  return rack;
}

function brandFor(id) {
  if (id === 'sw_central') return 'TP-Link Omada · SG3428';
  if (id === 'cisco1')     return 'Cisco Catalyst · Cisco_Alumnos';
  if (id === 'cisco2')     return 'Cisco Catalyst · Cisco_Profesor';
  return '';
}

/* Devuelve la lista de puertos a renderizar.
   Para Cisco usamos numeración FastEthernet 0/x; los Gigabit van al final. */
function generatePortList(node) {
  const list = [];
  if (node.id === 'sw_central') {
    for (let i = 1; i <= 24; i++) list.push({ key: i, label: i });
  } else {
    for (let i = 1; i <= 24; i++) list.push({ key: `0/${i}`, label: i });
    list.push({ key: 'Gi0/1', label: 'G1', isUplink: true });
    list.push({ key: 'Gi0/2', label: 'G2', isUplink: true });
  }
  return list;
}

function buildPort(p, node) {
  const cfg = (node.portMap && node.portMap[p.key]) || null;
  const dom = document.createElement('button');
  dom.className = 'port';
  dom.dataset.state = cfg ? 'used' : 'free';
  if (cfg) {
    dom.dataset.mode = cfg.mode;
    dom.dataset.vlan = cfg.vlans[0];
  }
  if (p.isUplink) {
    dom.style.background = '#0a1830';
  }
  dom.innerHTML = `
    <span class="port__num">${p.label}</span>
    <span class="port__tip">
      <strong>Puerto ${p.key}</strong><br>
      ${cfg ? `${cfg.mode === 'trunk' ? 'TRUNK · VLAN ' + cfg.vlans.join(',') : 'ACCESS · VLAN ' + cfg.vlans[0]}<br>${cfg.desc}` : 'Sin uso'}
    </span>
  `;
  return dom;
}
