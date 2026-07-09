/* ============================================================
   Foto Trelew Flash · v4.3 — Datos compartidos (modo DEMO)
   - CATALOGO: copia embebida del catálogo canónico
     (assets/catalogo_precios.json). Fuente única de precios.
     Ningún precio se tipea a mano en los paneles: todo sale de acá.
   - Datos de ejemplo (fotógrafos, eventos, pedidos, ventas)
     para navegar los paneles sin backend.
   Reemplazar CATALOGO por fetch('/api/catalogo') y los arrays
   demo por llamadas al API v4.3 cuando el backend esté vivo.
   ============================================================ */

const CATALOGO = {
  meta: { version: "1.0", moneda: "ARS", vigencia_confirmada: false,
    fecha_extraccion: "2026-07-06" },
  revelado_fotos: {
    "5x7": 1100, "7x10": 1100, "7x10_polaroid": 1100, "9x13": 1300,
    "9x13_polaroid": 1300, "10x15": 1400, "13x18": 1500, "15x21": 1800,
    "20x30": 7000, "30x40": 14500
  },
  fotos_profesionales: { papel_15x21: 4000, digital: 3500 },
  servicios: {
    retoque_adicional: 11500, restauracion: 14000,
    collage: { fee_diseno_unico: 11500, fotos_incluidas: 5, precio_foto_extra: null }
  },
  sublimados: {
    tazas: { magica: 17000, ceramica_comun: 14000, polietileno: 9500 },
    kit_escolar: { taza_polimero_chica: 9500, set_tela_toalla_servilleta_mantel: 20000,
      plato: 12000, mochila: 38000, cuchara: 2900 },
    copa_polimero: 12000, cantimplora: null
  },
  souvenirs: {
    llaveros: { acrilico_rectangular: 3000, acrilico_redondo: 2700, redondo: 3400,
      iman: 3400, destapador: 3600 },
    fotos_tarjetas: {
      "5x7": { simple: 1500, con_iman: 2900 }, "7x10": { simple: 1500, con_iman: 2900 },
      "10x15": { simple: 2000, con_iman: 4000 }, "13x18": { simple: 2900, con_iman: 5500 },
      "15x21": { simple: 3500, con_iman: 6500 }
    },
    pines: { redondo_grande: 2300, redondo_chico: 1800 }
  }
};

// ---- Formato de moneda ARS ----
function ars(n) {
  if (n === null || n === undefined) return "—";
  return "$" + Number(n).toLocaleString("es-AR");
}
function nombreBonito(k){
  return k.replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase());
}

// ---- Tarifas de fotos de eventos (las fija el administrador) ----
// Derivan del catálogo canónico (fotos_profesionales).
const TARIFAS_EVENTO = {
  digital:     CATALOGO.fotos_profesionales.digital,      // 3500
  papel_15x21: CATALOGO.fotos_profesionales.papel_15x21,  // 4000
};
const COMISION_CASA = 0.30; // 30% casa / 70% fotógrafo (config. por fotógrafo)

// ---- Fotógrafos (demo) ----
const FOTOGRAFOS = [
  { id:"F-01", nombre:"Lucía Fernández", email:"lucia.fp@gmail.com", tel:"+54 9 280 415-2233",
    estado:"activo", mp:true, comision:30, ventas:184, monto:642000, alta:"2026-03-11" },
  { id:"F-02", nombre:"Diego Sosa", email:"diegososafoto@gmail.com", tel:"+54 9 280 466-8890",
    estado:"activo", mp:true, comision:25, ventas:97, monto:351500, alta:"2026-04-02" },
  { id:"F-03", nombre:"Carla Ibáñez", email:"carla.ibanez.ph@gmail.com", tel:"+54 9 280 431-7712",
    estado:"pendiente", mp:false, comision:30, ventas:0, monto:0, alta:"2026-07-04" },
  { id:"F-04", nombre:"Martín Quiroga", email:"mquiroga.foto@gmail.com", tel:"+54 9 280 402-5561",
    estado:"activo", mp:false, comision:30, ventas:41, monto:147000, alta:"2026-05-19" },
  { id:"F-05", nombre:"Sofía Ramírez", email:"sofiram.fotos@gmail.com", tel:"+54 9 280 448-1024",
    estado:"suspendido", mp:true, comision:30, ventas:12, monto:44500, alta:"2026-02-28" },
];

