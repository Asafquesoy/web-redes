/* NetLab Explorer — bundle único sin módulos ES.
   Compatible con file:// y Apache2. */
(function () {
'use strict';

// ═══════════════════════════════════════════════
//  DATOS DE LA RED
// ═══════════════════════════════════════════════

var VLANS = {
  10: { id: 10, name: 'Alumnos',    subnet: '192.168.10.0/24', gw: '192.168.10.1', dhcp: '192.168.10.10 – 192.168.10.250', color: 'var(--vlan-10)' },
  20: { id: 20, name: 'Profesor',   subnet: '192.168.20.0/24', gw: '192.168.20.1', dhcp: '192.168.20.10 – 192.168.20.250', color: 'var(--vlan-20)' },
  30: { id: 30, name: 'Servidores', subnet: '192.168.30.0/24', gw: '192.168.30.1', dhcp: 'Deshabilitado (IP estática)',     color: 'var(--vlan-30)' }
};

var NODES = [
  { id: 'internet',   type: 'cloud',         label: 'Internet',              sub: 'WAN',                            x: 700,  y: 70,
    info: 'Acceso externo a la red. Conectado al puerto WAN del Gateway TP-Link ER605.' },
  { id: 'gateway',    type: 'router',        label: 'TP-Link ER605',         sub: 'Gateway · Inter-VLAN Routing',   x: 700,  y: 200,
    vlans: [10, 20, 30],
    info: 'Gateway de borde. Crea interfaces virtuales para VLAN 10/20/30 y enruta entre ellas.',
    interfaces: [
      { vlan: 10, ip: '192.168.10.1', mask: '255.255.255.0', dhcp: '10–250' },
      { vlan: 20, ip: '192.168.20.1', mask: '255.255.255.0', dhcp: '10–250' },
      { vlan: 30, ip: '192.168.30.1', mask: '255.255.255.0', dhcp: 'OFF (estático)' }
    ],
    access: { tipo: 'Web UI', url: '192.168.0.1 ó 192.168.1.1', user: 'admin' }
  },
  { id: 'sw_central', type: 'switch_core',   label: 'TP-Link Omada SG3428',  sub: 'Switch Central · L2',            x: 700,  y: 340,
    vlans: [10, 20, 30],
    info: 'Núcleo de la red. Distribuye tráfico etiquetado entre el Gateway, los Cisco de acceso y la Raspberry Pi.',
    console: { baud: 38400, usuario: 'admin', pass: 'admin' }, ports: 24,
    portMap: {
      1:  { mode: 'trunk',  vlans: [10,20,30], desc: 'Uplink al Gateway ER605 (P1)' },
      2:  { mode: 'access', vlans: [30],       desc: 'Raspberry Pi (Servidor Web)' },
      23: { mode: 'trunk',  vlans: [10,20,30], desc: 'Trunk hacia Cisco 1 (Alumnos)' },
      24: { mode: 'trunk',  vlans: [10,20,30], desc: 'Trunk hacia Cisco 2 (Profesor)' }
    }
  },
  { id: 'pi',         type: 'server',        label: 'Raspberry Pi 3',        sub: 'Servidor Web · Apache2',         x: 220,  y: 480,
    vlans: [30],
    info: 'Servidor web local. Aloja esta misma aplicación. IP estática en la VLAN de servidores.',
    net: { ip: '192.168.30.2', mask: '255.255.255.0', gw: '192.168.30.1' },
    services: ['Apache2 (http/80)', 'SSH (opcional)', 'Samba (opcional)']
  },
  { id: 'cisco1',     type: 'switch_access', label: 'Cisco Catalyst 1',      sub: 'Cisco_Alumnos · VLAN 10',        x: 520,  y: 480,
    vlans: [10, 20, 30],
    info: 'Switch de acceso para el área de Alumnos. Puertos Fa0/1–5 asignados a VLAN 10.',
    console: { baud: 9600, secret: 'clase123', linePass: 'cisco123' }, ports: 24,
    portMap: {
      'Fa0/1': { mode: 'access', vlans: [10], desc: 'Patch Panel P1 → Mesa Alumno' },
      'Fa0/2': { mode: 'access', vlans: [10], desc: 'Patch Panel P2 → Mesa Alumno' },
      'Fa0/3': { mode: 'access', vlans: [10], desc: 'Patch Panel P3 → Mesa Alumno' },
      'Fa0/4': { mode: 'access', vlans: [10], desc: 'Patch Panel P4 → Mesa Alumno' },
      'Fa0/5': { mode: 'access', vlans: [10], desc: 'Patch Panel P5 → Mesa Alumno' },
      'Gi0/1': { mode: 'trunk',  vlans: [10,20,30], desc: 'Uplink Trunk → SW Central P23' }
    }
  },
  { id: 'cisco2',     type: 'switch_access', label: 'Cisco Catalyst 2',      sub: 'Cisco_Profesor · VLAN 20',       x: 880,  y: 480,
    vlans: [10, 20, 30],
    info: 'Switch de acceso para el área del Profesor. Aísla la VLAN 20 por seguridad.',
    console: { baud: 9600, secret: 'clase123', linePass: 'cisco123' }, ports: 24,
    portMap: {
      'Fa0/1': { mode: 'access', vlans: [20], desc: 'Patch Panel P6 → Mesa Profesor' },
      'Gi0/1': { mode: 'trunk',  vlans: [10,20,30], desc: 'Uplink Trunk → SW Central P24' }
    }
  },
  { id: 'patch',      type: 'patch',         label: 'Patch Panel',           sub: '48 puertos · T568B',             x: 700,  y: 620,
    vlans: [10, 20],
    info: 'Distribución física. El frente recibe Patch Cords desde los Cisco; el reverso baja por canaletas a los faceplates de cada mesa.',
    panelMap: [
      { port: 1, from: 'Cisco1 Fa0/1', to: 'Mesa 1 Alumno',  vlan: 10 },
      { port: 2, from: 'Cisco1 Fa0/2', to: 'Mesa 1 Alumno',  vlan: 10 },
      { port: 3, from: 'Cisco1 Fa0/3', to: 'Mesa 2 Alumno',  vlan: 10 },
      { port: 4, from: 'Cisco1 Fa0/4', to: 'Mesa 2 Alumno',  vlan: 10 },
      { port: 5, from: 'Cisco1 Fa0/5', to: 'Mesa 3 Alumno',  vlan: 10 },
      { port: 6, from: 'Cisco2 Fa0/1', to: 'Mesa 4 Profesor', vlan: 20 }
    ]
  },
  { id: 'mesa1', type: 'laptop', label: 'Mesa 1', sub: 'Laptop Alumno · VLAN 10', x: 300, y: 800, vlans:[10],
    info: 'Equipo de alumno en VLAN 10. IP DHCP en 192.168.10.0/24.' },
  { id: 'mesa2', type: 'laptop', label: 'Mesa 2', sub: 'Laptop Alumno · VLAN 10', x: 500, y: 800, vlans:[10],
    info: 'Equipo de alumno en VLAN 10. IP DHCP en 192.168.10.0/24.' },
  { id: 'mesa3', type: 'laptop', label: 'Mesa 3', sub: 'Laptop Alumno · VLAN 10', x: 700, y: 800, vlans:[10],
    info: 'Equipo de alumno en VLAN 10. IP DHCP en 192.168.10.0/24.' },
  { id: 'mesa4', type: 'laptop', label: 'Mesa 4', sub: 'Laptop Profesor · VLAN 20', x: 1100, y: 800, vlans:[20],
    info: 'Equipo del profesor en VLAN 20. IP DHCP en 192.168.20.0/24.' }
];

var LINKS = [
  { id: 'l_wan',   a: 'internet',   b: 'gateway',    kind: 'wan',     vlans: [],         tagged: false, label: 'WAN' },
  { id: 'l_gw_sw', a: 'gateway',    b: 'sw_central', kind: 'directo', vlans: [10,20,30], tagged: true,  label: 'ER605 LAN1 ↔ SG3428 P1 · Trunk' },
  { id: 'l_sw_pi', a: 'sw_central', b: 'pi',         kind: 'directo', vlans: [30],       tagged: false, label: 'SG3428 P2 ↔ Pi · Access VLAN 30' },
  { id: 'l_sw_c1', a: 'sw_central', b: 'cisco1',     kind: 'cruzado', vlans: [10,20,30], tagged: true,  label: 'SG3428 P23 ↔ Cisco1 Gi0/1 · Trunk' },
  { id: 'l_sw_c2', a: 'sw_central', b: 'cisco2',     kind: 'cruzado', vlans: [10,20,30], tagged: true,  label: 'SG3428 P24 ↔ Cisco2 Gi0/1 · Trunk' },
  { id: 'l_c1_pp', a: 'cisco1',     b: 'patch',      kind: 'directo', vlans: [10],       tagged: false, label: 'Cisco1 Fa0/1-5 → Patch P1-5 · VLAN 10' },
  { id: 'l_c2_pp', a: 'cisco2',     b: 'patch',      kind: 'directo', vlans: [20],       tagged: false, label: 'Cisco2 Fa0/1 → Patch P6 · VLAN 20' },
  { id: 'l_pp_m1', a: 'patch',      b: 'mesa1',      kind: 'fijo',    vlans: [10],       tagged: false, label: 'Patch P1 → Faceplate Mesa 1' },
  { id: 'l_pp_m2', a: 'patch',      b: 'mesa2',      kind: 'fijo',    vlans: [10],       tagged: false, label: 'Patch P3 → Faceplate Mesa 2' },
  { id: 'l_pp_m3', a: 'patch',      b: 'mesa3',      kind: 'fijo',    vlans: [10],       tagged: false, label: 'Patch P5 → Faceplate Mesa 3' },
  { id: 'l_pp_m4', a: 'patch',      b: 'mesa4',      kind: 'fijo',    vlans: [20],       tagged: false, label: 'Patch P6 → Faceplate Mesa 4' }
];

var PINOUTS = {
  T568B: [
    { pin: 1, color: 'Blanco/Naranja', hex: '#f7c79a', stripe: '#ff7a18' },
    { pin: 2, color: 'Naranja',        hex: '#ff7a18', stripe: null },
    { pin: 3, color: 'Blanco/Verde',   hex: '#c8efc6', stripe: '#2bbf57' },
    { pin: 4, color: 'Azul',           hex: '#2f7bff', stripe: null },
    { pin: 5, color: 'Blanco/Azul',    hex: '#cfdcff', stripe: '#2f7bff' },
    { pin: 6, color: 'Verde',          hex: '#2bbf57', stripe: null },
    { pin: 7, color: 'Blanco/Marrón',  hex: '#dcc4a8', stripe: '#7a4a1d' },
    { pin: 8, color: 'Marrón',         hex: '#7a4a1d', stripe: null }
  ],
  T568A: [
    { pin: 1, color: 'Blanco/Verde',   hex: '#c8efc6', stripe: '#2bbf57' },
    { pin: 2, color: 'Verde',          hex: '#2bbf57', stripe: null },
    { pin: 3, color: 'Blanco/Naranja', hex: '#f7c79a', stripe: '#ff7a18' },
    { pin: 4, color: 'Azul',           hex: '#2f7bff', stripe: null },
    { pin: 5, color: 'Blanco/Azul',    hex: '#cfdcff', stripe: '#2f7bff' },
    { pin: 6, color: 'Naranja',        hex: '#ff7a18', stripe: null },
    { pin: 7, color: 'Blanco/Marrón',  hex: '#dcc4a8', stripe: '#7a4a1d' },
    { pin: 8, color: 'Marrón',         hex: '#7a4a1d', stripe: null }
  ]
};

var CLI_BLOCKS = [
  {
    device: 'cisco1', title: 'Cisco 1 — Área de Alumnos', prompt: 'Cisco_Alumnos#',
    steps: [
      { heading: 'Configuración inicial', code: '! Entrar a modo configuración\nconfigure terminal\n! Hostname\nhostname Cisco_Alumnos\n! Contraseña privilegiado\nenable secret clase123\n! Contraseña consola\nline console 0\n password cisco123\n login\nexit\ndo write memory' },
      { heading: 'Crear VLANs (hacer en todos los switches)', code: 'vlan 10\n name Alumnos\nexit\nvlan 20\n name Profesor\nexit\nvlan 30\n name Servidores\nexit' },
      { heading: 'Asignar puertos de Alumnos (Fa0/1–5)', code: 'interface range FastEthernet 0/1 - 5\n switchport mode access\n switchport access vlan 10\nexit' },
      { heading: 'Puerto troncal hacia SW Central', code: 'interface GigabitEthernet 0/1\n switchport mode trunk\nexit\ndo write memory' }
    ]
  },
  {
    device: 'cisco2', title: 'Cisco 2 — Área del Profesor', prompt: 'Cisco_Profesor#',
    steps: [
      { heading: 'Crear VLANs', code: 'vlan 10\n name Alumnos\nexit\nvlan 20\n name Profesor\nexit\nvlan 30\n name Servidores\nexit' },
      { heading: 'Asignar puerto del Profesor (Fa0/1)', code: 'interface FastEthernet 0/1\n switchport mode access\n switchport access vlan 20\nexit' },
      { heading: 'Puerto troncal hacia SW Central', code: 'interface GigabitEthernet 0/1\n switchport mode trunk\nexit\ndo write memory' }
    ]
  },
  {
    device: 'sw_central', title: 'TP-Link Omada SG3428 — Switch Central', prompt: 'SG3428(config)#',
    steps: [
      { heading: 'Crear VLANs', code: 'enable\nconfigure\nvlan 10\n name Alumnos\nexit\nvlan 20\n name Profesor\nexit\nvlan 30\n name Servidores\nexit' },
      { heading: 'Troncales (hacia ER605, Cisco 1 y Cisco 2)', code: 'interface range gigabitEthernet 1/0/1, 1/0/23-24\n switchport mode trunk\n switchport trunk allowed vlan 10,20,30\nexit' },
      { heading: 'Puerto access para Raspberry Pi (P2)', code: 'interface gigabitEthernet 1/0/2\n switchport mode access\n switchport access vlan 30\nexit\nsave' }
    ]
  },
  {
    device: 'gateway', title: 'TP-Link ER605 — Gateway (Web UI)', prompt: 'Web UI · Network > LAN',
    steps: [
      { heading: 'Interfaz VLAN 10 — Alumnos', code: 'IP Address : 192.168.10.1\nSubnet Mask: 255.255.255.0\nDHCP       : Habilitado (10 – 250)' },
      { heading: 'Interfaz VLAN 20 — Profesor', code: 'IP Address : 192.168.20.1\nSubnet Mask: 255.255.255.0\nDHCP       : Habilitado (10 – 250)' },
      { heading: 'Interfaz VLAN 30 — Servidores', code: 'IP Address : 192.168.30.1\nSubnet Mask: 255.255.255.0\nDHCP       : Deshabilitado (IP estática en Pi)' }
    ]
  },
  {
    device: 'pi', title: 'Raspberry Pi 3 — Servidor Web', prompt: 'pi@raspberry:~$',
    steps: [
      { heading: 'IP estática en VLAN 30', code: 'Dirección IP     : 192.168.30.2\nMáscara          : 255.255.255.0\nPuerta de enlace : 192.168.30.1' },
      { heading: 'Instalar Apache2', code: 'sudo apt update\nsudo apt install apache2 -y\n# Editar página:\nsudo nano /var/www/html/index.html' }
    ]
  }
];

var TOUR_STEPS = [
  { title: '1. La laptop del alumno genera un frame', body: 'La laptop conectada al faceplate envía un frame sin etiqueta VLAN. El cable directo T568B lleva la señal hasta la roseta de pared.', edges: ['l_pp_m1'], focus: 'mesa1' },
  { title: '2. El cable fijo llega al Patch Panel',    body: 'El cable sólido recorre la canaleta plástica y entra por la parte trasera del Patch Panel en el puerto 1.', edges: ['l_pp_m1'], focus: 'patch' },
  { title: '3. Patch Cord al switch Cisco 1',          body: 'Un Patch Cord corto conecta el frente del Patch Panel al Cisco 1 en Fa0/1, configurado como access VLAN 10.', edges: ['l_c1_pp'], focus: 'cisco1' },
  { title: '4. Cisco 1 etiqueta el frame (802.1Q)',    body: 'Al salir por Gi0/1 hacia el Switch Central, el frame recibe la etiqueta VLAN 10 (802.1Q). El cable aquí es cruzado T568A/B.', edges: ['l_sw_c1'], focus: 'sw_central' },
  { title: '5. Switch Central reenvía al Gateway',     body: 'El SG3428 recibe el frame etiquetado. Como es tráfico entre VLANs distintas, lo manda al Gateway ER605 por el trunk del P1.', edges: ['l_gw_sw'], focus: 'gateway' },
  { title: '6. ER605 hace el Inter-VLAN Routing',      body: 'El gateway tiene interfaces virtuales en VLAN 10, 20 y 30. Enruta el paquete de VLAN 10 (alumno) hacia VLAN 30 (servidores).', edges: ['l_gw_sw'], focus: 'gateway' },
  { title: '7. El paquete vuelve al SW Central en VLAN 30', body: 'El paquete enrutado regresa al SG3428 etiquetado ahora con VLAN 30 y se reenvía al puerto P2 (access VLAN 30).', edges: ['l_gw_sw', 'l_sw_pi'], focus: 'sw_central' },
  { title: '8. Apache2 responde desde la Raspberry Pi', body: 'El frame llega a la Raspberry Pi (192.168.30.2). Apache2 procesa la petición HTTP y devuelve esta misma página web.', edges: ['l_sw_pi'], focus: 'pi' }
];

// ═══════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════

var SVG_NS = 'http://www.w3.org/2000/svg';
var NODE_R = 36;

function svgEl(tag, attrs, parent) {
  var el = document.createElementNS(SVG_NS, tag);
  if (attrs) Object.keys(attrs).forEach(function(k) {
    if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
  });
  if (parent) parent.appendChild(el);
  return el;
}

function nodeById(id) { return NODES.find(function(n){ return n.id === id; }); }

function pathBetween(a, b) {
  var mx = (a.x + b.x) / 2;
  var my = (a.y + b.y) / 2;
  var dy = b.y - a.y;
  var curv = Math.min(40, Math.abs(dy) * 0.15);
  var cx = mx;
  var cy = my - curv;
  return 'M ' + a.x + ' ' + a.y + ' Q ' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════
//  ICONOS SVG por tipo de nodo
// ═══════════════════════════════════════════════

function iconFor(type) {
  switch(type) {
    case 'cloud': return '<path class="node__icon" d="M-18 4 Q-22-6-12-8 Q-10-16 0-14 Q10-18 16-8 Q24-6 20 6 Z"/>';
    case 'router':
      return '<rect class="node__icon" x="-22" y="-6" width="44" height="14" rx="3"/>' +
             '<circle class="node__icon-fill" cx="-12" cy="1" r="2.2"/>' +
             '<circle class="node__icon-fill" cx="-4"  cy="1" r="2.2"/>' +
             '<circle class="node__icon-fill" cx="4"   cy="1" r="2.2"/>' +
             '<circle class="node__icon-fill" cx="12"  cy="1" r="2.2"/>' +
             '<line class="node__icon" x1="-16" y1="-6" x2="-16" y2="-13"/>' +
             '<line class="node__icon" x1="0"   y1="-6" x2="0"   y2="-15"/>' +
             '<line class="node__icon" x1="16"  y1="-6" x2="16"  y2="-13"/>';
    case 'switch_core':
      return '<rect class="node__icon" x="-22" y="-8" width="44" height="18" rx="2"/>' +
             '<line class="node__icon" x1="-22" y1="-1" x2="22" y2="-1"/>' +
             '<circle class="node__icon-fill" cx="-14" cy="5" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="-7"  cy="5" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="0"   cy="5" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="7"   cy="5" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="14"  cy="5" r="1.8"/>';
    case 'switch_access':
      return '<rect class="node__icon" x="-22" y="-6" width="44" height="13" rx="2"/>' +
             '<circle class="node__icon-fill" cx="-14" cy="3" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="-7"  cy="3" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="0"   cy="3" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="7"   cy="3" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="14"  cy="3" r="1.8"/>';
    case 'server':
      return '<rect class="node__icon" x="-16" y="-14" width="32" height="10" rx="2"/>' +
             '<rect class="node__icon" x="-16" y="-2"  width="32" height="10" rx="2"/>' +
             '<circle class="node__icon-fill" cx="-9" cy="-9" r="1.8"/>' +
             '<circle class="node__icon-fill" cx="-9" cy="3"  r="1.8"/>' +
             '<line class="node__icon" x1="-3" y1="-9" x2="10" y2="-9"/>' +
             '<line class="node__icon" x1="-3" y1="3"  x2="10" y2="3"/>';
    case 'patch':
      return '<rect class="node__icon" x="-22" y="-7" width="44" height="15" rx="2"/>' +
             '<line class="node__icon" x1="-14" y1="-7" x2="-14" y2="8"/>' +
             '<line class="node__icon" x1="-7"  y1="-7" x2="-7"  y2="8"/>' +
             '<line class="node__icon" x1="0"   y1="-7" x2="0"   y2="8"/>' +
             '<line class="node__icon" x1="7"   y1="-7" x2="7"   y2="8"/>' +
             '<line class="node__icon" x1="14"  y1="-7" x2="14"  y2="8"/>';
    case 'laptop':
    default:
      return '<rect class="node__icon" x="-14" y="-12" width="28" height="17" rx="2"/>' +
             '<path class="node__icon" d="M-19 7 L19 7 L16 12 L-16 12 Z"/>';
  }
}

// ═══════════════════════════════════════════════
//  RENDER TOPOLOGÍA
// ═══════════════════════════════════════════════

var selectListeners = [];

function onSelect(cb) { selectListeners.push(cb); }

function emitSelect(payload) {
  selectListeners.forEach(function(cb){ cb(payload); });
}

function renderTopology(svgId, tourMode) {
  var svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = '';

  var gLinks   = svgEl('g', { class: 'links' },   svg);
  var gTags    = svgEl('g', { class: 'link-tags' }, svg);
  var gNodes   = svgEl('g', { class: 'nodes' },   svg);
  svgEl('g', { class: 'packets' }, svg);

  // ── Enlaces ──
  LINKS.forEach(function(link) {
    var a = nodeById(link.a), b = nodeById(link.b);
    if (!a || !b) return;
    var g = svgEl('g', { class: 'link', 'data-id': link.id, 'data-kind': link.kind, 'data-vlans': link.vlans.join(',') }, gLinks);
    var d = pathBetween(a, b);
    svgEl('path', { class: 'link-glow', d: d }, g);
    svgEl('path', { class: 'link-line', d: d, id: 'path-' + link.id }, g);

    if (link.tagged) {
      var mx = (a.x + b.x) / 2, my = a.y + (b.y - a.y) * 0.65 - 10;
      var t = svgEl('text', { class: 'link__tag', x: mx, y: my, 'text-anchor': 'middle' }, gTags);
      t.textContent = '802.1Q · VLAN ' + link.vlans.join(',');
    }

    if (!tourMode) {
      g.addEventListener('click', function(ev) {
        ev.stopPropagation();
        emitSelect({ kind: 'link', id: link.id });
      });
    }
  });

  // ── Nodos ──
  NODES.forEach(function(n) {
    var vlansStr = (n.vlans || []).join(',');
    var vlan1    = (n.vlans && n.vlans.length === 1) ? n.vlans[0] : null;
    var gPos = svgEl('g', { transform: 'translate(' + n.x + ' ' + n.y + ')' }, gNodes);
    var g = svgEl('g', {
      class: 'node',
      'data-id':    n.id,
      'data-type':  n.type,
      'data-vlans': vlansStr,
      'data-vlan':  vlan1
    }, gPos);

    svgEl('rect', { class: 'node__halo', x: -NODE_R, y: -NODE_R+6, width: NODE_R*2, height: NODE_R*2-12, rx: 10 }, g);
    svgEl('rect', { class: 'node__pad',  x: -NODE_R-6, y: -NODE_R, width: (NODE_R+6)*2, height: NODE_R*2, rx: 12 }, g);

    var iconWrap = svgEl('g', { class: 'node__iconwrap' }, g);
    iconWrap.innerHTML = iconFor(n.type);

    var tLabel = svgEl('text', { class: 'node__label', x: 0, y: NODE_R + 14 }, g);
    tLabel.textContent = n.label;
    var tSub = svgEl('text', { class: 'node__sub', x: 0, y: NODE_R + 28 }, g);
    tSub.textContent = n.sub;

    if (!tourMode) {
      g.addEventListener('click', function(ev) {
        ev.stopPropagation();
        emitSelect({ kind: 'node', id: n.id });
      });
    }
  });

  if (!tourMode) {
    svg.addEventListener('click', function() { emitSelect(null); });
  }
}

// ── Filtro VLAN ──
function applyVlanFilter(svgId, vlan) {
  var svg = document.getElementById(svgId);
  if (!svg) return;
  var v = String(vlan);
  if (vlan === 'all') {
    svg.classList.remove('is-filtered');
    svg.querySelectorAll('.node, .link').forEach(function(el){ el.classList.remove('match-vlan'); });
    return;
  }
  svg.classList.add('is-filtered');
  svg.querySelectorAll('.link').forEach(function(el){
    el.classList.toggle('match-vlan', (el.getAttribute('data-vlans')||'').split(',').indexOf(v) > -1);
  });
  svg.querySelectorAll('.node').forEach(function(el){
    el.classList.toggle('match-vlan', (el.getAttribute('data-vlans')||'').split(',').indexOf(v) > -1);
  });
}

// ── Selección visual ──
function markSelected(payload) {
  document.querySelectorAll('#topoSvg .is-selected').forEach(function(e){ e.classList.remove('is-selected'); });
  if (!payload || !payload.kind) return;
  var sel = payload.kind === 'node'
    ? document.querySelector('#topoSvg .node[data-id="'+payload.id+'"]')
    : document.querySelector('#topoSvg .link[data-id="'+payload.id+'"]');
  if (sel) sel.classList.add('is-selected');
}

// ── Detalle lateral ──
function renderDetail(host, payload) {
  if (!payload) {
    host.innerHTML = '<div class="detail__empty"><div class="detail__emptyIcon">◇</div><p>Selecciona un nodo o una conexión para ver sus detalles.</p></div>';
    return;
  }
  host.classList.remove('is-fresh');
  void host.offsetWidth;
  host.classList.add('is-fresh');
  if (payload.kind === 'node')  host.innerHTML = buildNodeDetail(payload.id);
  if (payload.kind === 'link')  host.innerHTML = buildLinkDetail(payload.id);
}

function vlanPills(vlans) {
  return (vlans||[]).map(function(v){
    return '<span class="detail__pill detail__pill--v'+v+'">VLAN '+v+' · '+VLANS[v].name+'</span>';
  }).join('');
}

function buildNodeDetail(id) {
  var n = nodeById(id); if (!n) return '';
  var s = '';
  s += '<div class="detail__section"><h4>Descripción</h4><p style="margin:0;font-size:12.5px">'+escHtml(n.info||'')+'</p></div>';
  if (n.vlans && n.vlans.length) s += '<div class="detail__section"><h4>VLANs</h4><div>'+vlanPills(n.vlans)+'</div></div>';
  if (n.net) s += '<div class="detail__section"><h4>IP (estática)</h4>'+
    '<div class="detail__row"><span>IP</span><span>'+n.net.ip+'</span></div>'+
    '<div class="detail__row"><span>Máscara</span><span>'+n.net.mask+'</span></div>'+
    '<div class="detail__row"><span>Gateway</span><span>'+n.net.gw+'</span></div></div>';
  if (n.interfaces) {
    s += '<div class="detail__section"><h4>Interfaces Inter-VLAN (ER605)</h4>';
    n.interfaces.forEach(function(i){
      s += '<div class="detail__row"><span>VLAN '+i.vlan+' IP</span><span>'+i.ip+'</span></div>';
      s += '<div class="detail__row"><span>DHCP</span><span>'+i.dhcp+'</span></div>';
    });
    s += '</div>';
  }
  if (n.console) {
    s += '<div class="detail__section"><h4>Acceso por consola (serial)</h4>';
    Object.keys(n.console).forEach(function(k){
      s += '<div class="detail__row"><span>'+k+'</span><span>'+escHtml(n.console[k])+'</span></div>';
    });
    s += '</div>';
  }
  if (n.services) s += '<div class="detail__section"><h4>Servicios</h4><ul class="detail__list">'+ n.services.map(function(x){ return '<li>'+escHtml(x)+'</li>'; }).join('') +'</ul></div>';
  if (n.portMap) {
    s += '<div class="detail__section"><h4>Puertos configurados</h4>';
    Object.keys(n.portMap).forEach(function(p){
      var pm = n.portMap[p];
      s += '<div class="detail__row"><span>'+p+'</span><span>'+(pm.mode==='trunk'?'TRUNK '+pm.vlans.join(','):'ACCESS '+pm.vlans[0])+'</span></div>';
      s += '<div class="detail__row"><span></span><span style="opacity:.65">'+escHtml(pm.desc)+'</span></div>';
    });
    s += '</div>';
  }
  if (n.panelMap) {
    s += '<div class="detail__section"><h4>Mapa del Patch Panel</h4>';
    n.panelMap.forEach(function(p){
      s += '<div class="detail__row"><span>Puerto '+p.port+' · VLAN '+p.vlan+'</span><span>'+escHtml(p.from+' → '+p.to)+'</span></div>';
    });
    s += '</div>';
  }
  var typeIcon = {cloud:'☁',router:'⊕',switch_core:'▣',switch_access:'▦',server:'■',patch:'▤',laptop:'▭'}[n.type]||'◆';
  return '<div class="detail__head"><div class="detail__icon">'+typeIcon+'</div><div><h3 class="detail__name">'+escHtml(n.label)+'</h3><div class="detail__sub">'+escHtml(n.sub)+'</div></div></div>'+s;
}

function buildLinkDetail(id) {
  var link = LINKS.find(function(l){ return l.id === id; }); if (!link) return '';
  var a = nodeById(link.a), b = nodeById(link.b);
  var kinds = { directo:'Cable directo (T568B ↔ T568B)', cruzado:'Cable cruzado (T568A ↔ T568B)', fijo:'Cableado fijo en canaleta (T568B)', wan:'Enlace WAN' };
  return '<div class="detail__head"><div class="detail__icon">↔</div><div><h3 class="detail__name">'+escHtml(a.label+' ↔ '+b.label)+'</h3><div class="detail__sub">'+escHtml(link.label||'')+'</div></div></div>'+
    '<div class="detail__section"><h4>Tipo de cable</h4><div class="detail__codeline">'+escHtml(kinds[link.kind]||link.kind)+'</div></div>'+
    (link.vlans.length ? '<div class="detail__section"><h4>VLANs transportadas</h4><div>'+vlanPills(link.vlans)+'</div>'+
      '<div class="detail__row" style="margin-top:8px"><span>Etiquetado 802.1Q</span><span>'+(link.tagged?'Sí (trunk)':'No (access)')+'</span></div></div>' : '');
}

// ═══════════════════════════════════════════════
//  SIMULACIÓN DE PAQUETES
// ═══════════════════════════════════════════════

function buildGraph() {
  var adj = {};
  NODES.forEach(function(n){ adj[n.id] = []; });
  LINKS.forEach(function(l){
    adj[l.a].push({ to: l.b, link: l });
    adj[l.b].push({ to: l.a, link: l });
  });
  return adj;
}

// BFS genérico — solo usado como fallback para casos no contemplados
function findPathBFS(fromId, toId) {
  if (fromId === toId) return [];
  var adj = buildGraph();
  var queue = [[fromId, []]];
  var seen = {}; seen[fromId] = true;
  while (queue.length) {
    var cur = queue.shift();
    var node = cur[0], path = cur[1];
    var neighbors = adj[node] || [];
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (seen[nb.to]) continue;
      var next = path.concat(nb.link);
      if (nb.to === toId) return next;
      seen[nb.to] = true;
      queue.push([nb.to, next]);
    }
  }
  return null;
}

// Ruta física real de la red:
//   Mesa 1/2/3 → Patch Panel → Cisco 1 → TP-Link → Gateway → …
//   Mesa 4     → Patch Panel → Cisco 2 → TP-Link → Gateway → …
//   Inter-VLAN siempre pasa por el Gateway ER605
function findPath(fromId, toId) {
  if (fromId === toId) return [];

  function lk(id) { return LINKS.find(function(l){ return l.id === id; }) || null; }

  // Tablas de correspondencia fijas para esta topología
  var CISCO_OF = { mesa1: 'cisco1', mesa2: 'cisco1', mesa3: 'cisco1', mesa4: 'cisco2' };
  var PP_OF    = { mesa1: 'l_pp_m1', mesa2: 'l_pp_m2', mesa3: 'l_pp_m3', mesa4: 'l_pp_m4' };
  var CPP_OF   = { cisco1: 'l_c1_pp', cisco2: 'l_c2_pp' };
  var CSW_OF   = { cisco1: 'l_sw_c1', cisco2: 'l_sw_c2' };
  var ALL_MESAS = ['mesa1', 'mesa2', 'mesa3', 'mesa4'];

  function isMesa(id) { return ALL_MESAS.indexOf(id) >= 0; }
  function isCisco(id) { return id === 'cisco1' || id === 'cisco2'; }

  // IDs de enlaces desde una mesa hasta sw_central (subida)
  function mesaUpIds(mesaId) {
    var c = CISCO_OF[mesaId];
    return [PP_OF[mesaId], CPP_OF[c], CSW_OF[c]];
  }
  // IDs de enlaces desde sw_central hasta una mesa (bajada)
  function swDownIds(mesaId) {
    var c = CISCO_OF[mesaId];
    return [CSW_OF[c], CPP_OF[c], PP_OF[mesaId]];
  }

  function ids(arr) { return arr.map(lk).filter(Boolean); }

  // ─── mesa ↔ mesa ──────────────────────────────────────────
  if (isMesa(fromId) && isMesa(toId)) {
    var sc = CISCO_OF[fromId], dc = CISCO_OF[toId];
    if (sc === dc) {
      // Misma VLAN, mismo switch:  mesa→patch→cisco→patch→mesa
      var cpp = CPP_OF[sc];
      return ids([PP_OF[fromId], cpp, cpp, PP_OF[toId]]);
    }
    // VLANs distintas: sube por su cisco, cruza gateway, baja por el otro cisco
    return ids(mesaUpIds(fromId).concat(['l_gw_sw', 'l_gw_sw']).concat(swDownIds(toId)));
  }

  // ─── mesa ↔ pi ────────────────────────────────────────────
  if (isMesa(fromId) && toId === 'pi')
    return ids(mesaUpIds(fromId).concat(['l_gw_sw', 'l_gw_sw', 'l_sw_pi']));
  if (fromId === 'pi' && isMesa(toId))
    return ids(['l_sw_pi', 'l_gw_sw', 'l_gw_sw'].concat(swDownIds(toId)));

  // ─── mesa ↔ gateway ───────────────────────────────────────
  if (isMesa(fromId) && toId === 'gateway')
    return ids(mesaUpIds(fromId).concat(['l_gw_sw']));
  if (fromId === 'gateway' && isMesa(toId))
    return ids(['l_gw_sw'].concat(swDownIds(toId)));

  // ─── mesa ↔ sw_central ────────────────────────────────────
  if (isMesa(fromId) && toId === 'sw_central') return ids(mesaUpIds(fromId));
  if (fromId === 'sw_central' && isMesa(toId)) return ids(swDownIds(toId));

  // ─── mesa ↔ internet ──────────────────────────────────────
  if (isMesa(fromId) && toId === 'internet')
    return ids(mesaUpIds(fromId).concat(['l_gw_sw', 'l_wan']));
  if (fromId === 'internet' && isMesa(toId))
    return ids(['l_wan', 'l_gw_sw'].concat(swDownIds(toId)));

  // ─── mesa ↔ cisco ─────────────────────────────────────────
  if (isMesa(fromId) && isCisco(toId)) {
    var sc2 = CISCO_OF[fromId];
    if (sc2 === toId) return ids([PP_OF[fromId], CPP_OF[sc2]]);
    return ids(mesaUpIds(fromId).concat([CSW_OF[toId]]));
  }
  if (isCisco(fromId) && isMesa(toId)) {
    var dc2 = CISCO_OF[toId];
    if (fromId === dc2) return ids([CPP_OF[fromId], PP_OF[toId]]);
    return ids([CSW_OF[fromId], 'l_gw_sw', 'l_gw_sw'].concat(swDownIds(toId)));
  }

  // ─── pi ↔ gateway ─────────────────────────────────────────
  if (fromId === 'pi' && toId === 'gateway') return ids(['l_sw_pi', 'l_gw_sw']);
  if (fromId === 'gateway' && toId === 'pi')  return ids(['l_gw_sw', 'l_sw_pi']);

  // ─── pi ↔ sw_central ──────────────────────────────────────
  if (fromId === 'pi' && toId === 'sw_central') return [lk('l_sw_pi')];
  if (fromId === 'sw_central' && toId === 'pi') return [lk('l_sw_pi')];

  // ─── pi ↔ internet ────────────────────────────────────────
  if (fromId === 'pi' && toId === 'internet') return ids(['l_sw_pi', 'l_gw_sw', 'l_wan']);
  if (fromId === 'internet' && toId === 'pi') return ids(['l_wan', 'l_gw_sw', 'l_sw_pi']);

  // ─── pi ↔ cisco ───────────────────────────────────────────
  if (fromId === 'pi' && isCisco(toId))
    return ids(['l_sw_pi', 'l_gw_sw', 'l_gw_sw', CSW_OF[toId]]);
  if (isCisco(fromId) && toId === 'pi')
    return ids([CSW_OF[fromId], 'l_gw_sw', 'l_gw_sw', 'l_sw_pi']);

  // ─── gateway ↔ sw_central ─────────────────────────────────
  if ((fromId === 'gateway' && toId === 'sw_central') ||
      (fromId === 'sw_central' && toId === 'gateway')) return [lk('l_gw_sw')];

  // ─── gateway ↔ internet ───────────────────────────────────
  if ((fromId === 'gateway' && toId === 'internet') ||
      (fromId === 'internet' && toId === 'gateway')) return [lk('l_wan')];

  // ─── gateway ↔ cisco ──────────────────────────────────────
  if (fromId === 'gateway' && isCisco(toId)) return ids(['l_gw_sw', CSW_OF[toId]]);
  if (isCisco(fromId) && toId === 'gateway') return ids([CSW_OF[fromId], 'l_gw_sw']);

  // ─── sw_central ↔ cisco ───────────────────────────────────
  if (fromId === 'sw_central' && isCisco(toId)) return [lk(CSW_OF[toId])];
  if (isCisco(fromId) && toId === 'sw_central') return [lk(CSW_OF[fromId])];

  // ─── sw_central ↔ internet ────────────────────────────────
  if (fromId === 'sw_central' && toId === 'internet') return ids(['l_gw_sw', 'l_wan']);
  if (fromId === 'internet' && toId === 'sw_central') return ids(['l_wan', 'l_gw_sw']);

  // ─── cisco ↔ cisco ────────────────────────────────────────
  if (isCisco(fromId) && isCisco(toId))
    return ids([CSW_OF[fromId], 'l_gw_sw', 'l_gw_sw', CSW_OF[toId]]);

  // ─── internet ↔ cisco ─────────────────────────────────────
  if (fromId === 'internet' && isCisco(toId)) return ids(['l_wan', 'l_gw_sw', CSW_OF[toId]]);
  if (isCisco(fromId) && toId === 'internet') return ids([CSW_OF[fromId], 'l_gw_sw', 'l_wan']);

  // Fallback BFS para cualquier caso no contemplado
  return findPathBFS(fromId, toId);
}

function simulate(svgId, fromId, toId) {
  var svg = document.getElementById(svgId); if (!svg) return;
  var path = findPath(fromId, toId); if (!path || !path.length) return;

  var currentNode = fromId;
  var ordered = path.map(function(link) {
    var rev = (link.a !== currentNode);
    currentNode = (link.a === currentNode) ? link.b : link.a;
    return { link: link, reverse: rev };
  });

  var overlay = svg.querySelector('.packets');
  if (overlay) overlay.innerHTML = '';
  svg.querySelectorAll('.link.is-active').forEach(function(e){ e.classList.remove('is-active'); });
  svg.querySelectorAll('.node.is-pulsing').forEach(function(e){ e.classList.remove('is-pulsing'); });

  var srcNode = nodeById(fromId);
  var colorClass = srcNode && srcNode.vlans && srcNode.vlans[0] === 20 ? 'packet--v20'
                 : srcNode && srcNode.vlans && srcNode.vlans[0] === 30 ? 'packet--v30'
                 : 'packet--v10';

  var halo = document.createElementNS(SVG_NS, 'circle');
  halo.setAttribute('class', 'packet__halo ' + colorClass);
  halo.setAttribute('r', '16');
  var dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'packet ' + colorClass);
  dot.setAttribute('r', '7');
  if (overlay) { overlay.appendChild(halo); overlay.appendChild(dot); }

  var stepMs = 700, i = 0;
  function runStep() {
    if (i >= ordered.length) {
      var target = svg.querySelector('.node[data-id="'+toId+'"]');
      if (target) { target.classList.add('is-pulsing'); setTimeout(function(){ target.classList.remove('is-pulsing'); }, 2000); }
      setTimeout(function(){
        if (halo.parentNode) halo.parentNode.removeChild(halo);
        if (dot.parentNode) dot.parentNode.removeChild(dot);
        svg.querySelectorAll('.link.is-active').forEach(function(e){ e.classList.remove('is-active'); });
      }, 1200);
      return;
    }
    var item = ordered[i];
    var pathEl = svg.querySelector('#path-'+item.link.id);
    var linkG  = svg.querySelector('.link[data-id="'+item.link.id+'"]');
    if (!pathEl) { i++; runStep(); return; }
    if (linkG) linkG.classList.add('is-active');

    var len = pathEl.getTotalLength(), start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / stepMs);
      var u = item.reverse ? (1 - t) : t;
      var p = pathEl.getPointAtLength(u * len);
      halo.setAttribute('cx', p.x); halo.setAttribute('cy', p.y);
      dot.setAttribute('cx', p.x);  dot.setAttribute('cy', p.y);
      if (t < 1) { requestAnimationFrame(frame); }
      else {
        // Solo quitar is-active si el siguiente paso NO usa el mismo enlace
        var nextItem = ordered[i + 1];
        if (!nextItem || nextItem.link.id !== item.link.id) {
          (function(g){ setTimeout(function(){ if(g) g.classList.remove('is-active'); }, 250); })(linkG);
        }
        i++; runStep();
      }
    }
    requestAnimationFrame(frame);
  }
  runStep();
}

