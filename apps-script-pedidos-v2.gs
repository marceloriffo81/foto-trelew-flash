/*******************************************************
 * TRELEW FLASH — Apps Script de pedidos v2 (app v4.3)
 * - doPost: recibe pedidos (compatible con payload v4.2 y v4.3)
 *   · escribe cabecera en "Pedidos" (mismas columnas de siempre + Estado)
 *   · escribe una fila por ítem en "Items"
 *   · guarda imágenes en Drive (subcarpeta por pedido)
 * - doGet?accion=catalogo: devuelve el catálogo (pestañas Catalogo/Modificadores,
 *   con fallback al catálogo embebido si las pestañas están vacías)
 * - setup(): crea pestañas faltantes y las puebla desde el fallback
 *
 * DESPLIEGUE: pegar en el proyecto Apps Script EXISTENTE (el de la URL actual),
 * ejecutar setup() una vez, y redesplegar con "Administrar implementaciones →
 * editar → Nueva versión" para MANTENER la misma URL. Acceso: "Cualquier persona".
 *******************************************************/

const CONFIG = {
  HOJA_PEDIDOS: 'Pedidos',
  HOJA_ITEMS: 'Items',
  HOJA_CATALOGO: 'Catalogo',
  HOJA_MODIFICADORES: 'Modificadores',
  HOJA_USUARIOS: 'Usuarios',
  HOJA_AUDITORIA: 'AuditoriaPrecios',
  PREFIJO: 'A-',
  DIGITOS: 4,
  CARPETA_RAIZ: 'Pedidos Trelewflash - imágenes'
};

