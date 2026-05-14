// Modelo de la red basado en Conexiones_Fisicas_Redes.pdf y Switches_Redes.pdf
// Todo el estado es declarativo: nodos, enlaces, VLANs, configuraciones.

export const VLANS = {
  10: { id: 10, name: 'Alumnos',   subnet: '192.168.10.0/24', gw: '192.168.10.1', dhcp: '192.168.10.10 – 192.168.10.250', color: 'var(--vlan-10)' },
  20: { id: 20, name: 'Profesor',  subnet: '192.168.20.0/24', gw: '192.168.20.1', dhcp: '192.168.20.10 – 192.168.20.250', color: 'var(--vlan-20)' },
  30: { id: 30, name: 'Servidores',subnet: '192.168.30.0/24', gw: '192.168.30.1', dhcp: 'Deshabilitado (IP estática)',     color: 'var(--vlan-30)' }
};

// Coordenadas pensadas para un viewBox 1400x920.
// La topología es estrella jerárquica: Internet → Gateway → Switch Central → (Pi | Cisco1 | Cisco2) → Patch Panel → Mesas.
export const NODES = [
  {
    id: 'internet', type: 'cloud', label: 'Internet', sub: 'WAN', x: 700, y: 70,
    info: 'Acceso externo a la red. Conectado al puerto WAN del Gateway TP-Link ER605.'
  },
  {
    id: 'gateway', type: 'router', label: 'TP-Link ER605', sub: 'Gateway · Inter-VLAN Routing', x: 700, y: 200,
    vlans: [10, 20, 30],
    info: 'Gateway de borde. Crea interfaces virtuales para VLAN 10/20/30 y enruta entre ellas.',
    interfaces: [
      { vlan: 10, ip: '192.168.10.1', mask: '255.255.255.0', dhcp: '10–250' },
      { vlan: 20, ip: '192.168.20.1', mask: '255.255.255.0', dhcp: '10–250' },
      { vlan: 30, ip: '192.168.30.1', mask: '255.255.255.0', dhcp: 'OFF (estático)' }
    ],
    access: { type: 'web', url: 'http://192.168.0.1 ó 192.168.1.1', user: 'admin', note: 'En fábrica pide crear admin nuevo.' }
  },
  {
    id: 'sw_central', type: 'switch_core', label: 'TP-Link Omada SG3428', sub: 'Switch Central · L2', x: 700, y: 340,
    vlans: [10, 20, 30],
    info: 'Núcleo de la red. Distribuye tráfico etiquetado entre el Gateway, los Cisco de acceso y la Raspberry Pi.',
    console: { baud: 38400, user: 'admin', pass: 'admin (cambiar)' },
    ports: 24,
    portMap: {
      1:  { mode: 'trunk',  vlans: [10,20,30], peer: 'gateway',  desc: 'Uplink al Gateway ER605' },
      2:  { mode: 'access', vlans: [30],       peer: 'pi',       desc: 'Raspberry Pi (Servidor Web)' },
      23: { mode: 'trunk',  vlans: [10,20,30], peer: 'cisco1',   desc: 'Trunk hacia Cisco 1 (Alumnos)' },
      24: { mode: 'trunk',  vlans: [10,20,30], peer: 'cisco2',   desc: 'Trunk hacia Cisco 2 (Profesor)' }
    }
  },
  {
    id: 'pi', type: 'server', label: 'Raspberry Pi 3', sub: 'Servidor Web Apache2', x: 220, y: 480,
    vlans: [30],
    info: 'Servidor web local. Aloja esta misma aplicación. IP estática en la VLAN de servidores.',
    net: { ip: '192.168.30.2', mask: '255.255.255.0', gw: '192.168.30.1' },
    services: ['Apache2 (http/80)', 'SSH (opcional)', 'Samba (opcional, share /srv)']
  },
  {
    id: 'cisco1', type: 'switch_access', label: 'Cisco Catalyst 1', sub: 'Cisco_Alumnos · VLAN 10', x: 520, y: 480,
    vlans: [10, 20, 30],
    info: 'Switch de acceso para el área de Alumnos. Sus puertos Fa0/1–5 quedan asignados a VLAN 10.',
    console: { baud: 9600, secret: 'clase123', linePass: 'cisco123' },
    ports: 24,
    portMap: {
      '0/1': { mode: 'access', vlans: [10], peer: 'patch', desc: 'Patch Panel P1 (Mesa Alumnos)' },
      '0/2': { mode: 'access', vlans: [10], peer: 'patch', desc: 'Patch Panel P2 (Mesa Alumnos)' },
      '0/3': { mode: 'access', vlans: [10], peer: 'patch', desc: 'Patch Panel P3 (Mesa Alumnos)' },
      '0/4': { mode: 'access', vlans: [10], peer: 'patch', desc: 'Patch Panel P4 (Mesa Alumnos)' },
      '0/5': { mode: 'access', vlans: [10], peer: 'patch', desc: 'Patch Panel P5 (Mesa Alumnos)' },
      'Gi0/1': { mode: 'trunk', vlans: [10,20,30], peer: 'sw_central', desc: 'Uplink Trunk al SW Central P23' }
    }
  },
  {
    id: 'cisco2', type: 'switch_access', label: 'Cisco Catalyst 2', sub: 'Cisco_Profesor · VLAN 20', x: 880, y: 480,
    vlans: [10, 20, 30],
    info: 'Switch de acceso para el área del Profesor. Aísla la VLAN 20 por seguridad.',
    console: { baud: 9600, secret: 'clase123', linePass: 'cisco123' },
    ports: 24,
    portMap: {
      '0/1': { mode: 'access', vlans: [20], peer: 'patch', desc: 'Patch Panel P6 (Mesa Profesor)' },
      'Gi0/1': { mode: 'trunk', vlans: [10,20,30], peer: 'sw_central', desc: 'Uplink Trunk al SW Central P24' }
    }
  },
  {
    id: 'patch', type: 'patch', label: 'Patch Panel', sub: '6 puertos en uso · T568B', x: 700, y: 620,
    vlans: [10, 20],
    info: 'Distribución física: el frente recibe los Patch Cords desde los Cisco; el reverso baja por canaletas a las rosetas de cada mesa.',
    panelMap: [
      { port: 1, from: 'Cisco1 Fa0/1', to: 'Mesa 1 · Alumno', vlan: 10 },
      { port: 2, from: 'Cisco1 Fa0/2', to: 'Mesa 1 · Alumno', vlan: 10 },
      { port: 3, from: 'Cisco1 Fa0/3', to: 'Mesa 2 · Alumno', vlan: 10 },
      { port: 4, from: 'Cisco1 Fa0/4', to: 'Mesa 2 · Alumno', vlan: 10 },
      { port: 5, from: 'Cisco1 Fa0/5', to: 'Mesa 3 · Alumno', vlan: 10 },
      { port: 6, from: 'Cisco2 Fa0/1', to: 'Mesa 4 · Profesor', vlan: 20 }
    ]
  },
  { id: 'mesa1', type: 'laptop', label: 'Mesa 1', sub: 'Laptop Alumno · VLAN 10', x: 300, y: 800, vlans:[10],
    info: 'Equipo en VLAN 10. Recibe IP DHCP en 192.168.10.0/24.' },
  { id: 'mesa2', type: 'laptop', label: 'Mesa 2', sub: 'Laptop Alumno · VLAN 10', x: 500, y: 800, vlans:[10],
    info: 'Equipo en VLAN 10. Recibe IP DHCP en 192.168.10.0/24.' },
  { id: 'mesa3', type: 'laptop', label: 'Mesa 3', sub: 'Laptop Alumno · VLAN 10', x: 700, y: 800, vlans:[10],
    info: 'Equipo en VLAN 10. Recibe IP DHCP en 192.168.10.0/24.' },
  { id: 'mesa4', type: 'laptop', label: 'Mesa 4', sub: 'Laptop Profesor · VLAN 20', x: 1100, y: 800, vlans:[20],
    info: 'Equipo en VLAN 20. Recibe IP DHCP en 192.168.20.0/24.' }
];

