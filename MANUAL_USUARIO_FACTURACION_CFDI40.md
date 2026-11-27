# Manual de Usuario: Módulo de Facturación Electrónica CFDI 4.0

**Sistema Xenon ERP***Versión del Documento: 2.0 — Noviembre 2026Autor: Equipo de Desarrollo y Soporte Xenon*


---

## 1. Introducción y Objetivo

El presente manual tiene como objetivo guiar al personal administrativo, facturistas, agentes y contadores en el uso del **Módulo de Facturación Electrónica** del sistema Xenon.

El sistema se encuentra homologado con la versión **CFDI 4.0** del Servicio de Administración Tributaria (SAT) e integrado con el Proveedor Autorizado de Certificación (**PAC CUCC**), permitiendo timbrar, cancelar, controlar cobranza, emitir facturas globales y generar complementos de pago en tiempo real con plena validez fiscal y asignación dinámica de **Series y Folios**.



---

## 2. Configuración del Perfil Fiscal del Emisor

**Ruta en el sistema:** `Menú Principal > Facturación > Perfil Fiscal` (`/app/facturacion/perfil-fiscal`)




Antes de emitir comprobantes fiscales, la empresa debe contar con su perfil configurado y sus sellos digitales validados. La pantalla de Perfil Fiscal se divide en 3 pestañas principales:

### 2.1 Pestaña 1: Datos Fiscales del Contribuyente




En esta sección se capturan los datos de identificación oficial de la empresa:


1. **RFC Emisor:** Registro Federal de Contribuyentes (12 caracteres para personas morales o 13 para personas físicas).
1. **Razón Social / Nombre Emisor:** Debe capturarse exactamente como aparece en la *Cédula de Identificación Fiscal / Constancia de Situación Fiscal* del SAT, en mayúsculas y sin incluir el régimen societario (por ejemplo: `EMPRESA DEMO` en lugar de `EMPRESA DEMO S.A. DE C.V.`).
1. **Régimen Fiscal:** Clave oficial del SAT (por ejemplo: `601 - General de Ley Personas Morales`, `612 - Personas Físicas con Actividades Empresariales y Profesionales`, o `626 - Régimen Simplificado de Confianza`).
1. **Código Postal del Domicilio Fiscal:** Código postal de 5 dígitos registrado ante el SAT.
1. **Usuario SOAP PAC y Contraseña PAC:** Credenciales operativas asignadas por el PAC CUCC para el timbrado de facturas.
1. **Botón "Probar Conexión con CUCC":** Permite comprobar de inmediato que las credenciales y la comunicación con el PAC son válidas sin consumir timbres.
1. **Botón "Guardar Perfil Fiscal":** Almacena de forma segura los cambios en la base de datos con cifrado AES-256.


**Nota de Seguridad:** Los parámetros técnicos avanzados (URLs de servicios SOAP/REST, Client ID, Client Secret y Ambiente de Operación) son gestionados y protegidos exclusivamente por el personal de Soporte Técnico Isotech para garantizar la seguridad del emisor.


---

### 2.2 Pestaña 2: Certificados de Sello Digital (CSD)



Para que el SAT acepte los comprobantes, deben estar firmados digitalmente por un Certificado de Sello Digital (CSD).


**Importante:** El CSD es diferente a la FIEL (e.firma). La FIEL es para trámites ante el SAT; el CSD está destinado exclusivamente a la expedición de facturas.


#### Pasos para cargar el CSD:

1. Haz clic en la pestaña **CSD & Logo**.
1. En el recuadro **Seleccionar Archivo .CER**, sube el archivo con extensión `.cer` emitido por el SAT.
1. En el recuadro **Seleccionar Archivo .KEY**, sube la llave privada con extensión `.key`.
1. En el campo **Contraseña CSD**, escribe la clave que definiste al tramitar tus sellos ante el SAT.
1. Haz clic en **"Subir y Validar CSD en CUCC"**.
1. El sistema validará la vigencia, correspondencia de la llave y transmitirá el certificado al PAC. Al finalizar, verás un indicador verde de **CSD Cargado Activo en CUCC**.