// ═══════════════════════════════════════════════
//  VISTA RACK
// ═══════════════════════════════════════════════

function renderRacks(containerId) {
  var root = document.getElementById(containerId); if (!root) return;
  root.innerHTML = '';
  ['sw_central','cisco1','cisco2'].forEach(function(id){
    var n = nodeById(id); if (!n) return;
    root.appendChild(buildRack(n));
  });
  var pp = nodeById('patch');
  if (pp) root.appendChild(buildPatchPanel(pp));
}

function buildRack(node) {
  var div = document.createElement('div');
  div.className = 'rack';
  var brand = node.id === 'sw_central' ? 'TP-Link Omada SG3428'
             : node.id === 'cisco1'    ? 'Cisco Catalyst — Cisco_Alumnos'
             :                           'Cisco Catalyst — Cisco_Profesor';
  div.innerHTML = '<div class="rack__head"><div><div class="rack__name">'+escHtml(node.label)+'</div><div class="rack__sub">'+escHtml(node.sub)+'</div></div><div class="rack__sub">'+node.ports+' puertos</div></div>'+
    '<div class="rack__bezel"><div class="rack__brand">'+escHtml(brand)+'</div><div class="rack__ports" data-ports></div>'+
    '<div class="rack__leds"><span class="rack__led rack__led--pwr" title="Power"></span><span class="rack__led rack__led--sys" title="System"></span></div></div>'+
    '<div class="rack__legend">'+
    '<span style="color:var(--ok)"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid currentColor;margin-right:4px"></i>En uso</span>'+
    '<span style="color:var(--vlan-trunk)"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid currentColor;margin-right:4px"></i>Trunk</span>'+
    '<span style="color:var(--vlan-10)"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid currentColor;margin-right:4px"></i>Access VLAN 10</span>'+
    '<span style="color:var(--vlan-20)"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid currentColor;margin-right:4px"></i>Access VLAN 20</span>'+
    '<span style="color:var(--vlan-30)"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid currentColor;margin-right:4px"></i>Access VLAN 30</span>'+
    '</div>';

  var portsHost = div.querySelector('[data-ports]');
  // Generar puertos
  if (node.id === 'sw_central') {
    for (var i = 1; i <= 24; i++) portsHost.appendChild(buildPort(i, i, node));
  } else {
    for (var j = 1; j <= 24; j++) portsHost.appendChild(buildPort('0/'+j, j, node));
    ['Gi0/1','Gi0/2'].forEach(function(key,idx){ portsHost.appendChild(buildPort(key,'G'+(idx+1),node)); });
  }
  return div;
}

