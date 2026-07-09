# Trelew Flash — Despliegue app v4.3 + catálogo v2

## Entregables

| Archivo | Qué es |
|---|---|
| `foto-trelew-flash-v4_3.html` | La app de pedidos, ahora leyendo TODO del catálogo (precios, medidas, souvenirs, tazas, modificadores). Catálogo v2 embebido + refresco remoto desde la hoja. |
| `catalogo_precios_v2.json` | Catálogo maestro: 13 productos, 51 variantes con SKU, 5 modificadores. Fuente de verdad para app, hoja y futura API. |
| `apps-script-pedidos-v2.gs` | Backend en la hoja: registra pedidos (cabecera + ítems), guarda imágenes en Drive y sirve el catálogo por GET. |
| `README-despliegue-v4_3.md` | Este documento. |

---

## Decisiones tomadas (y cómo revertirlas)

1. **Retoque ahora se cobra POR FOTO, no por copia.** Antes: `(base + retoque) × copias`. Ahora: `base × copias + retoque × nº de fotos adjuntas` (mínimo 1 por ítem con retoque). Solo cambia el caso "sin adjuntos con cantidad > 1", a favor del cliente y más coherente (el trabajo de retoque se hace una vez por foto, no por copia).
   **Para revertir:** en la pestaña `Modificadores`, fila `retoque`, cambiar `ambito` de `por_foto` a `por_copia`. Nada más.
2. **En collage, el retoque se cobra 1 vez por diseño** (override `por_diseno` definido en el producto collage del catálogo).
3. **El imán es una variante propia** (producto `foto_iman`, SKUs `IMAN-{MEDIDA}`), no un recargo. El checkbox de la app resuelve al SKU imán y ese precio REEMPLAZA al de la foto. Se incorporó `IMAN-9X13` ($3.400) que estaba en la app pero no en el catálogo v1.
4. **Pines agregados a la web:** `PIN-GDE` $2.300 y `PIN-CHI` $1.800.
5. **Campo `costo` en null en todas las variantes** (pendiente de carga real — no publicar datos de costos sin verificar).
6. **`visible_web: false`** para: kit escolar, copa, cantimplora, fotos profesionales, restauración y combos. Existen en el catálogo (y en la hoja) pero la app no los muestra todavía.

---

## Pasos de despliegue

### 1. Apps Script (mismo proyecto, MISMA URL)
1. Abrí la hoja **"pedidos trelewflash"** → Extensiones → Apps Script.
2. Reemplazá TODO el código por el contenido de `apps-script-pedidos-v2.gs`.
3. Ejecutá una vez la función **`setup()`** (autorizá permisos). Esto:
   - agrega la columna `Estado` a `Pedidos`,
   - crea las pestañas `Items`, `Catalogo` y `Modificadores`,
   - puebla `Catalogo` y `Modificadores` con el catálogo v2.
4. **Implementar → Administrar implementaciones → ✏️ editar → Versión: Nueva → Implementar.**
   ⚠️ NO crear una implementación nueva: editando la existente se mantiene la URL que ya tiene la app. Acceso: "Cualquier persona".

### 2. Publicar la app
Subí `foto-trelew-flash-v4_3.html` donde está publicada la v4.2 (mismo hosting). No hay que tocar nada más: la URL del Apps Script no cambió.

### 3. Editar precios de acá en más
- **Precios y variantes:** pestaña `Catalogo` (columna `precio`; `activo`/`visible_web` con SI/NO).
- **Retoque, texto, armado de collage, etc.:** pestaña `Modificadores` (columna `valor`).
- La app carga el catálogo remoto al abrir (`?accion=catalogo`, timeout 5 s). Si falla, usa el embebido. Los cambios en la hoja impactan sin republicar el HTML.
- Si cambiás precios seguido, cada tanto conviene regenerar el HTML con el catálogo actualizado embebido (para que el fallback no quede viejo).

---

## Estructura de pestañas

**Pedidos** (cabecera, formato histórico + Estado):
`Fecha | N° Pedido | Cliente | WhatsApp | Email | Pedido | Total estimado | A cotizar | Carpeta de imágenes | Estado`

**Items** (una fila por ítem del pedido):
`N° Pedido | Fecha | SKU | Producto | Variante | Cantidad | Precio unit. | Modificadores | Monto modif. | Subtotal | A cotizar`

**Catalogo**:
`producto_id | producto | categoria | sku | variante | atributos(json) | precio | costo | activo | a_cotizar | visible_web | render(json) | modificadores(ids separados por coma)`

**Modificadores**:
`id | nombre | tipo(fijo|porcentaje) | ambito(por_copia|por_foto|por_diseno) | valor | incluidas | notas`

---

## Contrato del payload (base del futuro `POST /pedidos` de FastAPI)

```json
{
  "version": "4.3",
  "moneda": "ARS",
  "catalogo_version": "2.0",
  "fecha": "9/7/2026, 14:30:00",
  "cliente": { "nombre": "...", "whatsapp": "...", "email": "..." },
  "total": 12345,
  "aCotizar": false,
  "items": [
    {
      "sku": "REV-10X15-EST",
      "producto": "Revelado de fotos",
      "variante": "10x15 estándar",
      "cantidad": 3,
      "precio_unit": 900,
      "modificadores": [
        { "id": "retoque", "cantidad": 2, "monto": 23000 }
      ],
      "monto_modificadores": 23000,
      "subtotal": 25700,
      "tipo": "foto", "desc": "...", "detalle": "...", "aCotizar": false,
      "imagenes": [ { "name": "...", "url": "data:image/jpeg;base64,..." } ]
    }
  ]
}
```

Los campos `tipo/desc/detalle` se mantienen por compatibilidad con la v4.2. Cuando migres a FastAPI: mismo JSON + `comercio_id` (multi-tenant desde el día uno) y las imágenes pasan a subirse como multipart, no dataURL.

---

## Qué cambió en el HTML (resumen técnico)

- `CATALOGO_V2` embebido + capa de acceso (`producto()`, `mod()`, `modDeProducto()` con override de ámbito, `varianteIman()`, `montoMods()`).
- `CATALOGO_FOTOS`, `CATALOGO_SOUVENIRS` y `TIPOS_TAZA` ahora se **derivan** del catálogo (`construirCatalogosUI()`), cada ítem con su `sku`.
- Todas las etiquetas de precios de la UI (`+$300`, `$11.500`, "5 incluidas"…) son spans que se pintan desde el catálogo.
- Motor de precios reescrito: retoque según ámbito del catálogo, imán resuelto a SKU, collage con armado + fotos extra como modificadores.
- Carrito y payload enriquecidos con `sku / producto / variante / precio_unit / modificadores / monto_modificadores` (superset compatible con v4.2).
- Al abrir: `actualizarEtiquetasPrecios()` + `cargarCatalogoRemoto()` (fetch con timeout 5 s y fallback silencioso).