/* ══════════════ doPost: registrar pedido ══════════════ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const datos = JSON.parse(e.postData.contents);

    // Enrutado por accion (login / edicion de precios)
    if (datos.accion === 'login')          return respuestaJson_(loginAdmin_(datos));
    if (datos.accion === 'guardarPrecios') return respuestaJson_(guardarPreciosAdmin_(datos));
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPedidos = obtenerHoja_(ss, CONFIG.HOJA_PEDIDOS);
    const hojaItems = obtenerHoja_(ss, CONFIG.HOJA_ITEMS);

    const numero = proximoNumero_(hojaPedidos);
    const fecha = datos.fecha || new Date().toLocaleString('es-AR');
    const cliente = datos.cliente || {};
    const items = datos.items || [];

    // ── Carpeta de imágenes (solo si hay adjuntos) ──
    let urlCarpeta = '';
    const hayImagenes = items.some(it => (it.imagenes || []).length > 0);
    if (hayImagenes) {
      const raiz = carpetaPorNombre_(CONFIG.CARPETA_RAIZ);
      const sub = raiz.createFolder(numero + ' - ' + (cliente.nombre || 'Sin nombre'));
      items.forEach((it, i) => {
        (it.imagenes || []).forEach((img, j) => {
          try {
            const m = String(img.url || '').match(/^data:(.+?);base64,(.*)$/);
            if (!m) return;
            const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1],
              'item' + (i + 1) + '_' + (j + 1) + '_' + (img.name || 'foto'));
            sub.createFile(blob);
          } catch (err) { /* seguir con las demás */ }
        });
      });
      sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlCarpeta = sub.getUrl();
    }

    // ── Cabecera en "Pedidos" (formato v1 + Estado) ──
    const detalleTexto = items.map((it, i) =>
      (i + 1) + ') ' + (it.desc || it.producto || it.tipo || '') +
      ' — ' + (it.detalle || '') + ' — $' + (it.subtotal != null ? it.subtotal : '')
    ).join('\n');

    hojaPedidos.appendRow([
      fecha,
      numero,
      cliente.nombre || '',
      cliente.whatsapp || '',
      cliente.email || '',
      detalleTexto,
      datos.total != null ? datos.total : '',
      datos.aCotizar ? 'Sí' : 'No',
      urlCarpeta,
      'Nuevo'
    ]);

    // ── Una fila por ítem en "Items" ──
    items.forEach(it => {
      const mods = (it.modificadores || []).map(m =>
        m.id + (m.cantidad != null ? '×' + m.cantidad : '') + ': ' + (m.monto != null ? m.monto : '')
      ).join('; ');
      hojaItems.appendRow([
        numero,
        fecha,
        it.sku || '',
        it.producto || it.tipo || '',
        it.variante || it.desc || '',
        it.cantidad != null ? it.cantidad : '',
        it.precio_unit != null ? it.precio_unit : '',
        mods,
        it.monto_modificadores != null ? it.monto_modificadores : '',
        it.subtotal != null ? it.subtotal : '',
        it.aCotizar ? 'Sí' : 'No'
      ]);
    });

    return respuestaJson_({ ok: true, numero: numero, carpeta: urlCarpeta });
  } catch (err) {
    return respuestaJson_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ══════════════ doGet: servir catálogo ══════════════ */
function doGet(e) {
  const accion = e && e.parameter && e.parameter.accion;
  if (accion === 'catalogo') {
    try {
      const cat = catalogoDesdeHojas_() || CATALOGO_FALLBACK;
      return respuestaJson_(cat);
    } catch (err) {
      return respuestaJson_(CATALOGO_FALLBACK);
    }
  }
  return respuestaJson_({ ok: true, servicio: 'pedidos trelewflash v2' });
}

/* Lee las pestañas Catalogo/Modificadores y arma el JSON.
   Devuelve null si están vacías (→ usar fallback). */
function catalogoDesdeHojas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hCat = ss.getSheetByName(CONFIG.HOJA_CATALOGO);
  const hMod = ss.getSheetByName(CONFIG.HOJA_MODIFICADORES);
  if (!hCat || !hMod || hCat.getLastRow() < 2) return null;

  const filasCat = hCat.getDataRange().getValues().slice(1);
  const filasMod = hMod.getDataRange().getValues().slice(1);

  // Modificadores: id | nombre | tipo | ambito | valor | incluidas | notas
  const modificadores = filasMod.filter(f => f[0]).map(f => {
    const m = { id: String(f[0]), nombre: String(f[1] || ''), tipo: String(f[2] || 'fijo'),
                ambito: String(f[3] || 'por_copia'), valor: numeroONull_(f[4]) };
    if (f[5] !== '' && f[5] != null) m.incluidas = Number(f[5]);
    if (f[6]) m.notas = String(f[6]);
    return m;
  });

  // Catalogo: producto_id | producto | categoria | sku | variante | atributos(json) |
  //           precio | costo | activo | a_cotizar | visible_web | render(json) | modificadores
  const productosMap = {};
  const orden = [];
  filasCat.filter(f => f[0] && f[3]).forEach(f => {
    const pid = String(f[0]);
    if (!productosMap[pid]) {
      productosMap[pid] = {
        id: pid, nombre: String(f[1] || pid), categoria: String(f[2] || ''),
        modificadores: parseLista_(f[12]), variantes: []
      };
      orden.push(pid);
    }
    const v = {
      sku: String(f[3]), nombre: String(f[4] || ''),
      atributos: parseJson_(f[5]) || {},
      precio: numeroONull_(f[6]), costo: numeroONull_(f[7]),
      activo: esVerdadero_(f[8]), a_cotizar: esVerdadero_(f[9]),
      visible_web: esVerdadero_(f[10])
    };
    const render = parseJson_(f[11]);
    if (render) v.render = render;
    productosMap[pid].variantes.push(v);
  });
  if (!orden.length) return null;

  const cat = JSON.parse(JSON.stringify(CATALOGO_FALLBACK)); // hereda meta + ui
  cat.productos = orden.map(pid => {
    // conservar overrides de modificadores definidos en el fallback (ej. retoque por_diseno en collage)
    const base = (CATALOGO_FALLBACK.productos || []).find(p => p.id === pid);
    const p = productosMap[pid];
    if (base && base.modificadores_override) p.modificadores_override = base.modificadores_override;
    return p;
  });
  cat.modificadores = modificadores;
  cat.meta = cat.meta || {};
  cat.meta.origen = 'hoja';
  cat.meta.actualizado = new Date().toISOString();
  return cat;
}

