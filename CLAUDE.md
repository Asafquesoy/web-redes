# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Hardware objetivo

- **Dispositivo**: Raspberry Pi 3 (ARM Cortex-A53 de 32 bits)
- **RAM**: 1 GB
- **SO**: Raspberry Pi OS Lite 32 bits
- **Servidor web**: Apache2 (solo archivos estáticos, sin proceso de backend)
- **IP del servidor**: `192.168.30.2` (VLAN 30 — Servidores)

Esta restricción de hardware es la decisión de diseño más importante de todo el proyecto. Cada cambio debe evaluarse contra ella.

---

## Qué es este proyecto

**NetLab Explorer** — aplicación web interactiva para visualizar y explorar la red de un laboratorio escolar. Presenta la topología, simulación de tráfico, vista de racks, inspector de cables T568A/B, comandos CLI y un tour guiado.

La red real tiene: Gateway TP-Link ER605 → Switch Central TP-Link Omada SG3428 → Cisco 1 (VLAN 10 Alumnos) / Cisco 2 (VLAN 20 Profesor) → Patch Panel → Mesas. La Raspberry Pi sirve la app desde VLAN 30 con IP estática.

---

## Stack y restricciones técnicas críticas

**No hay backend, build tools ni dependencias externas.** El sitio es 100% estático.

- **Un solo archivo JS**: `js/app.js` (~43 KB, IIFE, sin módulos ES).
  Todos los demás archivos en `js/` (`data.js`, `topology.js`, etc.) son **obsoletos** — son los módulos originales que se migraron a `app.js` cuando se descubrió que `type="module"` no funciona con `file://`. Modificar la lógica **siempre en `app.js`**, no en los archivos individuales.

- **Sin `filter: blur()`** ni `backdrop-filter`. La GPU VideoCore IV de la Pi 3 no lo aguanta. Los efectos de "glow/halo" se hacen exclusivamente con `radial-gradient` y `box-shadow` ligero.

- **Animaciones solo en `transform` y `opacity`** (compuestas por GPU). Nunca animar `width`, `height`, `top`, `left`, `color` directamente.

- **Sin webfonts externas**. La tipografía usa `ui-sans-serif, system-ui` y `ui-monospace`.

- **Sin `<script type="module">`**. El `index.html` carga `js/app.js` con `<script src="js/app.js" defer>` y punto.

---

## Arquitectura de `js/app.js`

El archivo está organizado en secciones con comentarios `// ═══`:

| Sección | Responsabilidad |
|---|---|
| `DATOS DE LA RED` | `NODES`, `LINKS`, `VLANS`, `PINOUTS`, `CLI_BLOCKS`, `TOUR_STEPS` — toda la red como datos declarativos |
| `UTILIDADES` | `svgEl()`, `nodeById()`, `pathBetween()`, `escHtml()` |
| `ICONOS SVG` | `iconFor(type)` devuelve strings SVG por tipo de nodo |
| `RENDER TOPOLOGÍA` | `renderTopology(svgId, tourMode)` — dibuja nodos y enlaces en un `<svg>` |
| `SIMULACIÓN DE PAQUETES` | `findPath(from, to)` (BFS) + `simulate(svgId, from, to)` (animación con `getPointAtLength`) |
| `VISTA RACK` | `renderRacks(containerId)` — switches con puertos coloreados |
| `VISTA CABLES` | `initCable()` + `renderCableView()` — inspector T568A/B |
| `VISTA CLI` | `renderCLI(containerId)` — terminales con resaltado de sintaxis |
| `VISTA TOUR` | `initTour()` + `goTour(idx)` — tour guiado de 8 pasos |
| `BOOTSTRAP` | `DOMContentLoaded`: inicializa topo, detalle, filtros, simulación, navegación |

**Patrón de vistas**: hay 5 vistas (`topo`, `rack`, `cable`, `cli`, `tour`). Las vistas 2–5 se inicializan perezosamente la primera vez que se activan (`appState.initedViews`). La vista `topo` es la única que se inicia en el arranque.

**Bus de eventos de selección**: `onSelect(callback)` registra listeners. `emitSelect(payload)` dispara `{ kind: 'node'|'link', id }` o `null`. El callback actualiza la selección visual y el panel lateral.

---

## Cómo agregar o modificar la red

Todos los datos están en la sección `DATOS DE LA RED` de `js/app.js`:

- **Agregar un nodo**: añadir un objeto a `NODES` con `id`, `type`, `label`, `sub`, `x`, `y`, `vlans`.
- **Agregar un enlace**: añadir a `LINKS` con `a`, `b`, `kind` (`directo`|`cruzado`|`fijo`|`wan`), `vlans`, `tagged`.
- **Coordenadas SVG**: el viewBox es `0 0 1400 920`. Los nodos actuales ocupan aproximadamente `y: 70–800`.
- **Tipos de nodo válidos**: `cloud`, `router`, `switch_core`, `switch_access`, `server`, `patch`, `laptop`.

---

## CSS: dónde vive cada cosa

- `base.css` — design tokens (colores, fuentes, radios). Los colores de VLAN son `--vlan-10` (cian), `--vlan-20` (magenta), `--vlan-30` (verde).
- `topology.css` — todo lo relativo al SVG: `.node`, `.link`, `.packet`, `.legend`, filtros VLAN.
- `components.css` — panel lateral de detalle, chips VLAN, rack, cable, terminal CLI, tour.
- `layout.css` — topbar, grid de 3 columnas de la vista topo, statusbar.
- `animations.css` — keyframes. Agregar nuevas animaciones aquí y asegurarse de que no usen propiedades caras.

---

## Despliegue en la Raspberry Pi

```bash
# Desde la máquina de desarrollo:
scp -r index.html css js pi@192.168.30.2:/tmp/netlab/
ssh pi@192.168.30.2 "sudo rm -rf /var/www/html/* && sudo mv /tmp/netlab/* /var/www/html/ && sudo chown -R www-data:www-data /var/www/html"

# Verificar desde cualquier laptop de alumno (VLAN 10) o profesor (VLAN 20):
# http://192.168.30.2/
```

Para activar compresión gzip y caché en Apache2:
```bash
sudo a2enmod deflate expires headers && sudo systemctl reload apache2
```

---

## Probar localmente (sin la Pi)

Los módulos ES no funcionan con `file://`, pero `app.js` sí. Abrir `index.html` directamente con doble clic funciona. Si se quiere un servidor local rápido:

```bash
# Python (si está disponible)
python -m http.server 8080

# Node (si está disponible)
npx serve .
```

No hay tests, linter ni build step configurados. El único "check" disponible es:

```bash
node --check js/app.js
```

---

## Reglas de rendimiento (no negociables para la Pi 3)

1. No agregar librerías externas (ni siquiera pequeñas como Alpine.js o Preact).
2. No usar `filter: blur()`, `backdrop-filter`, ni `filter: drop-shadow()` masivo.
3. No animar propiedades que fuercen layout (`width`, `height`, `margin`, `top`).
4. Las nuevas animaciones deben ser opt-in (activadas solo cuando el usuario interactúa) y deben tener clase en `body` que las habilite, siguiendo el patrón de `body.is-running`.
5. Mantener el total de JS bajo 60 KB sin minificar (actualmente ~44 KB).
