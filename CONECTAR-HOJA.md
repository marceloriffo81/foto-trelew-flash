# Conectar la página con Google Sheets

Guía para que cada pedido se registre solo en una hoja de cálculo, se guarden las fotos y los diseños en Drive, y el cliente reciba un **número de pedido** en su mensaje de WhatsApp.

Tiempo estimado: 15 minutos. No hace falta saber programar, solo copiar y pegar.

---

## 1. Crear la hoja de cálculo

1. Entrá a [sheets.google.com](https://sheets.google.com) con tu cuenta de Google.
2. Creá una hoja nueva y ponele de nombre, por ejemplo, **Pedidos Trelewflash**.

## 2. Pegar el código

1. En esa misma hoja, andá al menú **Extensiones → Apps Script**.
2. Se abre un editor. Borrá todo lo que aparezca en el archivo `Código.gs`.
3. Abrí el archivo **`apps-script-pedidos.gs`** (está en esta misma carpeta), copiá **todo** su contenido y pegalo ahí.
4. Tocá el ícono de **guardar** (💾).

## 3. Publicar el servicio (Deploy)

1. Arriba a la derecha, tocá **Implementar → Nueva implementación**.
2. En el engranaje ⚙ (Seleccionar tipo), elegí **Aplicación web**.
3. Completá:
   - **Descripción:** Pedidos Trelewflash
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** **Cualquier persona**
4. Tocá **Implementar**.
5. La primera vez te va a pedir **autorizar permisos**: aceptá con tu cuenta. Si aparece "Google no verificó esta app", entrá en **Configuración avanzada → Ir a (nombre) (no seguro)** y continuá. Es tu propio script, es seguro.
6. Al terminar te da una **URL** que termina en `/exec`. **Copiala.**

> Para probar que quedó bien: pegá esa URL en el navegador. Debería mostrar `{"ok":true,"mensaje":"Servicio de pedidos Trelewflash activo."}`.

## 4. Pegar la URL en la página

1. Abrí el archivo **`foto-trelew-flash-v4.2.html`**.
2. Cerca del principio del código vas a encontrar esta línea:

   ```js
   const PEDIDOS_URL = "";
   ```

3. Pegá tu URL entre las comillas:

   ```js
   const PEDIDOS_URL = "https://script.google.com/macros/s/AKfyc.../exec";
   ```

4. Guardá el archivo.

**Listo.** Desde ahora, cuando un cliente toca "Enviar pedido":

- el pedido se registra como una fila nueva en la hoja,
- las fotos y los diseños (taza, collage) se suben a una carpeta `Pedido A-0001` dentro de una carpeta **Pedidos Trelewflash** en tu Drive,
- y el cliente ve su **N° de pedido** y un mensaje de WhatsApp ya armado, con el número y el link a esa carpeta.

---

## Cómo trabajan ustedes

Cada pedido aparece en la hoja con: fecha, N° de pedido, cliente, WhatsApp, email, detalle, total y el **link a la carpeta** con todas las imágenes. Cruzás el número que te llega por WhatsApp con la fila de la hoja y tenés todo junto.

## Cosas para tener en cuenta

- **La carpeta de imágenes es privada** (solo vos, dueño del Drive, la ves). El link del mensaje sirve para que **ustedes** lo abran desde su cuenta. Si querés que el cliente también pueda verla, es un ajuste aparte (avisame).
- **Si cambiás el código del script**, tenés que volver a **Implementar → Administrar implementaciones → Editar (lápiz) → Nueva versión**, para que los cambios tomen efecto. La URL se mantiene.
- **Para la prueba**, cargá pedidos con pocas fotos (2 o 3). Muchas fotos de alta resolución hacen el envío más lento.
- Si la línea `PEDIDOS_URL` queda vacía, la página igual funciona: manda el pedido por WhatsApp pero **sin** número ni carpeta (las fotos se adjuntan a mano en el chat).
