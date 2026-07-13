# Plan de estudio inverso — Foto Trelew Flash

**Objetivo:** entender en profundidad cada tecnología y técnica que usa tu propio sitio, partiendo del código real del proyecto.
**Nivel de partida:** básico (HTML/CSS y algo de JS).
**Ritmo:** 3–5 h/semana → ~20 semanas (5 meses). Cada módulo cierra con un checkpoint sobre TU código: si podés explicarlo y modificarlo sin ayuda, avanzás.

**Método general:** cada semana tiene 3 partes — (1) concepto (leer/ver material, ~1 h), (2) laboratorio en tu sitio (abrir el archivo indicado, leerlo, romperlo, arreglarlo, ~2 h), (3) mini-proyecto (reconstruir la pieza desde cero en un archivo aparte, ~1-2 h). Trabajá siempre sobre copias, nunca sobre `foto-trelew-flash-v4.3.html` directo (ya tenés la costumbre de los `.bak` — mantenela).

---

## Mapa de habilidades de tu sitio

| Área | Qué usa tu sitio | Dónde vive |
|---|---|---|
| HTML semántico | estructura multi-página, `<template>`, `<dialog>`/modales, formularios | `index.html`, tienda, paneles |
| CSS | variables (custom properties), Grid, Flexbox, media queries, `@keyframes`, `transform`, sombras, tema compartido | `assets/theme.css`, estilos embebidos |
| JS – DOM | `querySelector`, `classList` (77 usos), `dataset` (37), `addEventListener` (20), templates | tienda y paneles |
| JS – datos | objetos anidados (CATALOGO), `map`/`filter`/`reduce`, `JSON.parse/stringify` | `assets/data.js`, `catalogo_precios.json` |
| JS – asincronía | `fetch`, `async/await`, promesas | `cargarCatalogoRemoto()` en la tienda |
| JS – archivos e imágenes | `FileReader`, base64/data-URLs, `canvas` (snapshots de taza y collage), CORS (`crossOrigin`) | editor de tazas, collage, stickers |
| Backend | Google Apps Script: `doPost`/`doGet`, `LockService`, Sheets como DB, Drive para imágenes | `apps-script-pedidos-v2.gs` |
| Arquitectura | fuente única de precios, modo demo vs. API, versionado, despliegue | `README-despliegue-v4_3.md`, `CONECTAR-HOJA.md` |

---

## Etapa 1 — CSS: el tema vintage (semanas 1–4)

Tu sitio tiene un sistema de diseño real: `theme.css` define paleta (crema/dorado/bordó), radios, sombras y tipografías como variables, y todas las páginas lo consumen. Es el mejor lugar para empezar porque los cambios se ven al instante.

**Semana 1 — Variables CSS y el cascade.**
- Concepto: custom properties (`--crema`, `var()`), especificidad, herencia.
- Laboratorio: abrí `theme.css` y cambiá `--bordo` y `--dorado`. Mirá cómo se propaga a las 5 páginas. Después buscá un color hardcodeado en algún HTML que NO use variable y convertilo.
- Mini-proyecto: creá un `theme-oscuro.css` alternativo (mismo set de variables, valores nuevos) y alterná entre ambos.

**Semana 2 — Flexbox.**
- Concepto: `display:flex`, ejes, `gap`, `align-items`, `justify-content`.
- Laboratorio: en `index.html` está `.acceso-badge` con `inline-flex`. Explicá por qué inline-flex y no flex. Encontrá 3 usos más de flex en la tienda y dibujá en papel qué eje alinea cada uno.
- Mini-proyecto: reconstruí la barra superior de la tienda desde cero.

**Semana 3 — Grid y responsive.**
- Concepto: `grid-template-columns`, `repeat()`, `fr`, media queries.
- Laboratorio: `index.html` usa `.cards{grid-template-columns:repeat(2,1fr)}` que colapsa a 1 columna en `@media(max-width:760px)`. Cambialo a 3 columnas con un breakpoint intermedio. Después estudiá la grilla de productos de la tienda.
- Mini-proyecto: una galería de fotos responsive (3→2→1 columnas) desde cero. Te sirve directo para `galeria-evento.html`.