function buildPatchPanel(node) {
  var panelIndex = {};
  (node.panelMap || []).forEach(function(e){ panelIndex[e.port] = e; });

  var iStyle = 'display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid currentColor;margin-right:4px';
  var div = document.createElement('div');
  div.className = 'rack';
  div.innerHTML =
    '<div class="rack__head">'+
      '<div><div class="rack__name">'+escHtml(node.label)+'</div>'+
      '<div class="rack__sub">'+escHtml(node.sub)+'</div></div>'+
      '<div class="rack__sub">Pasivo · Distribución física · T568B</div>'+
    '</div>'+
    '<div class="rack__bezel">'+
      '<div class="rack__brand">CAT5e<br>48P</div>'+
      '<div class="rack__ports rack__ports--patch" data-ports></div>'+
      '<div></div>'+
    '</div>'+
    '<div class="rack__legend">'+
      '<span style="color:var(--vlan-10)"><i style="'+iStyle+'"></i>VLAN 10 Alumnos</span>'+
      '<span style="color:var(--vlan-20)"><i style="'+iStyle+'"></i>VLAN 20 Profesor</span>'+
      '<span style="color:var(--text-mut)"><i style="'+iStyle+'"></i>Libre</span>'+
    '</div>';

  var portsHost = div.querySelector('[data-ports]');
  for (var i = 1; i <= 48; i++) {
    var entry = panelIndex[i];
    var p = document.createElement('button');
    p.className = 'port';
    if (entry) {
      p.dataset.state = 'used';
      p.dataset.vlan = String(entry.vlan);
      p.innerHTML = '<span class="port__num">'+i+'</span>'+
        '<span class="port__tip"><strong>Puerto '+i+'</strong><br>'+
        escHtml(entry.from)+'<br>→ '+escHtml(entry.to)+'<br>VLAN '+entry.vlan+'</span>';
    } else {
      p.dataset.state = 'free';
      p.innerHTML = '<span class="port__num">'+i+'</span>'+
        '<span class="port__tip"><strong>Puerto '+i+'</strong><br>Sin uso</span>';
    }
    portsHost.appendChild(p);
  }
  return div;
}