/* ══════════════ setup(): preparar la hoja ══════════════ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Pedidos: agregar columna Estado si falta
  const hPed = obtenerHoja_(ss, CONFIG.HOJA_PEDIDOS);
  if (hPed.getLastRow() === 0) {
    hPed.appendRow(['Fecha', 'N° Pedido', 'Cliente', 'WhatsApp', 'Email',
      'Pedido', 'Total estimado', 'A cotizar', 'Carpeta de imágenes', 'Estado']);
  } else {
    const headers = hPed.getRange(1, 1, 1, hPed.getLastColumn()).getValues()[0];
    if (headers.indexOf('Estado') === -1) {
      hPed.getRange(1, headers.length + 1).setValue('Estado');
    }
  }

  // Items
  const hIt = obtenerHoja_(ss, CONFIG.HOJA_ITEMS);
  if (hIt.getLastRow() === 0) {
    hIt.appendRow(['N° Pedido', 'Fecha', 'SKU', 'Producto', 'Variante', 'Cantidad',
      'Precio unit.', 'Modificadores', 'Monto modif.', 'Subtotal', 'A cotizar']);
  }

  // Catalogo + Modificadores: poblar desde fallback si están vacías
  const hCat = obtenerHoja_(ss, CONFIG.HOJA_CATALOGO);
  if (hCat.getLastRow() === 0) {
    hCat.appendRow(['producto_id', 'producto', 'categoria', 'sku', 'variante', 'atributos',
      'precio', 'costo', 'activo', 'a_cotizar', 'visible_web', 'render', 'modificadores']);
    const filas = [];
    (CATALOGO_FALLBACK.productos || []).forEach(p => {
      (p.variantes || []).forEach(v => {
        filas.push([
          p.id, p.nombre, p.categoria || '', v.sku, v.nombre,
          JSON.stringify(v.atributos || {}),
          v.precio != null ? v.precio : '', v.costo != null ? v.costo : '',
          v.activo !== false ? 'SI' : 'NO',
          v.a_cotizar ? 'SI' : 'NO',
          v.visible_web !== false ? 'SI' : 'NO',
          v.render ? JSON.stringify(v.render) : '',
          (p.modificadores || []).join(',')
        ]);
      });
    });
    if (filas.length) hCat.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  }

  const hMod = obtenerHoja_(ss, CONFIG.HOJA_MODIFICADORES);
  if (hMod.getLastRow() === 0) {
    hMod.appendRow(['id', 'nombre', 'tipo', 'ambito', 'valor', 'incluidas', 'notas']);
    const filas = (CATALOGO_FALLBACK.modificadores || []).map(m => [
      m.id, m.nombre || '', m.tipo || 'fijo', m.ambito || 'por_copia',
      m.valor != null ? m.valor : '', m.incluidas != null ? m.incluidas : '', m.notas || ''
    ]);
    if (filas.length) hMod.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  }

  Logger.log('setup listo');
}

/* ══════════════ auxiliares ══════════════ */
function obtenerHoja_(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

function proximoNumero_(hojaPedidos) {
  let max = 0;
  const ultima = hojaPedidos.getLastRow();
  if (ultima >= 2) {
    const nums = hojaPedidos.getRange(2, 2, ultima - 1, 1).getValues();
    nums.forEach(f => {
      const m = String(f[0]).match(new RegExp('^' + CONFIG.PREFIJO + '(\\d+)$'));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  }
  return CONFIG.PREFIJO + String(max + 1).padStart(CONFIG.DIGITOS, '0');
}

function carpetaPorNombre_(nombre) {
  const it = DriveApp.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nombre);
}

function respuestaJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseJson_(v) {
  if (v == null || v === '') return null;
  try { return JSON.parse(String(v)); } catch (e) { return null; }
}
function parseLista_(v) {
  return String(v || '').split(',').map(s => s.trim()).filter(Boolean);
}
function numeroONull_(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function esVerdadero_(v) {
  const s = String(v).trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1' || s === 'X' || v === true;
}

/* ══════════════ Catálogo embebido (fallback) ══════════════ */
const CATALOGO_FALLBACK = {
  "meta": {
    "version": "2.0",
    "moneda": "ARS",
    "fecha": "2026-07-08",
    "vigencia_confirmada": false,
    "fuente": "Consolidación de catalogo_precios.json v1 + constantes de foto-trelew-flash v4.2",
    "nota": "FUENTE ÚNICA de precios. La app (v4.3+), el catálogo B2B y el backend leen de acá o de su espejo en la pestaña 'Catalogo' de la hoja de pedidos. VERIFICAR contra la cartilla PDF vigente antes de publicar.",
    "decisiones": [
      "Modelo: producto → variante (SKU + precio propio) → modificador (fijo o porcentaje, con ámbito).",
      "Imán se modela como VARIANTE (producto foto_iman), no como recargo: su precio depende de la medida.",
      "Se incorporó IMAN-9X13 a $3.400: existía en la app (polaroid + imán) pero faltaba en el catálogo v1.",
      "Foto extra de collage confirmada en $300 y texto impreso en $300/foto (valores que la app v4.2 ya cobraba; el v1 los tenía en null o ausentes).",
      "Retoque: ámbito por_foto (una vez por foto adjunta; mínimo 1 por ítem). En collage se aplica por_diseno (una vez por diseño, como en v4.2). ANTES en revelado se cobraba por copia: solo cambia el caso sin fotos adjuntas con cantidad > 1, a favor del cliente. Para revertir, cambiar 'ambito' del modificador retoque a 'por_copia'.",
      "Pines pasan a estar visibles en la web (estaban en el catálogo pero no en la app).",
      "Polaroid disponible en 5x7, 7x10, 9x13 y 10x15 (según la app; el v1 solo listaba 7x10 y 9x13)."
    ],
    "pendientes": [
      "Cantimplora: sin precio en la fuente (variante inactiva, a cotizar).",
      "Presentes combos: sin precio en la fuente (variantes inactivas, a cotizar).",
      "Costos: campo 'costo' creado en todas las variantes, en null. Completarlo destraba márgenes, tabla de descuentos B2B (regla: descuento máximo <= 60% del margen bruto) y CAC objetivo (debilidad D8).",
      "Reproducción (+30%): existe como modificador pero la app aún no tiene flujo de UI para ofrecerlo."
    ]
  },
  "modificadores": [
    {
      "id": "retoque",
      "nombre": "Retoque digital",
      "tipo": "fijo",
      "ambito": "por_foto",
      "valor": 11500,
      "nota": "Una vez por foto adjunta (mín. 1 por ítem). En collage se aplica por_diseno (override en el producto)."
    },
    {
      "id": "texto_impreso",
      "nombre": "Texto impreso",
      "tipo": "fijo",
      "ambito": "por_foto",
      "valor": 300
    },
    {
      "id": "reproduccion",
      "nombre": "Reproducción (cliente trae foto en papel y se escanea)",
      "tipo": "porcentaje",
      "ambito": "por_copia",
      "valor": 30
    },
    {
      "id": "armado_collage",
      "nombre": "Armado de collage (diseño único)",
      "tipo": "fijo",
      "ambito": "por_diseno",
      "valor": 11500
    },
    {
      "id": "foto_extra_collage",
      "nombre": "Foto extra de collage",
      "tipo": "fijo",
      "ambito": "por_unidad_sobre_incluidas",
      "valor": 300,
      "incluidas": 5
    }
  ],
  "ui": {
    "grupos_fotos": {
      "chicos": {
        "titulo": "Tamaños chicos",
        "escena": "escritorio"
      },
      "medianos": {
        "titulo": "Tamaños medianos",
        "escena": "escritorio"
      },
      "grandes": {
        "titulo": "Tamaños grandes",
        "escena": "living"
      },
      "polaroid": {
        "titulo": "Estilo Polaroid",
        "escena": "escritorio",
        "esPolaroid": true
      },
      "collage": {
        "titulo": "Foto collage",
        "escena": "living",
        "esCollage": true
      }
    }
  },
  "productos": [
    {
      "id": "revelado",
      "nombre": "Revelado de fotos",
      "categoria": "impresion",
      "modificadores": [
        "retoque",
        "texto_impreso",
        "reproduccion"
      ],
      "variantes": [
        {
          "sku": "REV-5X7-EST",
          "nombre": "5x7 cm",
          "atributos": {
            "medida": "5x7",
            "estilo": "estandar"
          },
          "precio": 1100,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "chicos",
            "w": 50,
            "h": 70
          }
        },
        {
          "sku": "REV-7X10-EST",
          "nombre": "7x10 cm",
          "atributos": {
            "medida": "7x10",
            "estilo": "estandar"
          },
          "precio": 1100,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "chicos",
            "w": 63,
            "h": 90
          }
        },
        {
          "sku": "REV-9X13-EST",
          "nombre": "9x13 cm",
          "atributos": {
            "medida": "9x13",
            "estilo": "estandar"
          },
          "precio": 1300,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "chicos",
            "w": 72,
            "h": 104
          }
        },
        {
          "sku": "REV-10X15-EST",
          "nombre": "10x15 cm",
          "atributos": {
            "medida": "10x15",
            "estilo": "estandar"
          },
          "precio": 1400,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "medianos",
            "w": 80,
            "h": 120
          }
        },
        {
          "sku": "REV-13X18-EST",
          "nombre": "13x18 cm",
          "atributos": {
            "medida": "13x18",
            "estilo": "estandar"
          },
          "precio": 1500,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "medianos",
            "w": 91,
            "h": 126
          }
        },
        {
          "sku": "REV-15X21-EST",
          "nombre": "15x21 cm",
          "atributos": {
            "medida": "15x21",
            "estilo": "estandar"
          },
          "precio": 1800,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "medianos",
            "w": 98,
            "h": 137
          }
        },
        {
          "sku": "REV-20X30-EST",
          "nombre": "20x30 cm",
          "atributos": {
            "medida": "20x30",
            "estilo": "estandar"
          },
          "precio": 7000,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "grandes",
            "w": 120,
            "h": 180
          }
        },
        {
          "sku": "REV-30X40-EST",
          "nombre": "30x40 cm",
          "atributos": {
            "medida": "30x40",
            "estilo": "estandar"
          },
          "precio": 14500,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "grandes",
            "w": 150,
            "h": 200
          }
        },
        {
          "sku": "REV-5X7-POL",
          "nombre": "5x7 cm",
          "atributos": {
            "medida": "5x7",
            "estilo": "polaroid"
          },
          "precio": 1100,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "polaroid",
            "w": 50,
            "h": 70
          }
        },
        {
          "sku": "REV-7X10-POL",
          "nombre": "7x10 cm",
          "atributos": {
            "medida": "7x10",
            "estilo": "polaroid"
          },
          "precio": 1100,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "polaroid",
            "w": 63,
            "h": 90
          }
        },
        {
          "sku": "REV-9X13-POL",
          "nombre": "9x13 cm",
          "atributos": {
            "medida": "9x13",
            "estilo": "polaroid"
          },
          "precio": 1300,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "polaroid",
            "w": 72,
            "h": 104
          }
        },
        {
          "sku": "REV-10X15-POL",
          "nombre": "10x15 cm",
          "atributos": {
            "medida": "10x15",
            "estilo": "polaroid"
          },
          "precio": 1400,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "polaroid",
            "w": 80,
            "h": 120
          }
        }
      ]
    },
    {
      "id": "collage",
      "nombre": "Foto collage",
      "categoria": "impresion",
      "nota": "El precio de la variante es SOLO impresión por copia. El armado, las fotos extra y el retoque se cobran una vez por diseño (modificadores).",
      "modificadores": [
        "armado_collage",
        "foto_extra_collage",
        {
          "id": "retoque",
          "ambito": "por_diseno"
        },
        "texto_impreso"
      ],
      "variantes": [
        {
          "sku": "COLL-10X15",
          "nombre": "10x15 cm",
          "atributos": {
            "medida": "10x15"
          },
          "precio": 1400,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "collage",
            "w": 80,
            "h": 120
          }
        },
        {
          "sku": "COLL-13X18",
          "nombre": "13x18 cm",
          "atributos": {
            "medida": "13x18"
          },
          "precio": 1500,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "collage",
            "w": 91,
            "h": 126
          }
        },
        {
          "sku": "COLL-15X21",
          "nombre": "15x21 cm",
          "atributos": {
            "medida": "15x21"
          },
          "precio": 1800,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "collage",
            "w": 98,
            "h": 137
          }
        },
        {
          "sku": "COLL-20X30",
          "nombre": "20x30 cm",
          "atributos": {
            "medida": "20x30"
          },
          "precio": 7000,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "collage",
            "w": 120,
            "h": 180
          }
        },
        {
          "sku": "COLL-30X40",
          "nombre": "30x40 cm",
          "atributos": {
            "medida": "30x40"
          },
          "precio": 14500,
          "costo": null,
          "activo": true,
          "render": {
            "grupo": "collage",
            "w": 150,
            "h": 200
          }
        },
        {
          "sku": "COLL-ESP",
          "nombre": "Medida especial",
          "atributos": {},
          "precio": null,
          "costo": null,
          "activo": true,
          "a_cotizar": true,
          "especial": true,
          "render": {
            "grupo": "collage"
          }
        }
      ]
    },
    {
      "id": "foto_iman",
      "nombre": "Foto imán",
      "categoria": "souvenir",
      "nota": "Variante propia, NO es 'foto tarjeta + recargo': el precio del imán depende de la medida. Desde el simulador (polaroid + imán) resuelve al mismo SKU.",
      "modificadores": [],
      "variantes": [
        {
          "sku": "IMAN-5X7",
          "nombre": "5x7 cm",
          "atributos": {
            "medida": "5x7"
          },
          "precio": 2900,
          "costo": null,
          "activo": true
        },
        {
          "sku": "IMAN-7X10",
          "nombre": "7x10 cm",
          "atributos": {
            "medida": "7x10"
          },
          "precio": 2900,
          "costo": null,
          "activo": true
        },
        {
          "sku": "IMAN-9X13",
          "nombre": "9x13 cm",
          "atributos": {
            "medida": "9x13"
          },
          "precio": 3400,
          "costo": null,
          "activo": true
        },
        {
          "sku": "IMAN-10X15",
          "nombre": "10x15 cm",
          "atributos": {
            "medida": "10x15"
          },
          "precio": 4000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "IMAN-13X18",
          "nombre": "13x18 cm",
          "atributos": {
            "medida": "13x18"
          },
          "precio": 5500,
          "costo": null,
          "activo": true
        },
        {
          "sku": "IMAN-15X21",
          "nombre": "15x21 cm",
          "atributos": {
            "medida": "15x21"
          },
          "precio": 6500,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "foto_tarjeta",
      "nombre": "Foto tarjeta",
      "categoria": "souvenir",
      "modificadores": [],
      "variantes": [
        {
          "sku": "TARJ-5X7",
          "nombre": "5x7 cm",
          "atributos": {
            "medida": "5x7"
          },
          "precio": 1500,
          "costo": null,
          "activo": true
        },
        {
          "sku": "TARJ-7X10",
          "nombre": "7x10 cm",
          "atributos": {
            "medida": "7x10"
          },
          "precio": 1500,
          "costo": null,
          "activo": true
        },
        {
          "sku": "TARJ-10X15",
          "nombre": "10x15 cm",
          "atributos": {
            "medida": "10x15"
          },
          "precio": 2000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "TARJ-13X18",
          "nombre": "13x18 cm",
          "atributos": {
            "medida": "13x18"
          },
          "precio": 2900,
          "costo": null,
          "activo": true
        },
        {
          "sku": "TARJ-15X21",
          "nombre": "15x21 cm",
          "atributos": {
            "medida": "15x21"
          },
          "precio": 3500,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "llaveros",
      "nombre": "Llaveros",
      "categoria": "souvenir",
      "modificadores": [],
      "variantes": [
        {
          "sku": "LLAV-ACR-RECT",
          "nombre": "Acrílico rectangular",
          "atributos": {
            "modelo": "acrilico_rectangular"
          },
          "precio": 3000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "LLAV-ACR-RED",
          "nombre": "Acrílico redondo",
          "atributos": {
            "modelo": "acrilico_redondo"
          },
          "precio": 2700,
          "costo": null,
          "activo": true
        },
        {
          "sku": "LLAV-RED",
          "nombre": "Redondo",
          "atributos": {
            "modelo": "redondo"
          },
          "precio": 3400,
          "costo": null,
          "activo": true
        },
        {
          "sku": "LLAV-IMAN",
          "nombre": "Con imán",
          "atributos": {
            "modelo": "iman"
          },
          "precio": 3400,
          "costo": null,
          "activo": true
        },
        {
          "sku": "LLAV-DEST",
          "nombre": "Destapador",
          "atributos": {
            "modelo": "destapador"
          },
          "precio": 3600,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "pines",
      "nombre": "Pines",
      "categoria": "souvenir",
      "modificadores": [],
      "variantes": [
        {
          "sku": "PIN-GDE",
          "nombre": "Redondo grande",
          "atributos": {
            "tamano": "grande"
          },
          "precio": 2300,
          "costo": null,
          "activo": true
        },
        {
          "sku": "PIN-CHI",
          "nombre": "Redondo chico",
          "atributos": {
            "tamano": "chico"
          },
          "precio": 1800,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "tazas",
      "nombre": "Taza sublimada",
      "categoria": "sublimado",
      "modificadores": [],
      "variantes": [
        {
          "sku": "TAZA-MAG",
          "nombre": "Mágica",
          "atributos": {
            "tipo": "magica"
          },
          "precio": 17000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "TAZA-CER",
          "nombre": "Cerámica",
          "atributos": {
            "tipo": "ceramica"
          },
          "precio": 14000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "TAZA-POL",
          "nombre": "Polietileno",
          "atributos": {
            "tipo": "polietileno"
          },
          "precio": 9500,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "copa_polimero",
      "nombre": "Copa de polímero",
      "categoria": "sublimado",
      "visible_web": false,
      "modificadores": [],
      "variantes": [
        {
          "sku": "COPA-POL",
          "nombre": "Copa de polímero",
          "atributos": {},
          "precio": 12000,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "kit_escolar",
      "nombre": "Kit escolar sublimado",
      "categoria": "sublimado",
      "visible_web": false,
      "modificadores": [],
      "variantes": [
        {
          "sku": "KIT-TAZA-CHI",
          "nombre": "Taza de polímero chica",
          "atributos": {},
          "precio": 9500,
          "costo": null,
          "activo": true
        },
        {
          "sku": "KIT-SET-TELA",
          "nombre": "Set de tela (toalla, servilleta, mantel)",
          "atributos": {},
          "precio": 20000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "KIT-PLATO",
          "nombre": "Plato",
          "atributos": {},
          "precio": 12000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "KIT-MOCHILA",
          "nombre": "Mochila",
          "atributos": {},
          "precio": 38000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "KIT-CUCHARA",
          "nombre": "Cuchara",
          "atributos": {},
          "precio": 2900,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "cantimplora",
      "nombre": "Cantimplora sublimada",
      "categoria": "sublimado",
      "visible_web": false,
      "modificadores": [],
      "variantes": [
        {
          "sku": "CANT-STD",
          "nombre": "Cantimplora",
          "atributos": {},
          "precio": null,
          "costo": null,
          "activo": false,
          "a_cotizar": true
        }
      ]
    },
    {
      "id": "fotos_profesionales",
      "nombre": "Fotos profesionales",
      "categoria": "servicio",
      "visible_web": false,
      "modificadores": [],
      "variantes": [
        {
          "sku": "PROF-PAPEL-15X21",
          "nombre": "En papel 15x21",
          "atributos": {
            "formato": "papel",
            "medida": "15x21"
          },
          "precio": 4000,
          "costo": null,
          "activo": true
        },
        {
          "sku": "PROF-DIG",
          "nombre": "Digital",
          "atributos": {
            "formato": "digital"
          },
          "precio": 3500,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "restauracion",
      "nombre": "Restauración de fotos",
      "categoria": "servicio",
      "visible_web": false,
      "modificadores": [],
      "variantes": [
        {
          "sku": "SERV-REST",
          "nombre": "Restauración",
          "atributos": {},
          "precio": 14000,
          "costo": null,
          "activo": true
        }
      ]
    },
    {
      "id": "presentes_combos",
      "nombre": "Presentes y combos",
      "categoria": "combo",
      "visible_web": false,
      "modificadores": [],
      "variantes": [
        {
          "sku": "COMBO-CUADRO-FOTO",
          "nombre": "Cuadro + foto con diseño personalizado",
          "atributos": {},
          "precio": null,
          "costo": null,
          "activo": false,
          "a_cotizar": true
        },
        {
          "sku": "COMBO-CUADRO-FOTO-LLAV",
          "nombre": "Cuadro + foto + llavero",
          "atributos": {},
          "precio": null,
          "costo": null,
          "activo": false,
          "a_cotizar": true
        }
      ]
    }
  ]
};

/* ═══════════════════════════════════════════════════════════════════
   EDICIÓN DE PRECIOS CON USUARIOS Y AUDITORÍA  (v4.3 · panel precios)
   ─────────────────────────────────────────────────────────────────
   Hojas nuevas (las crea setupAdmin()):
     • Usuarios:         usuario | contraseña | nombre | rol | activo
     • AuditoriaPrecios: Fecha | Usuario | Nombre | Tipo | SKU/ID |
                         Detalle | Campo | Valor anterior | Valor nuevo
   ═══════════════════════════════════════════════════════════════════ */

/* Verifica credenciales contra la hoja Usuarios. Devuelve el usuario o null. */
function verificarUsuario_(usuario, pass) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const h = ss.getSheetByName(CONFIG.HOJA_USUARIOS);
  if (!h || h.getLastRow() < 2) return null;
  const filas = h.getDataRange().getValues().slice(1);
  const u = String(usuario || '').trim().toLowerCase();
  const p = String(pass || '');
  for (const f of filas) {
    const fu = String(f[0] || '').trim().toLowerCase();
    const fp = String(f[1] == null ? '' : f[1]);
    if (fu && fu === u && fp === p && esVerdadero_(f[4])) {
      return { usuario: String(f[0]).trim(), nombre: String(f[2] || f[0]).trim(), rol: String(f[3] || 'editor').trim() };
    }
  }
  return null;
}

/* POST accion:'login' → { usuario, pass } */
function loginAdmin_(datos) {
  const u = verificarUsuario_(datos.usuario, datos.pass);
  if (!u) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  return { ok: true, nombre: u.nombre, rol: u.rol, usuario: u.usuario };
}

/* POST accion:'guardarPrecios' → { usuario, pass, cambios:[
     { tipo:'variante', sku, campo:'precio', valor:Number },
     { tipo:'modificador', id, campo:'valor', valor:Number }, ... ] }
   Revalida credenciales en cada guardado (sin sesión persistente). */
function guardarPreciosAdmin_(datos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = verificarUsuario_(datos.usuario, datos.pass);
    if (!user) return { ok: false, error: 'Sesión inválida. Volvé a iniciar sesión.' };

    const cambios = Array.isArray(datos.cambios) ? datos.cambios : [];
    if (!cambios.length) return { ok: false, error: 'No hay cambios para guardar.' };

    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    const hCat = ss.getSheetByName(CONFIG.HOJA_CATALOGO);
    const hMod = ss.getSheetByName(CONFIG.HOJA_MODIFICADORES);
    const hAud = obtenerHoja_(ss, CONFIG.HOJA_AUDITORIA);
    if (hAud.getLastRow() === 0) {
      hAud.appendRow(['Fecha', 'Usuario', 'Nombre', 'Tipo', 'SKU/ID', 'Detalle',
                      'Campo', 'Valor anterior', 'Valor nuevo']);
    }

    const catVals = hCat ? hCat.getDataRange().getValues() : [];
    const modVals = hMod ? hMod.getDataRange().getValues() : [];
    const fecha = new Date().toLocaleString('es-AR');
    const registros = [];   // filas de auditoría a agregar
    let aplicados = 0;
    const errores = [];

    cambios.forEach(c => {
      const nuevoNum = numeroONull_(c.valor);
      if (nuevoNum == null) { errores.push('Valor inválido en ' + (c.sku || c.id || '?')); return; }

      if (c.tipo === 'variante') {
        // Catalogo: sku en col índice 3, precio en col índice 6
        let rowIdx = -1;
        for (let i = 1; i < catVals.length; i++) {
          if (String(catVals[i][3]).trim() === String(c.sku).trim()) { rowIdx = i; break; }
        }
        if (rowIdx < 0) { errores.push('SKU no encontrado: ' + c.sku); return; }
        const anterior = catVals[rowIdx][6];
        if (numeroONull_(anterior) === nuevoNum) return; // sin cambio real
        hCat.getRange(rowIdx + 1, 7).setValue(nuevoNum);
        catVals[rowIdx][6] = nuevoNum;
        const detalle = String(catVals[rowIdx][1] || '') + ' · ' + String(catVals[rowIdx][4] || '');
        registros.push([fecha, user.usuario, user.nombre, 'Variante', c.sku, detalle,
                        'precio', anterior === '' || anterior == null ? '' : anterior, nuevoNum]);
        aplicados++;

      } else if (c.tipo === 'modificador') {
        // Modificadores: id en col índice 0, valor en col índice 4
        let rowIdx = -1;
        for (let i = 1; i < modVals.length; i++) {
          if (String(modVals[i][0]).trim() === String(c.id).trim()) { rowIdx = i; break; }
        }
        if (rowIdx < 0) { errores.push('Modificador no encontrado: ' + c.id); return; }
        const anterior = modVals[rowIdx][4];
        if (numeroONull_(anterior) === nuevoNum) return;
        hMod.getRange(rowIdx + 1, 5).setValue(nuevoNum);
        modVals[rowIdx][4] = nuevoNum;
        const detalle = String(modVals[rowIdx][1] || c.id);
        registros.push([fecha, user.usuario, user.nombre, 'Modificador', c.id, detalle,
                        'valor', anterior === '' || anterior == null ? '' : anterior, nuevoNum]);
        aplicados++;
      }
    });

    if (registros.length) {
      hAud.getRange(hAud.getLastRow() + 1, 1, registros.length, registros[0].length).setValues(registros);
    }
    return { ok: true, aplicados: aplicados, fecha: fecha, errores: errores };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/* Ejecutar UNA vez desde el editor: crea las hojas Usuarios y AuditoriaPrecios.
   No pisa datos existentes. Crea un usuario admin inicial (cambialo). */
function setupAdmin() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let hU = ss.getSheetByName(CONFIG.HOJA_USUARIOS);
  if (!hU) {
    hU = ss.insertSheet(CONFIG.HOJA_USUARIOS);
    hU.appendRow(['usuario', 'contraseña', 'nombre', 'rol', 'activo']);
    hU.appendRow(['marcelo', 'cambiar123', 'Marcelo', 'admin', 'SI']);
    hU.getRange(1, 1, 1, 5).setFontWeight('bold');
    hU.setFrozenRows(1);
  }

  let hA = ss.getSheetByName(CONFIG.HOJA_AUDITORIA);
  if (!hA) {
    hA = ss.insertSheet(CONFIG.HOJA_AUDITORIA);
    hA.appendRow(['Fecha', 'Usuario', 'Nombre', 'Tipo', 'SKU/ID', 'Detalle',
                  'Campo', 'Valor anterior', 'Valor nuevo']);
    hA.getRange(1, 1, 1, 9).setFontWeight('bold');
    hA.setFrozenRows(1);
  }

  SpreadsheetApp.getUi && SpreadsheetApp.getActive().toast('Listo: hojas Usuarios y AuditoriaPrecios creadas.', 'setupAdmin', 5);
}