**Semana 4 — Animaciones y transiciones.**
- Concepto: `transition`, `transform`, `@keyframes` (tu tienda tiene 9 y 47 usos de transform).
- Laboratorio: el hover de los paneles en `index.html` (`translateY(-2px)`). Buscá 2 `@keyframes` en la tienda y explicá frame por frame qué animan.
- Mini-proyecto: recreá el aviso "agregado al carrito" (`avisoAgregado()`) con su animación de entrada/salida.

**Checkpoint 1:** sin mirar apuntes, explicá por qué el sitio usa un solo `theme.css` en vez de estilos por página, y qué pasaría si borraras `:root`.

---

## Etapa 2 — JavaScript: fundamentos con tus datos (semanas 5–8)

Antes de tocar el DOM, dominá los datos. Tu `data.js` es un caso de estudio perfecto: un objeto CATALOGO anidado de 4 niveles que alimenta TODOS los precios del sitio.

**Semana 5 — Objetos y acceso a datos.**
- Concepto: objetos, propiedades anidadas, notación punto vs. corchetes, `null` como dato (mirá `cantimplora: null` — ¿por qué está?).
- Laboratorio: abrí la consola del navegador (F12) en la tienda y navegá CATALOGO a mano: `CATALOGO.sublimados.tazas.magica`. Escribí expresiones para llegar a 10 precios distintos.
- Mini-proyecto: función `precioDe(categoria, item)` que devuelva un precio o un mensaje si no existe.

**Semana 6 — Arrays y sus métodos.**
- Concepto: `map`, `filter`, `reduce` (tu tienda los usa: 11, 8 y 2 veces), `forEach`, `some` (el Apps Script usa `items.some(...)` para detectar imágenes).
- Laboratorio: encontrá cada `map(` de la tienda y anotá: qué array entra, qué sale. Lo mismo con los `reduce` (spoiler: calculan totales del carrito).
- Mini-proyecto: dado un array de ítems de pedido de ejemplo, calculá el total, filtrá los que superan $10.000 y generá el split 70/30 del panel de fotógrafos.

**Semana 7 — Funciones y organización.**
- Concepto: declaración vs. arrow functions, parámetros, retorno, scope. Convenciones: tu Apps Script usa el sufijo `_` para funciones privadas (`respuestaJson_`, `proximoNumero_`) — entendé por qué.
- Laboratorio: la tienda tiene ~40+ funciones (`agregarFotoAlCarrito`, `actualizarBadges`, `aplicarPlantilla`...). Elegí 5 y escribí en una línea qué hace cada una sin ejecutarlas, después verificá.
- Mini-proyecto: refactorizá tu `precioDe()` de la semana 5 para cubrir los casos anidados (fotos_tarjetas tiene simple/con_iman).

**Semana 8 — JSON.**
- Concepto: JSON vs. objeto JS, `JSON.parse`/`stringify`, por qué es EL formato entre tu tienda y el Apps Script.
- Laboratorio: compará `assets/catalogo_precios.json` con el CATALOGO embebido en `data.js`. El comentario de data.js dice que es una "copia embebida del catálogo canónico" — explicá el problema de tener dos copias y cómo lo mitiga el diseño.
- Mini-proyecto: escribí el payload JSON exacto que tu tienda manda en un pedido (mirá qué lee `doPost` en el .gs: `datos.cliente`, `datos.items`, `datos.fecha`) y validalo mentalmente contra el código del backend.

**Checkpoint 2:** explicá el viaje de un precio: del JSON canónico → data.js → etiqueta en pantalla → ítem del carrito → fila en la hoja de cálculo.

---

## Etapa 3 — El DOM: cómo la tienda cobra vida (semanas 9–12)

Acá está el corazón del sitio: 77 usos de `classList`, 37 de `dataset`, 20 listeners.

**Semana 9 — Selección y modificación.**
- Concepto: `querySelector(All)`, `textContent` vs. `innerHTML`, crear y agregar nodos.
- Laboratorio: seguí `actualizarBadges()` — qué selecciona, qué cambia. Después `construirCatalogosUI()`: cómo convierte el objeto CATALOGO en HTML.
- Mini-proyecto: página en blanco que lea CATALOGO y genere la lista de precios de revelado como tabla HTML, solo con JS.

