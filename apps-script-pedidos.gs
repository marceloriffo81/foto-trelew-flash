/**
 * TRELEWFLASH — Registro de pedidos en Google Sheets + Drive
 * ---------------------------------------------------------------
 * Este script recibe los pedidos que arma el cliente en la página,
 * los guarda en la hoja de cálculo, sube las fotos y diseños a una
 * carpeta de Drive y devuelve un número de pedido.
 *
 * Cómo usarlo: ver la guía "CONECTAR-HOJA.md".
 */

/* ====== CONFIGURACIÓN ====== */
const CONFIG = {
  PREFIJO_PEDIDO: "A-",          // los pedidos serán A-0001, A-0002, ...
  CARPETA_PADRE: "Pedidos Trelewflash", // carpeta en tu Drive donde se guarda todo
  HOJA: "Pedidos"                // nombre de la pestaña de la hoja de cálculo
};

/* ====== ENTRADA PRINCIPAL ====== */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita que dos pedidos simultáneos repitan número
  try {
    const datos = JSON.parse(e.postData.contents);
    const numero = siguienteNumero_();
    const carpeta = crearCarpetaPedido_(numero, datos.cliente);
    guardarImagenes_(carpeta, datos.items);
    agregarFila_(numero, datos, carpeta.getUrl());
    return json_({ ok: true, numero: numero, carpeta: carpeta.getUrl() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* Chequeo rápido: abrí la URL /exec en el navegador y debería responder OK. */
function doGet() {
  return json_({ ok: true, mensaje: "Servicio de pedidos Trelewflash activo." });
}

/* ====== NÚMERO CORRELATIVO ====== */
function siguienteNumero_() {
  const props = PropertiesService.getScriptProperties();
  const n = (parseInt(props.getProperty("ULTIMO_NUMERO"), 10) || 0) + 1;
  props.setProperty("ULTIMO_NUMERO", String(n));
  return CONFIG.PREFIJO_PEDIDO + ("0000" + n).slice(-4); // A-0001
}

/* ====== CARPETA EN DRIVE ====== */
function crearCarpetaPedido_(numero, cliente) {
  const it = DriveApp.getFoldersByName(CONFIG.CARPETA_PADRE);
  const padre = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.CARPETA_PADRE);
  const nombre = "Pedido " + numero + (cliente && cliente.nombre ? " - " + cliente.nombre : "");
  return padre.createFolder(nombre);
}

/* ====== GUARDAR IMÁGENES ====== */
function guardarImagenes_(carpeta, items) {
  (items || []).forEach(function (item, idx) {
    (item.imagenes || []).forEach(function (img, k) {
      try {
        const partes = String(img.url).split(",");
        const cab = partes[0] || "";
        const mime = (cab.match(/data:([^;]+);/) || [])[1] || "image/jpeg";
        const bytes = Utilities.base64Decode(partes[1] || "");
        const nombre = (idx + 1) + "-" + (img.name || ("foto-" + (k + 1) + ".jpg"));
        carpeta.createFile(Utilities.newBlob(bytes, mime, nombre));
      } catch (err) {
        // si una imagen falla, seguimos con las demás
      }
    });
  });
}

/* ====== FILA EN LA HOJA ====== */
function agregarFila_(numero, datos, urlCarpeta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(CONFIG.HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.HOJA);
    hoja.appendRow(["Fecha", "N° Pedido", "Cliente", "WhatsApp", "Email",
                    "Pedido (detalle)", "Total estimado", "A cotizar", "Carpeta de imágenes"]);
  }
  const cliente = datos.cliente || {};
  const detalle = (datos.items || []).map(function (it, i) {
    return (i + 1) + ") " + it.desc + " — " + it.detalle + " — $" + it.subtotal;
  }).join("\n");

  hoja.appendRow([
    new Date(),
    numero,
    cliente.nombre || "",
    cliente.telefono || "",
    cliente.email || "",
    detalle,
    datos.total || 0,
    datos.aCotizar ? "Sí" : "No",
    urlCarpeta
  ]);
}

/* ====== RESPUESTA JSON ====== */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