function buildPort(key, label, node) {
  var cfg = node.portMap && node.portMap[key] ? node.portMap[key] : null;
  var p = document.createElement('button');
  p.className = 'port';
  p.dataset.state = cfg ? 'used' : 'free';
  if (cfg) { p.dataset.mode = cfg.mode; p.dataset.vlan = cfg.vlans[0]; }
  p.innerHTML = '<span class="port__num">'+escHtml(String(label))+'</span>'+
    '<span class="port__tip"><strong>Puerto '+escHtml(String(key))+'</strong><br>'+
    (cfg ? (cfg.mode==='trunk'?'TRUNK · VLAN '+cfg.vlans.join(','):'ACCESS · VLAN '+cfg.vlans[0])+'<br>'+escHtml(cfg.desc) : 'Sin uso')+'</span>';
  return p;
}

// ═══════════════════════════════════════════════
//  VISTA CABLES
// ═══════════════════════════════════════════════

var cableState = { a: 'T568B', b: 'T568B' };

function initCable() {
  document.querySelectorAll('.cable-controls .segbtn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var end = btn.dataset.end, norm = btn.dataset.norm;
      cableState[end] = norm;
      document.querySelectorAll('.cable-controls .segbtn[data-end="'+end+'"]').forEach(function(b){
        b.classList.toggle('is-active', b === btn);
      });
      renderCableView();
    });
  });
  renderCableView();
  renderCableUsage();
}