**Semana 10 — Eventos.**
- Concepto: `addEventListener`, el objeto `event`, delegación de eventos (un listener en el padre para muchos hijos — tu tienda lo necesita para productos generados dinámicamente).
- Laboratorio: mapeá los 20 `addEventListener` de la tienda: elemento, evento, qué dispara.
- Mini-proyecto: a tu tabla de precios de la semana 9, agregale "clic en fila → se agrega a un carrito" con delegación.

**Semana 11 — classList, dataset y estado en el DOM.**
- Concepto: `classList.toggle/add/remove` como máquina de estados visual; `data-*` para guardar datos en elementos.
- Laboratorio: elegí un flujo completo — abrir el editor de tazas (`abrirTaza()`) hasta `agregarTazaAlCarrito()` — y anotá cada cambio de clase y cada lectura de dataset.
- Mini-proyecto: tabs/acordeón con solo classList, imitando las secciones de la tienda.

**Semana 12 — `<template>`, modales y componentes sin framework.**
- Concepto: el elemento `<template>` (4 usos en tu tienda), clonado de nodos, patrones de modal.
- Laboratorio: encontrá los `<template>` de la tienda y seguí dónde se clonan. Estudiá `abrirCrop()`/`cerrarModalTexto()` como patrón de modal.
- Mini-proyecto: modal reutilizable desde cero (abrir, cerrar con X, con Escape y con clic afuera).

**Checkpoint 3:** describí, función por función, qué pasa desde que el cliente hace clic en una taza hasta que aparece en el carrito con su precio.

---

## Etapa 4 — Asincronía, archivos e imágenes (semanas 13–16)

La parte más avanzada del frontend: acá tu sitio hace cosas que muchos sitios profesionales no hacen.

**Semana 13 — fetch y async/await.**
- Concepto: promesas, `fetch`, `async/await`, manejo de errores con try/catch, fallbacks.
- Laboratorio: `cargarCatalogoRemoto()` — qué URL llama, qué hace si falla (pista: el modo demo existe por algo). Relacionalo con `doGet?accion=catalogo` del Apps Script.
- Mini-proyecto: página que haga fetch del catálogo a tu Apps Script real y muestre los precios, con mensaje de error elegante si no responde.

**Semana 14 — FileReader y base64.**
- Concepto: el objeto File, `FileReader.readAsDataURL`, qué es base64 y por qué infla ~33% el peso, data-URLs.
- Laboratorio: seguí el camino de una foto subida por el cliente: input file → FileReader → data-URL → payload del pedido → en el .gs, la regex `^data:(.+?);base64,(.*)$` que la desarma → `Utilities.base64Decode` → archivo en Drive. Es el flujo completo de tu negocio.
- Mini-proyecto: subidor de imagen con preview y muestra del tamaño en KB antes/después de base64.

**Semana 15 — Canvas.**
- Concepto: `getContext("2d")`, `drawImage`, escala (tu código usa `esc = 2` — ¿por qué? retina), `toDataURL`, recorte.
- Laboratorio: `snapshotTaza` y `snapshotCollage` — cómo convierten lo que el cliente diseñó en una imagen final. Y `cropAplicar()`: los 9 argumentos de `drawImage` para recortar.
- Mini-proyecto: mini-editor que cargue una foto, permita recortarla y descargue el resultado.

**Semana 16 — CORS y detalles de producción.**
- Concepto: same-origin policy, canvas "contaminado" (tainted), `crossOrigin="anonymous"`. Tu propio código lo documenta: sin eso, `toDataURL` falla con los stickers de OpenMoji.
- Laboratorio: reproducí el error: cargá un sticker sin crossOrigin en tu mini-editor y mirá fallar `toDataURL`. Arreglalo.
- Extra: `IntersectionObserver` en `galeria-evento.html` (lazy loading de fotos) — entendé el patrón, es el estándar para galerías grandes.

**Checkpoint 4:** explicá por qué los stickers necesitan `crossOrigin` y qué pasaría con los pedidos de tazas si jsDelivr dejara de mandar el header CORS.

---

## Etapa 5 — Backend: Apps Script, Sheets y Drive (semanas 17–20)

Tu backend son 1.243 líneas de Apps Script. Es JavaScript, así que todo lo anterior aplica; lo nuevo es el entorno de Google.

