# NetLab Explorer

Aplicación web interactiva para visualizar y entender la red del laboratorio
(Gateway TP-Link ER605, Switch Central TP-Link Omada SG3428, Cisco 1 y 2, Patch
Panel, Raspberry Pi 3 servidor web Apache2, y laptops por VLAN 10 / 20 / 30).

Pensada para correr **servida desde la propia Raspberry Pi 3** con Raspberry
Pi OS Lite 32 bits + Apache2, ocupando RAM mínima (es 100% estática).

---

## Stack

- **Frontend**: HTML5 + CSS3 + JavaScript ES Modules (vanilla). Sin frameworks.
- **Grafo de red**: SVG dibujado a mano (~12 nodos). Pathfinding propio (BFS).
- **Animaciones**: CSS transforms/opacity + `getPointAtLength` para el paquete.
- **Backend**: ninguno. Apache2 sirve archivos estáticos.
- **Fuentes**: stacks del sistema (cero descargas).
- **Tamaño total**: ~50 KB de código (sin gzip).

---

## Estructura

```
web-redes/
├── index.html
├── README.md
├── css/
│   ├── base.css           reset + design tokens + grid blueprint
│   ├── layout.css         topbar, vistas, statusbar
│   ├── topology.css       SVG, nodos, enlaces, filtros, paquetes
│   ├── components.css     paneles, chips, rack, cable, terminal, tour
│   └── animations.css     keyframes ligeros
└── js/
    ├── data.js            modelo de red (nodos, enlaces, VLANs, CLI, tour)
    ├── topology.js        render SVG + interacciones + detalle
    ├── simulation.js      BFS + animación de paquete
    ├── rack.js            vista física de los switches
    ├── cable.js           inspector T568A / T568B
    ├── views.js           CLI (terminal) y Tour guiado
    └── main.js            bootstrap y conexión de vistas
```

---

## Vistas

1. **Topología** — Diagrama jerárquico SVG. Click en cualquier nodo o enlace para
   ver detalle. Filtro por VLAN. Simulador de tráfico (Origen / Destino) que
   anima un paquete por la ruta correcta, mostrando etiquetas 802.1Q en los
   trunks.
2. **Rack** — Cada switch con sus 24 puertos en forma de rack, coloreado por
   modo (TRUNK / ACCESS) y VLAN. Tooltip por puerto.
3. **Cables** — Inspector de cables T568A/B. Cambia las normas de cada punta y
   verás si el cable es directo o cruzado, con los 8 hilos coloreados. Al final
   hay una lista de dónde se usa cada tipo en este laboratorio.
4. **CLI** — Todos los comandos de configuración por dispositivo (Cisco 1,
   Cisco 2, SG3428, ER605, Raspberry Pi) en terminales con resaltado de
   sintaxis.
5. **Tour** — Recorrido guiado paso a paso del camino de un paquete desde la
   laptop del alumno hasta la Raspberry Pi.

Atajos: `T`, `R`, `C`, `L`, `G`.

---

## Despliegue en Raspberry Pi 3 (Apache2)

Suponiendo que ya tienes la Pi con Raspberry Pi OS Lite y `apache2` instalado
según el PDF (`sudo apt install apache2 -y`) y la IP estática `192.168.30.2`.

### Opción A · Copiar desde tu laptop con `scp`

Desde Windows (PowerShell) o cualquier máquina en una VLAN que pueda alcanzar
la VLAN 30 (a través del Gateway ER605 enrutando inter-VLAN):

```bash
# Empaquetar (opcional, hace la copia más rápida)
tar -czf netlab.tar.gz index.html css js

# Copiar el bundle a la Pi
scp netlab.tar.gz pi@192.168.30.2:/tmp/

# En la Pi: desplegar a /var/www/html
ssh pi@192.168.30.2
sudo rm -rf /var/www/html/*
sudo tar -xzf /tmp/netlab.tar.gz -C /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo systemctl reload apache2
```

### Opción B · Despliegue directo (sin empaquetar)

```bash
scp -r index.html css js pi@192.168.30.2:/tmp/netlab/
ssh pi@192.168.30.2
sudo rm -rf /var/www/html/*
sudo mv /tmp/netlab/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
```

### Probar

Desde cualquier laptop de alumno (VLAN 10) o profesor (VLAN 20):

```
http://192.168.30.2/
```

El enrutamiento Inter-VLAN del ER605 ya cubre el acceso.

---

## Configuración recomendada de Apache2

Aprovecha la caché del navegador y compresión para minimizar transferencia
sobre la red interna y descargar a la Pi.

`/etc/apache2/conf-available/netlab.conf`:

```apache
# Compresión gzip (ya viene mod_deflate por defecto)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript text/javascript image/svg+xml
</IfModule>

# Cache larga para activos estáticos (CSS/JS)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css            "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType image/svg+xml       "access plus 30 days"
  ExpiresDefault                    "access plus 1 day"
</IfModule>

# Headers útiles
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
</IfModule>

# Permite SPA: index por defecto
DirectoryIndex index.html
```

Activar:

```bash
sudo a2enmod deflate expires headers
sudo a2enconf netlab
sudo systemctl reload apache2
```

---

## Optimizaciones aplicadas (para Pi 3 / 1 GB RAM)

- **Sin frameworks ni runtime de build**: HTML/CSS/JS vanilla, sin React/Vue/etc.
- **Sin webfonts**: tipografía con `system-ui` y `ui-monospace`. Cero descargas.
- **SVG inline**: el grafo se monta en cliente, sin imágenes que cargar.
- **Sin `filter: blur(...)` ni `backdrop-filter`** (asesinos de la GPU de la Pi).
  Los halos se hacen con `radial-gradient`, no con blur.
- **Animaciones solo en `transform` y `opacity`** (capas GPU-aceleradas). La
  animación de "flujo" en los trunks se activa con la clase `.is-running` en el
  body sólo durante una simulación.
- **Inicialización perezosa**: las vistas Rack/Cable/CLI/Tour se construyen
  recién al primer cambio a esa vista.
- **Pathfinding propio** (BFS sobre 11 enlaces): O(N) trivial; nada de
  librerías de grafos.
- **Animación del paquete con `getPointAtLength`**: API nativa SVG, sin
  dependencias.

### Si necesitas todavía menos peso

- Minificar CSS y JS antes de subir (`terser`, `csso`). Ahorra ~30%.
- Servir todo gzip vía `mod_deflate` (ya cubierto arriba). Reduce a ~12 KB on-wire.
- Si la Pi va sobre microSD lenta, agrega `mod_cache_disk` para servir desde RAM.

---

## Verificación final

- [x] La app representa exactamente la red descrita en `Conexiones_Fisicas_Redes.pdf` y `Switches_Redes.pdf`.
- [x] Visualmente impactante, no genérica (blueprint cyberpunk).
- [x] Interacción real: click en nodos/enlaces, filtro VLAN, simulación de paquetes, tour guiado.
- [x] Backend = 0. Solo Apache2 sirviendo archivos.
- [x] RAM extra consumida ≈ 0 (Apache estático).
- [x] Bundle total bajo 50 KB sin minificar.
- [x] Sin animaciones pesadas; CPU de la Pi no se satura.