---

### 2.3 Pestaña 3: Control de Series y Folios Fiscales


Permite definir y organizar las distintas series de comprobantes y sus consecutivos numéricos:

- **Serie:** Letra o clave identificadora (por ejemplo: `A` para facturación general con folio histórico alto, `F` para facturas individuales estándar, `P` o `PAGO` para complementos de recepción de pagos REP).
- **Folio Siguiente:** Número consecutivo que se reservará y asignará al siguiente comprobante que se timbre bajo esa serie (ej. `30208` para Serie `A`, `3` para Serie `F`).
- **Guardar Series y Folios:** Al pulsar este botón se sincronizan los números consecutivos en el sistema.



---

## 3. Emisión de Facturas Individuales (CFDI 4.0)

El sistema cuenta con **dos puntos de acceso** para emitir facturas individuales de pedidos:

---

| Paso | Opción 1: Pedidos Enviados (`/app/pedidos`) | Opción 2: Facturación Emitir (`/app/facturacion/emitir`) |
| --- | --- | --- |
| **Punto de Inicio** | Pestaña *Pedidos Enviados* (Botón verde de factura en acciones) | Módulo *Emitir Factura* (Botón preparar en listado mensual) |
| **Métodos Disponibles** | Contado (**PUE**) directo | Contado (**PUE**) o Crédito (**PPD** con días de crédito) |
| **Selección de Serie** | Menú **Serie Fiscal** (`Serie A #30208`, `Serie F #3`, etc.) | Menú **Serie Fiscal** (`Serie A #30208`, `Serie F #3`, etc.) |
| **Folio Consecutivo** | Vista previa automática del folio siguiente a asignar | Vista previa automática del folio siguiente a asignar |
| **Timbrado PAC** | Timbrado con PAC CUCC y descarga de PDF / XML | Timbrado con PAC CUCC y descarga de PDF / XML |

---


### 3.1 Opción A: Facturación desde la Vista de "Pedidos Enviados"


**Ruta en el sistema:** `Menú Principal > Pedidos > Pestaña "Pedidos Enviados"`(`/app/pedidos`)



Esta opción está diseñada para facturar de forma ágil pedidos que acaban de ser enviados sin necesidad de trasladarse al módulo contable, permitiendo elegir si la operación es de Contado (PUE) o a Crédito (PPD):

1. **Localizar el Pedido:**
    - En la tabla de Pedidos Enviados, ubica el pedido por su número de folio (ej. `#29964`), cliente o guía de mensajería.
1. **Abrir la Preparación de Factura:**
    - En la columna **Acciones** (a la derecha de la fila), los usuarios con rol administrativo disponen de un botón verde con el icono de factura (`request_quote` / billete con `$`).
    - Haz clic en el botón verde. Se abrirá la ventana modal **"Preparar factura del pedido"**.
1. **Seleccionar la Serie Fiscal:**
    - En la parte superior del modal, dentro de la sección **"Comprobante y Serie Fiscal"**, selecciona la serie en el menú desplegable:
        - `Serie A (Folio siguiente: #30208)`
        - `Serie F (Folio siguiente: #3)`
    - El campo **"Folio Fiscal a Asignar"** mostrará de inmediato el folio que el PAC reservará al timbrar.


1. **Revisar Datos del Receptor:**
    - Si el pedido tiene un cliente registrado con datos fiscales, el sistema los autocompleta.
    - De lo contrario, captura o verifica: RFC, Razón Social (sin régimen societario), Código Postal (5 dígitos), Tipo de Persona (Física/Moral), Uso CFDI y Régimen Fiscal.
1. **Verificar Origen de los Productos (Pedimentos SAT):**
    - En la sección **"Productos del pedido"**, indica si cada producto es **Nacional** o **Importado**.
    - Para productos importados, selecciona el **Número de Pedimento** correspondiente.