**Semana 17 — Anatomía de una web app de Apps Script.**
- Concepto: `doPost`/`doGet` como endpoints, `ContentService`, despliegue y versiones (tu README documenta el detalle clave: redesployar con "Nueva versión" para mantener la URL).
- Laboratorio: leé `doPost` completo. Dibujá el diagrama: JSON entra → enrutado por `accion` (login/guardarPrecios/pedido) → hojas → respuesta.
- Mini-proyecto: creá un Apps Script propio de juguete que reciba un JSON y lo escriba en una hoja. Desplegalo y llamalo con fetch desde una página local.

**Semana 18 — Sheets como base de datos.**
- Concepto: `SpreadsheetApp`, `getRange/setValues`, el modelo Pedidos (cabecera) + Items (detalle) — eso es un diseño relacional 1-a-N, aunque esté en planillas.
- Laboratorio: `proximoNumero_()` (numeración A-0001) y `obtenerHoja_()`. Preguntate: ¿qué pasa si dos clientes compran al mismo tiempo? Respuesta en la semana 19.
- Mini-proyecto: agregale a tu script de juguete una segunda hoja con filas de detalle vinculadas por número.

**Semana 19 — Concurrencia, seguridad y Drive.**
- Concepto: `LockService` (por qué `doPost` arranca con `lock.waitLock(30000)`), condiciones de carrera, el login de `loginAdmin_` y sus límites (¿dónde viven los usuarios? ¿qué tan seguro es?), `DriveApp` y carpetas por pedido.
- Laboratorio: seguí `carpetaPorNombre_` y la creación de subcarpetas por pedido. Evaluá honestamente la seguridad del panel admin y anotá qué mejorarías.
- Mini-proyecto: simulá una condición de carrera: sacale el lock a tu script de juguete y mandale 5 fetch simultáneos — mirá los números duplicados.

**Semana 20 — Arquitectura e integración final.**
- Concepto: repaso del sistema completo como arquitectura: frontend estático + API serverless (Apps Script) + Sheets/Drive como almacenamiento. Fuente única de verdad (catálogo canónico), modo demo vs. producción, auditoría de precios (`AuditoriaPrecios`).
- Laboratorio final: leé `README-despliegue-v4_3.md` y `CONECTAR-HOJA.md` y verificá que ahora entendés cada instrucción y POR QUÉ existe.
- Proyecto final: implementá una mejora real de punta a punta. Candidatas: (a) conectar `galeria-evento.html` a una hoja real de eventos, (b) reemplazar el CATALOGO embebido por fetch con caché en localStorage, (c) agregar un campo nuevo al pedido (frontend → payload → doPost → columna en la hoja).

**Checkpoint final:** explicale el sistema completo a otra persona en 10 minutos, con un diagrama dibujado por vos. Si podés responder sus "¿y por qué así?", terminaste.

---

## Temas que tu sitio NO usa (para no desviarte)

Frameworks (React, Vue), Node.js, bases de datos SQL, bundlers (webpack/vite), TypeScript. Son valiosos, pero no están en tu stack. Aprendelos después, cuando este plan termine — y vas a apreciarlos más porque vas a saber exactamente qué problema resuelven.

## Recursos recomendados (gratuitos, en español)

- **MDN Web Docs** (developer.mozilla.org/es) — referencia oficial para todo HTML/CSS/JS de este plan. Buscá cada concepto ahí primero.
- **javascript.info** (es.javascript.info) — el mejor curso estructurado de JS moderno; las etapas 2–4 mapean casi capítulo a capítulo.
- **CSS Grid Garden y Flexbox Froggy** — juegos para la etapa 1.
- **Documentación de Apps Script** (developers.google.com/apps-script) — para la etapa 5.
- La consola del navegador (F12) es tu herramienta principal: usala todas las semanas.

## Reglas del plan

1. No avances de etapa sin pasar el checkpoint.
2. Todo experimento en copia (`.bak` o carpeta aparte), nunca en producción.
3. Si algo del código propio no lo entendés tras 30 minutos, anotá la pregunta exacta y traela — desglosarla es más productivo que frustrarse.
4. Ritmo sugerido con 3–5 h/semana: 1 semana del plan = 1 semana real. Si una etapa te lleva más, está bien: el orden importa más que la velocidad.