function renderCableView() {
  var host = document.getElementById('cableContainer');
  var verdict = document.getElementById('cableVerdict');
  if (!host) return;
  var isCross = cableState.a !== cableState.b;
  verdict.textContent = isCross ? '⚡ Cable CRUZADO' : '✓ Cable DIRECTO';
  verdict.dataset.kind = isCross ? 'cruzado' : 'directo';

  function buildEnd(lbl, norm) {
    var pins = PINOUTS[norm];
    var rjPins = pins.map(function(p){
      var bg = p.stripe ? 'linear-gradient(90deg,'+p.hex+' 50%,'+p.stripe+' 50%)' : p.hex;
      return '<div class="connector__pin" style="background:'+bg+'"></div>';
    }).join('');
    var rows = pins.map(function(p){
      var bg = p.stripe ? 'linear-gradient(90deg,'+p.hex+' 50%,'+p.stripe+' 50%)' : p.hex;
      return '<div class="connector__row"><span class="connector__pinNum">'+p.pin+'</span>'+
             '<span class="connector__wirebar" style="background:'+bg+'" title="'+escHtml(p.color)+'"></span></div>';
    }).join('');
    return '<div class="cable__end"><h4>Punta '+lbl+' <span class="cable__norm">'+norm+'</span></h4>'+
           '<div class="connector"><div class="connector__rj">'+rjPins+'</div><div class="connector__list">'+rows+'</div></div></div>';
  }

  host.innerHTML = '<div class="cable">'+buildEnd('A',cableState.a)+buildEnd('B',cableState.b)+'</div>';
}