// Enlaces físicos. "kind" = directo (T568B/B) o cruzado (T568A/B).
// "tagged" indica si el frame viaja con etiqueta 802.1Q por ese tramo.
export const LINKS = [
  { id: 'l_wan',    a: 'internet',   b: 'gateway',    kind: 'wan',     vlans: [],         tagged: false, label: 'WAN' },
  { id: 'l_gw_sw',  a: 'gateway',    b: 'sw_central', kind: 'directo', vlans: [10,20,30], tagged: true,  label: 'ER605 LAN1 ↔ SG3428 P1 · Trunk' },
  { id: 'l_sw_pi',  a: 'sw_central', b: 'pi',         kind: 'directo', vlans: [30],       tagged: false, label: 'SG3428 P2 ↔ Pi · Access VLAN 30' },
  { id: 'l_sw_c1',  a: 'sw_central', b: 'cisco1',     kind: 'cruzado', vlans: [10,20,30], tagged: true,  label: 'SG3428 P23 ↔ Cisco1 Gi0/1 · Trunk' },
  { id: 'l_sw_c2',  a: 'sw_central', b: 'cisco2',     kind: 'cruzado', vlans: [10,20,30], tagged: true,  label: 'SG3428 P24 ↔ Cisco2 Gi0/1 · Trunk' },
  { id: 'l_c1_pp',  a: 'cisco1',     b: 'patch',      kind: 'directo', vlans: [10],       tagged: false, label: 'Cisco1 Fa0/1-5 → Patch P1-5 · Access VLAN 10' },
  { id: 'l_c2_pp',  a: 'cisco2',     b: 'patch',      kind: 'directo', vlans: [20],       tagged: false, label: 'Cisco2 Fa0/1 → Patch P6 · Access VLAN 20' },
  { id: 'l_pp_m1',  a: 'patch',      b: 'mesa1',      kind: 'fijo',    vlans: [10],       tagged: false, label: 'Patch P1 → Faceplate Mesa 1 · Cableado fijo' },
  { id: 'l_pp_m2',  a: 'patch',      b: 'mesa2',      kind: 'fijo',    vlans: [10],       tagged: false, label: 'Patch P3 → Faceplate Mesa 2 · Cableado fijo' },
  { id: 'l_pp_m3',  a: 'patch',      b: 'mesa3',      kind: 'fijo',    vlans: [10],       tagged: false, label: 'Patch P5 → Faceplate Mesa 3 · Cableado fijo' },
  { id: 'l_pp_m4',  a: 'patch',      b: 'mesa4',      kind: 'fijo',    vlans: [20],       tagged: false, label: 'Patch P6 → Faceplate Mesa 4 · Cableado fijo' }
];