1. **Guardar y Timbrar:**
    - Haz clic en **"Guardar datos de facturación"** para registrar la preparación.
    - Haz clic en **"Timbrar en sandbox"** (modo pruebas) o **"Timbrar CFDI real"** (modo producción).
    - En unos segundos, el sistema mostrará la confirmación con el UUID asignado por el SAT y los enlaces directos para **Descargar PDF** y **Descargar XML**.




---

### 3.2 Opción B: Facturación desde el Módulo "Facturación → Emitir"

**Ruta en el sistema:** `Menú Principal > Facturación > Emitir`(`/app/facturacion/emitir`)


Esta opción está diseñada para el departamento de facturación y cobranza, permitiendo emitir tanto facturas de contado (**PUE**) como a crédito (**PPD**):

1. **Filtros de Búsqueda:**
    - Filtra los pedidos por Mes, Año, Estatus (*Enviado*, *Entregado* o *Todos*) y Estado de Preparación (*Pendiente*, *Sin preparar* o *Todos*).
1. **Diferencias entre PUE y PPD:**
    - **Factura PUE (Contado):** Se liquida al momento o en el mes. Permite elegir la Forma de Pago (`01 Efectivo`, `03 Transferencia`, etc.).
    - **Factura PPD (Crédito):** Se emite exclusivamente desde esta pantalla. Fija la forma de pago en `99 Por Definir` y solicita capturar los **Días de crédito** (ej. 30 días) y las **Condiciones de pago**. Al cobrarse posteriormente, requerirá un Complemento de Pago (REP).
1. **Selección de Serie y Timbrado:**
    - Al igual que en la opción A, podrás elegir la **Serie Fiscal** (`A`, `F`, etc.) y timbrar el CFDI.



---

## 4. Facturación Global a Público en General

**Ruta en el sistema:** `Menú Principal > Facturación > Facturas Emitidas` (`/app/facturacion/facturas-emitidas`)



Permite consolidar en un solo comprobante fiscal todas las ventas de mostrador del mes o período que no fueron facturadas individualmente:

1. Haz clic en el botón superior **"Facturar Ventas a Público en General"** (ícono de grupo).
1. Se abrirá la ventana con el resumen de pedidos del período, importe acumulado, IVA trasladado y total estimado.
1. **Configurar los Parámetros SAT:**
    - **Serie Fiscal:** Selecciona la serie bajo la cual se timbrará la factura global (ej. Serie `A`, `F` o `GLO`). El selector indicará el folio consecutivo correspondiente.
    - **Periodicidad:** `04 - Mensual (Recomendado)`, `01 - Diario`, etc.
    - **Mes y Año del Ejercicio:** Selecciona el período fiscal correspondiente.
    - **Forma de Pago:** Forma predominante de las ventas (ej. `01 Efectivo`, `03 Transferencia`). El método de pago es siempre **PUE** por regla SAT.
1. **Selección de Ventas:**
    - Marca o desmarca pedidos de la lista según lo requieras.
1. **Confirmar Emisión:**
    - Haz clic en **"Emitir Factura Global Ahora"**. El sistema generará el CFDI 4.0 con el RFC genérico `XAXX010101000` y el nodo oficial de información global.


---

## 5. Recepción de Pagos y Complementos REP (CFDI 4.0 / REP 2.0)

**Ruta en el sistema:** `Menú Principal > Facturación > Pagos` (`/app/facturacion/pagos`)



5.1 Pestaña 1: Nueva Recepción de Pago (Emisión de REP 2.0)

1. **Paso 1: Buscar Cliente:**
    - Escribe el nombre o RFC del cliente para cargar sus facturas PPD con saldo pendiente.
1. **Paso 2: Información del Pago:**
    - **Serie Fiscal (REP):** Selecciona la serie asignada a pagos (por ejemplo, **Serie P** o **Serie PAGO**). El sistema mostrará el folio siguiente disponible.
    - **Fecha y Hora de Pago:** Momento exacto del ingreso bancario.
    - **Forma de Pago SAT:** `03 Transferencia`, `02 Cheque`, `01 Efectivo`, etc.
    - **Datos Bancarios:** Cuenta de la empresa donde se recibió el abono y datos ordenantes si aplica.