function renderCableUsage() {
  var ul = document.getElementById('cableUsage'); if (!ul) return;
  ul.innerHTML = LINKS.filter(function(l){ return l.kind !== 'wan'; }).map(function(l){
    var a = nodeById(l.a), b = nodeById(l.b);
    var cls = l.kind === 'cruzado' ? 'cross' : '';
    var txt = l.kind === 'cruzado' ? 'Cruzado T568A/B' : (l.kind === 'fijo' ? 'Fijo T568B' : 'Directo T568B');
    return '<li class="'+cls+'"><strong>'+escHtml(txt)+'</strong> · '+escHtml(a.label)+' ↔ '+escHtml(b.label)+
           '<br><span style="color:var(--text-mut)">'+escHtml(l.label||'')+'</span></li>';
  }).join('');
}

// ═══════════════════════════════════════════════
//  VISTA CLI
// ═══════════════════════════════════════════════

function renderCLI(containerId) {
  var root = document.getElementById(containerId); if (!root) return;
  root.innerHTML = CLI_BLOCKS.map(function(block){
    var steps = block.steps.map(function(s){
      return '<section class="terminal__section"><div class="terminal__heading">▸ '+escHtml(s.heading)+'</div>'+
             '<pre>'+syntaxHighlight(s.code)+'</pre></section>';
    }).join('');
    return '<article class="terminal"><header class="terminal__head">'+
           '<span class="terminal__dots"><span class="terminal__dot"></span><span class="terminal__dot"></span><span class="terminal__dot"></span></span>'+
           '<span class="terminal__title">'+escHtml(block.title)+' · <span style="color:var(--acc)">'+escHtml(block.prompt)+'</span></span></header>'+
           '<div class="terminal__body">'+steps+'</div></article>';
  }).join('');
}