// ---- Eventos sociales (demo) ----
const EVENTOS = [
  { id:"E-118", titulo:"Muestra Anual Academia Danzas del Valle", tipo:"danzas",
    fotografo:"Lucía Fernández", fecha:"2026-06-28", fotos:214, estado:"publicado",
    visibilidad:"privado", codigo:"DANZA28", ventas:96, consent:true },
  { id:"E-121", titulo:"Acto 9 de Julio — Esc. N°112", tipo:"actos escolares",
    fotografo:"Diego Sosa", fecha:"2026-07-03", fotos:158, estado:"pendiente",
    visibilidad:"privado", codigo:"ACTO112", ventas:0, consent:true },
  { id:"E-122", titulo:"Bautismo Benjamín", tipo:"bautismos",
    fotografo:"Martín Quiroga", fecha:"2026-07-01", fotos:63, estado:"pendiente",
    visibilidad:"privado", codigo:"BENJA01", ventas:0, consent:false },
  { id:"E-109", titulo:"Casamiento Paz & Rodrigo", tipo:"casamientos",
    fotografo:"Lucía Fernández", fecha:"2026-05-24", fotos:302, estado:"publicado",
    visibilidad:"publico", codigo:"PAZRODRI", ventas:141, consent:true },
  { id:"E-115", titulo:"Cierre de Talleres Municipales", tipo:"otros",
    fotografo:"Diego Sosa", fecha:"2026-06-14", fotos:88, estado:"observado",
    visibilidad:"privado", codigo:"TALLER14", ventas:0, consent:true },
];

// ---- Pedidos de laboratorio (demo) ----
const PEDIDOS = [
  { id:"#2041", cliente:"Ana Torres", items:"2× Taza mágica, 1× Collage", total:45500, estado:"en cola",   fecha:"06/07" },
  { id:"#2040", cliente:"Jorge Núñez", items:"10× Revelado 10x15",         total:14000, estado:"en cola",   fecha:"06/07" },
  { id:"#2039", cliente:"Familia Ríos", items:"1× Cuadro 30x40",            total:14500, estado:"en edición",fecha:"05/07" },
  { id:"#2038", cliente:"Paula Vega", items:"5× Llavero acrílico, 2× Pin",  total:19100, estado:"en impresión",fecha:"05/07" },
  { id:"#2037", cliente:"Escuela N°44", items:"30× Foto tarjeta 10x15 c/imán",total:120000,estado:"listo",    fecha:"04/07" },
  { id:"#2036", cliente:"Marta Gil", items:"1× Restauración",               total:14000, estado:"entregado", fecha:"03/07" },
];
const ETAPAS_PEDIDO = ["en cola","en edición","en impresión","listo","entregado"];

// ---- Ventas de fotos (demo, para reportes / liquidaciones) ----
const VENTAS_FOTO = [
  { id:"V-9051", fecha:"06/07", evento:"Muestra Anual Danzas", foto:"IMG_0421", tipo:"digital",     precio:3500, fotografo:"Lucía Fernández" },
  { id:"V-9050", fecha:"06/07", evento:"Casamiento Paz & Rodrigo", foto:"IMG_1187", tipo:"papel_15x21", precio:4000, fotografo:"Lucía Fernández" },
  { id:"V-9049", fecha:"05/07", evento:"Muestra Anual Danzas", foto:"IMG_0388", tipo:"digital",     precio:3500, fotografo:"Lucía Fernández" },
  { id:"V-9048", fecha:"05/07", evento:"Cierre Talleres", foto:"IMG_2210", tipo:"digital",         precio:3500, fotografo:"Diego Sosa" },
];

// ---- Clientes (demo) ----
const CLIENTES = [
  { nombre:"Ana Torres", tel:"+54 9 280 415-9080", compras:7, total:128400, ultima:"06/07/2026" },
  { nombre:"Escuela N°44", tel:"+54 9 280 400-1122", compras:3, total:342000, ultima:"04/07/2026" },
  { nombre:"Familia Ríos", tel:"+54 9 280 466-3344", compras:12, total:210500, ultima:"05/07/2026" },
  { nombre:"Paula Vega", tel:"+54 9 280 431-5566", compras:5, total:76300, ultima:"05/07/2026" },
];

// ---- Auditoría (demo) ----
const AUDITORIA = [
  { fecha:"06/07 14:22", admin:"Marcelo", accion:"Publicó evento E-118 (Muestra Anual Danzas)" },
  { fecha:"06/07 11:05", admin:"Marcelo", accion:"Cambió tarifa foto digital: $3.200 → $3.500" },
  { fecha:"05/07 18:40", admin:"Marcelo", accion:"Ajustó comisión de Diego Sosa: 30% → 25%" },
  { fecha:"05/07 09:12", admin:"Empleado: Rita", accion:"Marcó pedido #2036 como entregado" },
  { fecha:"04/07 16:33", admin:"Marcelo", accion:"Aprobó registro de fotógrafo F-04 (Martín Quiroga)" },
];

function estadoChip(estado){
  const map = {
    "activo":"ok","publicado":"ok","listo":"ok","entregado":"ok",
    "pendiente":"warn","en cola":"warn","observado":"warn",
    "en edición":"info","en impresión":"info",
    "suspendido":"dang","rechazado":"dang",
  };
  return map[estado] || "mut";
}