// Norma de cables: orden de pares de hilos para mostrar en el inspector.
export const PINOUTS = {
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

// Comandos extraídos textualmente de Switches_Redes.pdf, organizados por dispositivo.
export const CLI_BLOCKS = [
  {
    device: 'cisco1',
    title: 'Cisco 1 (Área de Alumnos)',
    prompt: 'Cisco_Alumnos#',
    steps: [
      { heading: 'Configuración inicial', code:
`! Entrar a modo configuración
configure terminal
! Hostname
hostname Cisco_Alumnos
! Contraseña modo privilegiado
enable secret clase123
! Contraseña de la consola
line console 0
 password cisco123
 login
exit
! Guardar
do write memory` },
      { heading: 'Crear VLANs', code:
`vlan 10
 name Alumnos
exit
vlan 20
 name Profesor
exit
vlan 30
 name Servidores
exit` },
      { heading: 'Asignar puertos de Alumnos (Fa0/1–5)', code:
`interface range FastEthernet 0/1 - 5
 switchport mode access
 switchport access vlan 10
exit` },
      { heading: 'Puerto troncal hacia SW Central', code:
`interface GigabitEthernet 0/1
 switchport mode trunk
exit
do write memory` }
    ]
  },
  {
    device: 'cisco2',
    title: 'Cisco 2 (Área del Profesor)',
    prompt: 'Cisco_Profesor#',
    steps: [
      { heading: 'Crear VLANs', code:
`vlan 10
 name Alumnos
exit
vlan 20
 name Profesor
exit
vlan 30
 name Servidores
exit` },
      { heading: 'Asignar puerto del profesor (Fa0/1)', code:
`interface FastEthernet 0/1
 switchport mode access
 switchport access vlan 20
exit` },
      { heading: 'Puerto troncal hacia SW Central', code:
`interface GigabitEthernet 0/1
 switchport mode trunk
exit
do write memory` }
    ]
  },
  {
    device: 'sw_central',
    title: 'TP-Link Omada SG3428 (Switch Central)',
    prompt: 'SG3428(config)#',
    steps: [
      { heading: 'Crear VLANs', code:
`enable
configure
vlan 10
 name Alumnos
exit
vlan 20
 name Profesor
exit
vlan 30
 name Servidores
exit` },
      { heading: 'Troncales hacia ER605 y los Cisco', code:
`interface range gigabitEthernet 1/0/1, 1/0/23-24
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
exit` },
      { heading: 'Puerto access para Raspberry Pi (P2)', code:
`interface gigabitEthernet 1/0/2
 switchport mode access
 switchport access vlan 30
exit
save` }
    ]
  },
  {
    device: 'gateway',
    title: 'TP-Link ER605 (Gateway, vía Web 192.168.0.1)',
    prompt: 'Web UI · Network > LAN',
    steps: [
      { heading: 'Interfaz VLAN 10 — Alumnos', code:
`IP Address : 192.168.10.1
Subnet Mask: 255.255.255.0
DHCP       : Habilitado (192.168.10.10 – 192.168.10.250)` },
      { heading: 'Interfaz VLAN 20 — Profesor', code:
`IP Address : 192.168.20.1
Subnet Mask: 255.255.255.0
DHCP       : Habilitado (192.168.20.10 – 192.168.20.250)` },
      { heading: 'Interfaz VLAN 30 — Servidores', code:
`IP Address : 192.168.30.1
Subnet Mask: 255.255.255.0
DHCP       : Deshabilitado  (Pi usa IP estática)` }
    ]
  },
  {
    device: 'pi',
    title: 'Raspberry Pi 3 (Servidor Web)',
    prompt: 'pi@raspberry:~$',
    steps: [
      { heading: 'IP estática (VLAN 30)', code:
`Dirección IP     : 192.168.30.2
Máscara          : 255.255.255.0
Puerta de enlace : 192.168.30.1` },
      { heading: 'Instalación de Apache2', code:
`sudo apt update
sudo apt install apache2 -y
# Probar:  curl http://localhost
# Editar:  sudo nano /var/www/html/index.html` }
    ]
  }
];

// Pasos del Tour (Story Mode): cada paso pinta un tramo del camino "Alumno consulta la Pi".
export const TOUR_STEPS = [
  {
    title: '1. Salida de la Laptop del Alumno',
    body: 'La laptop conectada al faceplate genera un frame sin etiqueta VLAN. El cable directo T568B lleva la señal hasta la roseta de pared.',
    edges: ['l_pp_m1'], focus: 'mesa1'
  },
  {
    title: '2. Por la canaleta hasta el Patch Panel',
    body: 'El cable fijo recorre la canaleta y entra por la parte trasera del Patch Panel (puerto 1), todavía sin etiqueta.',
    edges: ['l_pp_m1'], focus: 'patch'
  },
  {
    title: '3. Patch Cord al Cisco de Alumnos',
    body: 'Un Patch Cord directo del frente del panel sube al switch Cisco 1 en Fa0/1, configurado como access VLAN 10.',
    edges: ['l_c1_pp'], focus: 'cisco1'
  },
  {
    title: '4. Cisco 1 etiqueta y manda por el Trunk',
    body: 'Al salir por Gi0/1 hacia el SW Central, el frame se etiqueta como VLAN 10 (802.1Q). El cable usado aquí es cruzado A/B.',
    edges: ['l_sw_c1'], focus: 'sw_central'
  },
  {
    title: '5. El Switch Central reenvía hacia el Gateway',
    body: 'El SG3428 recibe el frame etiquetado y, al ser tráfico inter-VLAN, lo manda por el trunk al Gateway ER605 (P1).',
    edges: ['l_gw_sw'], focus: 'gateway'
  },
  {
    title: '6. ER605 hace Inter-VLAN Routing',
    body: 'El gateway tiene interfaces virtuales en cada VLAN. Enruta el paquete de la VLAN 10 hacia la VLAN 30 (servidores).',
    edges: ['l_gw_sw'], focus: 'gateway'
  },
  {
    title: '7. De vuelta al Switch Central, ya en VLAN 30',
    body: 'El paquete enrutado vuelve al SG3428 y se reenvía al puerto P2 (access VLAN 30), donde está la Raspberry Pi.',
    edges: ['l_gw_sw', 'l_sw_pi'], focus: 'sw_central'
  },
  {
    title: '8. Llega a la Raspberry Pi',
    body: 'Apache2 recibe la petición HTTP en 192.168.30.2 y responde con esta misma página.',
    edges: ['l_sw_pi'], focus: 'pi'
  }
];

// Helpers
export const nodeById = id => NODES.find(n => n.id === id);
export const linkById = id => LINKS.find(l => l.id === id);