1. **Paso 3: Facturas Relacionadas (DoctoRelacionado):**
    - Selecciona la factura a abonar y pulsa **"Agregar Factura"**.
    - Ingresa el monto a abonar en el campo **Importe Abono** o pulsa **"Liquidar"** para cubrir el saldo total.
    - El sistema calcula en vivo el nuevo saldo insoluto y el desglose proporcional de IVA trasladado (TrasladoDR).
1. **Registro y Timbrado:**
    - **Guardar Pago (Sin timbrar):** Registra el abono en el sistema administrativo para aplicar saldos sin enviar al SAT.
    - **Registrar y Timbrar REP Ahora:** Aplica el abono y timbra de inmediato el Recibo Electrónico de Pago con la serie y folio elegidos.

### 5.2 Pestaña 2: Abonos a Capital y Saldos a Favor (Gestión de Anticipos)


Administración de depósitos anticipados de clientes, balances disponibles e historial de aplicaciones a facturas de crédito (PPD):

1. **Saldo Total Acumulado:** Fondo global disponible de anticipos para liquidar facturas (ej. $99,650.00).
1. **Clientes con Saldo a Favor:** Cantidad de clientes con balance positivo activo mayor a $0.
1. **Botón "+ Registrar Nuevo Abono":** Permite capturar un nuevo depósito anticipado indicando el cliente, monto abonado, fecha y hora del ingreso, forma de pago SAT (03 Transferencia, 01 Efectivo, etc.), cuenta bancaria destino y nota o referencia.
1. **Tabla de Gestión por Cliente:** Despliega la bitácora histórica donde se audita cada movimiento del saldo (depósitos registrados, aplicaciones a facturas PPD, usuario responsable, fecha y saldo restante). Acceso rápido para añadir un nuevo depósito directo al cliente seleccionado. Traslada de inmediato a la pantalla de Nueva Recepción de Pago precargando al cliente para aplicar su saldo disponible contra facturas PPD vigentes utilizando la figura fiscal de compensación (Clave SAT 17).

### 5.3 Pestaña 3: Historial de Pagos y REP


Repositorio centralizado de auditoría, timbrado y consulta de todos los cobros y recepciones de pago registradas en el sistema:

1. **Folio:** Consecutivo numérico interno del cobro (ej. \#1, \#2).
1. **Fecha Pago:** Momento exacto en que ingresó el cobro bancario o en efectivo.
1. **Cliente y RFC:** Razón social y clave fiscal del receptor.
1. **Forma Pago:** Clave SAT utilizada (01 Efectivo, 03 Transferencia, 17 Compensación, etc.).
1. **Monto Cobrado:** Importe total del abono recibido.
1. **Facturas Abonadas:** Detalle de las facturas liquidadas o amortizadas con su número de parcialidad (ej. F2 (P.1): $100.00, F2 (P.2): $250.00).
1. **Estado del Complemento REP:**
    - **Timbrado (Badge Verde):** Muestra la serie y folio del recibo electrónico (ej. Timbrado P1, Timbrado P2) junto con su UUID fiscal SAT asignado.
    - **Pendiente de Timbrar:** Si el cobro se guardó inicialmente de forma administrativa, permite certificarlo en cualquier momento pulsando sobre el registro.
    - **Diagnóstico de Errores:** Si el PAC CUCC rechazó el timbrado por alguna inconsistencia, se despliega una alerta con acceso a una ventana modal para revisar el motivo técnico del rechazo y corregirlo de inmediato.
1. **Descarga de Archivos Oficiales:** Descarga directa del archivo oficial XML del CFDI 4.0 con Complemento de Recepción de Pagos 2.0 y representación gráfica oficial en PDF con sellos digitales y código QR.

### 5.4 Pestaña 4: Cuentas Bancarias de la Empresa


Permite catalogar y gestionar las cuentas bancarias oficiales de la empresa receptora que deben declararse en los nodos fiscales del Complemento de Pago (CtaBeneficiaria / RfcEmisorCtaBen):

1. **Nombre del Banco:** Institución financiera donde se tiene la cuenta receptora (ej. BBVA México, Banorte, Santander).
1. **RFC del Banco:** Registro Federal de Contribuyentes oficial de la entidad financiera receptora (ej. BBA830831LJ2 para BBVA Bancomer).
1. **Nº de Cuenta:** Número de cuenta bancaria oficial de 10 a 18 dígitos numéricos o número CLABE interbancaria receptora.
1. **Alias / Identificador:** Nombre descriptivo interno para facilitar la identificación de la cuenta al momento de registrar cobranza (ej. Cuenta Principal Cobranza, Banorte Fiscal).
1. **Botón "Agregar Cuenta":** Valida la información capturada y la registra de forma inmediata en la base de datos para habilitarla en el selector de pagos.

**Control y Trazabilidad SAT:** La tabla inferior muestra todas las cuentas registradas con su Banco, RFC, Número de Cuenta, Alias, Estado y Acciones, garantizando el cumplimiento normativo al emitir complementos REP pagados mediante transferencia electrónica o cheque nominativo.



---

## 6. Consulta, Descargas y Cancelación de Facturas

**Ruta en el sistema:** `Menú Principal > Facturación > Facturas Emitidas` (`/app/facturacion/facturas-emitidas`)

Repositorio histórico de todos los CFDIs emitidos por la empresa:

### 6.1 Búsqueda y Descargas

- Busca por número de Folio, UUID SAT o nombre del receptor.
- En cada registro puedes descargar directamente el archivo **XML** oficial y la representación gráfica en **PDF**.

### 6.2 Cancelación ante el SAT

1. Haz clic en el botón de cancelar del comprobante.
1. Selecciona el motivo oficial del SAT:
    - `01 - Comprobante emitido con errores con relación` (requiere indicar el UUID de la factura que la sustituye).
    - `02 - Comprobante emitido con errores sin relación`.
    - `03 - No se llevó a cabo la operación`.
    - `04 - Operación nominativa relacionada en una factura global`.
1. Confirma la solicitud. El sistema tramitará la revocación ante el PAC CUCC / SAT y actualizará el estatus del pedido.



---

## 7. Preguntas Frecuentes y Solución de Errores (FAQ)

### ¿Cómo elijo entre Serie A y Serie F al facturar un pedido?

Al abrir el modal de preparación de factura (tanto desde *Pedidos Enviados* como desde *Facturación Emitir*), en la parte superior verás el menú **"Serie Fiscal"**. Al cambiar de opción, el campo contiguo te mostrará exactamente qué número de folio se asignará (ej. `#30208` para Serie A o `#3` para Serie F).

### ¿Qué hago si al facturar el sistema indica que el RFC o nombre no coinciden?

En CFDI 4.0, la razón social debe escribirse exactamente como figura en la Constancia de Situación Fiscal reciente del cliente:

- En mayúsculas y sin acentos ni signos extraños.
- Sin agregar el régimen societario (`S.A. DE C.V.`, `S. DE R.L.`, etc.).
- El Código Postal fiscal debe ser exactamente el que el SAT tiene registrado para ese RFC.

### ¿Por qué en un producto dice "Falta configurar ClaveProdServ o Impuestos"?

Cada producto debe tener asignada en el catálogo de productos su Clave SAT (ej. `25172900`), Unidad de Medida (ej. `H87 - Pieza`), Objeto de Impuesto (`02 - Sí objeto de impuesto`) y la tasa de IVA de venta (`16%`). Si falta algún dato, el sistema bloqueará preventivamente el timbrado para evitar rechazos del PAC.

### ¿Qué ocurre si un pedido tiene productos importados sin pedimento?

La regla fiscal exige que las mercancías de importación desglosen el número oficial de pedimento aduanal de 15 dígitos. Selecciona el pedimento asignado a ese producto en la tabla antes de guardar la factura.


---

*Para mayor información técnica o asistencia en la configuración de nuevos CSD y folios, contacta al Soporte Técnico Isotech.*