function syntaxHighlight(code) {
  return code.split('\n').map(function(line){
    var out = escHtml(line);
    out = out.replace(/^(\s*[!#]\s.*)$/, '<span class="com">$1</span>');
    out = out.replace(/\b(\d{1,3}(?:\.\d{1,3}){0,3})\b/g, '<span class="num">$1</span>');
    out = out.replace(/^(\s*)(configure|interface|switchport|vlan|name|enable|line|password|login|exit|hostname|copy|save|do|sudo|apt)\b/,
                      '$1<span class="cmd">$2</span>');
    return out;
  }).join('\n');
}

// ═══════════════════════════════════════════════
//  VISTA TOUR
// ═══════════════════════════════════════════════

var tourIndex = 0;
var tourInited = false;

function initTour() {
  if (!tourInited) {
    renderTopology('tourSvg', true);
    tourInited = true;
  }
  document.getElementById('tourTotal').textContent = TOUR_STEPS.length;
  document.getElementById('tourPrev').addEventListener('click', function(){ goTour(tourIndex - 1); });
  document.getElementById('tourNext').addEventListener('click', function(){ goTour(tourIndex + 1); });
  document.getElementById('tourReplay').addEventListener('click', function(){ goTour(0); });
  goTour(0);
}

function goTour(idx) {
  if (idx < 0) idx = 0;
  if (idx >= TOUR_STEPS.length) idx = TOUR_STEPS.length - 1;
  tourIndex = idx;
  var step = TOUR_STEPS[idx];
  document.getElementById('tourPos').textContent   = idx + 1;
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourBody').textContent  = step.body;
  // Marcar enlaces activos
  var svg = document.getElementById('tourSvg'); if (!svg) return;
  svg.querySelectorAll('.link.tour-active').forEach(function(e){ e.classList.remove('tour-active'); });
  svg.querySelectorAll('.node.is-pulsing').forEach(function(e){ e.classList.remove('is-pulsing'); });
  (step.edges||[]).forEach(function(id){
    var g = svg.querySelector('.link[data-id="'+id+'"]'); if (g) g.classList.add('tour-active');
  });
  if (step.focus) {
    var n = svg.querySelector('.node[data-id="'+step.focus+'"]'); if (n) n.classList.add('is-pulsing');
  }
  document.getElementById('tourPrev').disabled = (idx === 0);
  document.getElementById('tourNext').disabled = (idx === TOUR_STEPS.length - 1);
}

// ═══════════════════════════════════════════════
//  BOOTSTRAP PRINCIPAL
// ═══════════════════════════════════════════════

var appState = { view: 'topo', vlan: 'all', initedViews: { topo: true } };

document.addEventListener('DOMContentLoaded', function() {

  // 1) Render de la topología principal
  renderTopology('topoSvg', false);

  // 2) Panel de detalle
  var detailHost = document.getElementById('detailPanel');
  var detailInner = document.createElement('div');
  detailInner.className = 'detail';
  detailHost.appendChild(detailInner);
  renderDetail(detailInner, null);

  onSelect(function(payload) {
    markSelected(payload);
    renderDetail(detailInner, payload);
  });

  // 3) Stats
  document.getElementById('statDev').textContent = NODES.length;
  document.getElementById('statLnk').textContent = LINKS.length;

  // 4) Filtro VLAN
  document.querySelectorAll('.vlanchip').forEach(function(chip){
    chip.addEventListener('click', function(){
      document.querySelectorAll('.vlanchip').forEach(function(c){ c.classList.toggle('is-active', c === chip); });
      appState.vlan = chip.dataset.vlan;
      applyVlanFilter('topoSvg', chip.dataset.vlan);
    });
  });

  // 5) Simulación
  (function(){
    var fromSel = document.getElementById('simFrom');
    var toSel   = document.getElementById('simTo');
    var opts = NODES.filter(function(n){ return ['laptop','server','internet'].indexOf(n.type) > -1 || n.id === 'gateway'; })
      .map(function(n){ return '<option value="'+n.id+'">'+escHtml(n.label)+' · '+escHtml(n.sub)+'</option>'; }).join('');
    fromSel.innerHTML = opts;
    toSel.innerHTML   = opts;
    fromSel.value = 'mesa1';
    toSel.value   = 'pi';
    document.getElementById('simRun').addEventListener('click', function(){
      var from = fromSel.value, to = toSel.value;
      if (from === to) { flashHint('El origen y destino deben ser distintos.'); return; }
      var path = findPath(from, to);
      if (!path) { flashHint('No existe ruta entre esos nodos.'); return; }
      simulate('topoSvg', from, to);
    });
  })();

  // 6) Navegación de vistas
  document.querySelectorAll('.viewnav__btn').forEach(function(btn){
    btn.addEventListener('click', function(){ switchView(btn.dataset.view); });
  });

  // 7) Atajos de teclado
  document.addEventListener('keydown', function(e){
    if (e.target.matches('input,select,textarea')) return;
    var map = { t:'topo', r:'rack', c:'cable', l:'cli', g:'tour' };
    var v = map[e.key.toLowerCase()];
    if (v) switchView(v);
  });
});

function switchView(view) {
  if (appState.view === view) return;
  appState.view = view;
  document.querySelectorAll('.viewnav__btn').forEach(function(b){ b.classList.toggle('is-active', b.dataset.view === view); });
  document.querySelectorAll('.view').forEach(function(v){ v.classList.toggle('is-active', v.dataset.view === view); });
  if (!appState.initedViews[view]) {
    appState.initedViews[view] = true;
    if (view === 'rack')  renderRacks('rackContainer');
    if (view === 'cable') initCable();
    if (view === 'cli')   renderCLI('cliContainer');
    if (view === 'tour')  initTour();
  }
}

function flashHint(msg) {
  var h = document.querySelector('.canvas-hint'); if (!h) return;
  var prev = h.textContent;
  h.textContent = msg; h.style.color = 'var(--warn)';
  setTimeout(function(){ h.textContent = prev; h.style.color = ''; }, 2400);
}

})(); // end IIFE
