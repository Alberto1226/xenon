<!--

    Este componente Svelte es parte del módulo "DatosCliente" dentro de la sección "clientes" de la aplicación.
    Se encuentra en el directorio "routes/app/clientes/DatosCliente".
    El componente es responsable de manejar y mostrar los datos del cliente.
-->

<script>
    import { onMount } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { goto } from "@sapper/app";
    import SelectPaisBs5 from "../Componentes/SelectPaisBS5.svelte";
    import SelectEstadoBs5 from "../Componentes/SelectEstadoBS5.svelte";
    import SelectMunicipiosBS5 from "../Componentes/SelectMunicipiosBS5.svelte";
    import {
        postData,
        mensajes_app,
        usuario_db,
        usuarios,
        donde,
        editar_store,
    } from "../../../stores";
    // import { Cliente } from './path-to-your-model'; // Adjust the import path as necessary

    function generarAlias(name) {
        if (!name) return "";
        const words = name.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return "";
        const firstWord = words[0];
        if (words.length === 1) return firstWord;
        const abbreviated = words.slice(1).map(w => w[0].toLowerCase() + ".").join("");
        return `${firstWord} ${abbreviated}`;
    }

    let IdClientSelect = "";

    let cliente = {
        newData: true,
        activo: true,
        agente: {
            nombre: "",
            id: "",
            correo: "",
        },
        alias: "",
        correo: "",
        direcciones_asociadas: [],
        fecha_nacimiento: new Date(),
        fecha_creacion: new Date(),
        fecha_update: new Date(),
        fecha_desactivacion: new Date(),
        datos_fiscales: {
            razon_social: "",
            rfc: "",
            nombre: "",
            rfiscal: "",
            tipo_persona: "",
            cfdi: "",
        },
        localidad: "",
        localidad_nombre: "",
        location: {
            lat: 0,
            lng: 0,
        },
        nombre: "",
        perfil: {
            perfil: "Mayoreo",
            porcentaje: 0,
            mostrar: "0%",
        },
        plataforma: "web",
        push_token: "",
        region: "",
        telefono: "",
        uid: "",
        password: "",
        observaciones: "",
    };

    let direccion = {
        calle: "",
        colonia: "",
        cp: "",
        entre_calle: "",
        estado: "",
        idEstado: "",
        localidad: "",
        localidad_nombre: "",
        municipio: "",
        idMunicipio: "",
        nombre: "",
        notas: "",
        numero_exterior: "",
        numero_interior: "",
        pais: "México",
        idPais: "",
        y_calle: "",
        tipo: "",
        rfc: "",
        cfdi: "",
        rfiscal: "",
        tipo_persona: "",
        telefono: "",
        correo: "",
    };

    let cfdiOptions = [],
        rfOptions = [],
        rfOptions2 = [],
        listaAgente = [];



    var tp = ["FISICA", "MORAL"];

    const perfiles_lista = [];
    for (let i = 0; i <= 50; i += 5) {
        perfiles_lista.push({ mostrar: `${i}%`, perfil: "Mayoreo", porcentaje: i });
    }
    for (let i = 51; i <= 60; i++) {
        perfiles_lista.push({ mostrar: `${i}%`, perfil: "Mayoreo", porcentaje: i });
    }
    var cfdi_pf = [
        {
            CFDI: "G01",
            DES: "Adquisición de mercancías.",
            RF_PF: [601, 603, 606, 6012, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "G02",
            DES: "Devoluciones, descuentos o bonificaciones.",
            RF_PF: [601, 603, 606, 612, 616, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "G03",
            DES: "Gastos en general.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I01",
            DES: "Construcciones.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I02",
            DES: "Mobiliario y equipo de oficina por inversiones.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I03",
            DES: "Equipo de transporte.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I04",
            DES: "Equipo de computo y accesorios.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I05",
            DES: "Dados, troqueles, moldes, matrices y herramental.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I06",
            DES: "Comunicaciones telefónicas.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I07",
            DES: "Comunicaciones satelitales.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I08",
            DES: "Otra maquinaria y equipo.",
            RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "D01",
            DES: "Honorarios médicos, dentales y gastos hospitalarios.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D01",
            DES: "Honorarios médicos, dentales y gastos hospitalarios.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D02",
            DES: "Gastos médicos por incapacidad o discapacidad.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D03",
            DES: "Gastos funerales.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D04",
            DES: "Donativos.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D05",
            DES: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación).",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D06",
            DES: "Aportaciones voluntarias al SAR.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D07",
            DES: "Primas por seguros de gastos médicos.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D08",
            DES: "Gastos de transportación escolar obligatoria.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D09",
            DES: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones.",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "D10",
            DES: "Pagos por servicios educativos (colegiaturas).",
            RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
        },
        {
            CFDI: "S01",
            DES: "Sin efectos fiscales.",
            RF_PF: [
                601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622,
                623, 624, 607, 615, 625, 626,
            ],
        },
        {
            CFDI: "CP01",
            DES: "Pagos",
            RF_PF: [
                601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622,
                623, 624, 607, 615, 625, 626,
            ],
        },
        { CFDI: "CN01", DES: "Nómina", RF_PF: [605] },
    ];

    var cfdi_pm = [
        {
            CFDI: "G01",
            DES: "Adquisición de mercancías.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "G02",
            DES: "Devoluciones, descuentos o bonificaciones.",
            RF_PM: [601, 603, 606, 612, 616, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "G03",
            DES: "Gastos en general.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I01",
            DES: "Construcciones.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I02",
            DES: "Mobiliario y equipo de oficina por inversiones.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I03",
            DES: "Equipo de transporte.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I04",
            DES: "Equipo de computo y accesorios.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I05",
            DES: "Dados, troqueles, moldes, matrices y herramental.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I06",
            DES: "Comunicaciones telefónicas.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I07",
            DES: "Comunicaciones satelitales.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "I08",
            DES: "Otra maquinaria y equipo.",
            RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
        },
        {
            CFDI: "S01",
            DES: "Sin efectos fiscales.",
            RF_PM: [
                601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622,
                623, 624, 607, 615, 625, 626,
            ],
        },
        {
            CFDI: "CP01",
            DES: "Pagos",
            RF_PM: [
                601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622,
                623, 624, 607, 615, 625, 626,
            ],
        },
    ];

    var rf = [
        { CLAVE: "601", DES: "General de Ley Personas Morales" },
        { CLAVE: "603", DES: "Personas Morales con Fines no Lucrativos" },
        {
            CLAVE: "605",
            DES: "Sueldos y Salarios e Ingresos Asimilados a Salarios",
        },
        { CLAVE: "606", DES: "Arrendamiento" },
        { CLAVE: "607", DES: "Régimen de Enajenación o Adquisición de Bienes" },
        { CLAVE: "608", DES: "Demás ingresos" },
        { CLAVE: "609", DES: "Consolidación" },
        {
            CLAVE: "610",
            DES: "Residentes en el Extranjero sin Establecimiento Permanente en México",
        },
        { CLAVE: "611", DES: "Ingresos por Dividendos (socios y accionistas)" },
        {
            CLAVE: "612",
            DES: "Personas Físicas con Actividades Empresariales y Profesionales",
        },
        { CLAVE: "614", DES: "Ingresos por intereses" },
        {
            CLAVE: "615",
            DES: "Régimen de los ingresos por obtención de premios",
        },
        { CLAVE: "616", DES: "Sin obligaciones fiscales" },
        {
            CLAVE: "620",
            DES: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos",
        },
        { CLAVE: "621", DES: "Incorporación Fiscal" },
        {
            CLAVE: "622",
            DES: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
        },
        { CLAVE: "623", DES: "Opcional para Grupos de Sociedades" },
        { CLAVE: "624", DES: "Coordinados" },
        {
            CLAVE: "625",
            DES: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
        },
        { CLAVE: "626", DES: "Régimen Simplificado de Confianza" },
        { CLAVE: "628", DES: "Hidrocarburos" },
        {
            CLAVE: "629",
            DES: "De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales",
        },
        { CLAVE: "630", DES: "Enajenación de acciones en bolsa de valores" },
    ];

    onMount(() => {
        DatosAgenteSelect();

        const forms = document.querySelectorAll(".needs-validation");

        Array.prototype.slice.call(forms).forEach((form) => {
            form.addEventListener(
                "submit",
                (event) => {
                    if (!form.checkValidity()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }

                    form.classList.add("was-validated");
                },
                false,
            );
        });

        // console.log("asdawdawe", $editar_store.cliente);
        // console.log("-------", $donde);
        if ($donde === "editar") {
            asignarDatosClienteSelecto();
            IdClientSelect = $editar_store.cliente._id;
        }
    });

    $: cliente.alias = generarAlias(cliente.nombre);

    $: if (listaAgente.length > 0) {
        // console.log("Lista de agentes no está vacía", listaAgente);
        if ($donde === "editar") {
            // console.log("555555555");
            let clientSelect = cliente;
            // cliente.agente.id = clientSelect.agente.id;
            // cliente.agente.nombre = clientSelect.agente.nombre;
            // cliente.agente.correo = clientSelect.agente.correo;
            const idSeleccionado = clientSelect.agente.id;
            const agenteSeleccionado = listaAgente.find(
                (item) => item._id === idSeleccionado,
            );

            if (agenteSeleccionado) {
                cliente.agente.id = agenteSeleccionado._id;
                cliente.agente.nombre = agenteSeleccionado.nombre;
            }
        }
    }

    $: if (cliente.datos_fiscales.tipo_persona != "") {
        if ($donde === "editar") {
            updateCfdiOptions();
            updateRfisOptions();
        }
    }

    // $: if (direccion.idPais != "") {
    //     console.log("pais", direccion.pais);
    // }

    async function handleSatPdfUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (file.type !== "application/pdf") {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "El archivo seleccionado debe ser un PDF",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const pdfBase64 = reader.result;
            $mensajes_app.push({
                tipo: "info",
                mensaje: "Procesando Constancia SAT...",
            });
            $mensajes_app = $mensajes_app;

            postData("app/clientes/DatosCliente/parse_sat_pdf", { pdfBase64 })
                .then(async (res) => {
                    if (res.ok && res.data) {
                        const info = res.data;

                        // Asignar datos fiscales
                        if (info.rfc) cliente.datos_fiscales.rfc = info.rfc;
                        if (info.tipoPersona) cliente.datos_fiscales.tipo_persona = info.tipoPersona;


                        // Asignar datos de dirección
                        if (info.cp) direccion.cp = info.cp;
                        if (info.calle) direccion.calle = info.calle;
                        if (info.numeroExterior) direccion.numero_exterior = info.numeroExterior;
                        if (info.numeroInterior) direccion.numero_interior = info.numeroInterior;
                        if (info.colonia) direccion.colonia = info.colonia;
                        if (info.localidad) direccion.localidad_nombre = info.localidad;
                        if (info.entreCalle) direccion.entre_calle = info.entreCalle;
                        if (info.yCalle) direccion.y_calle = info.yCalle;

                        // Asignar país
                        if (info.idPais) {
                            direccion.idPais = info.idPais;
                            direccion.pais = info.pais;
                        }

                        // Asignar estado
                        if (info.idEstado) {
                            direccion.idEstado = info.idEstado;
                            direccion.estado = info.estado;
                        }

                        // Asignar municipio
                        if (info.idMunicipio) {
                            direccion.idMunicipio = info.idMunicipio;
                            direccion.municipio = info.municipio;
                        }

                        // Forzar actualización de CFDI options en base al tipo de persona
                        updateCfdiOptions();

                        $mensajes_app.push({
                            tipo: "exito",
                            mensaje: "Datos de Constancia SAT cargados correctamente",
                        });
                        $mensajes_app = $mensajes_app;
                    } else {
                        $mensajes_app.push({
                            tipo: "error",
                            mensaje: res.mensaje || "No se pudieron extraer datos del PDF",
                        });
                        $mensajes_app = $mensajes_app;
                    }
                })
                .catch((err) => {
                    console.error("Error al procesar PDF:", err);
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: "Error de conexión al procesar el archivo PDF",
                    });
                    $mensajes_app = $mensajes_app;
                });
        };
        reader.readAsDataURL(file);
    }

    function DatosAgenteSelect() {
        postData("app/usuarios/lista_de_usuarios")
            .then((res) => {
                if (res.ok) {
                    $usuarios.lista = res.lista;
                    $usuarios.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
                    $usuarios = $usuarios;
                    listaAgente = $usuarios.lista;
                }
            })
            .catch((err) => {
                console.log(err);
            });
    }

    function updateCfdiOptions() {
        if ($donde != "editar") {
            cliente.datos_fiscales.cfdi = "";
            cliente.datos_fiscales.rfiscal = "";
        }

        if (cliente.datos_fiscales.tipo_persona === "FISICA") {
            cfdiOptions = cfdi_pf.map((item) => ({
                value: item.CFDI,
                label: `${item.CFDI} - ${item.DES}`,
            }));
        } else {
            cfdiOptions = cfdi_pm.map((item) => ({
                value: item.CFDI,
                label: `${item.CFDI} - ${item.DES}`,
            }));
        }
    }

    function updateRfisOptions() {
        if (
            !cliente.datos_fiscales.cfdi == "" &&
            cliente.datos_fiscales.tipo_persona == "MORAL"
        ) {
            const currentCfdi = cfdi_pm.find(
                (item) => item.CFDI === cliente.datos_fiscales.cfdi,
            );
            if (currentCfdi) {
                rfOptions2 = rf.filter((item) =>
                    currentCfdi.RF_PM.includes(Number(item.CLAVE)),
                );
                rfOptions = rfOptions2.map((item) => ({
                    value: item.CLAVE,
                    label: `${item.CLAVE} - ${item.DES}`,
                }));
            }
        }
        if (
            !cliente.datos_fiscales.cfdi == "" &&
            cliente.datos_fiscales.tipo_persona == "FISICA"
        ) {
            const currentCfdi = cfdi_pf.find(
                (item) => item.CFDI === cliente.datos_fiscales.cfdi,
            );
            if (currentCfdi) {
                rfOptions2 = rf.filter((item) =>
                    currentCfdi.RF_PF.includes(Number(item.CLAVE)),
                );
                rfOptions = rfOptions2.map((item) => ({
                    value: item.CLAVE,
                    label: `${item.CLAVE} - ${item.DES}`,
                }));
            }
        }
    }

    function AsignarIdPais(id, nombre) {
        direccion.idPais = id;
        direccion.pais = nombre;
        direccion.estado = "";
        direccion.idEstado = "";
        direccion.municipio = "";
        // console.log(id, "ddddddd", nombre);
    }

    function actualizarAgente(event) {
        // console.log("agenteEntro");
        const idSeleccionado = event.target.value;
        const agenteSeleccionado = listaAgente.find(
            (item) => item._id === idSeleccionado,
        );

        // console.log("][][][][", agenteSeleccionado);

        if (agenteSeleccionado) {
            // console.log("agenteAsignar");
            cliente.agente.id = agenteSeleccionado._id;
            cliente.agente.nombre = agenteSeleccionado.nombre;
            cliente.agente.correo = agenteSeleccionado.correo;
        } else {
            cliente.agente.id = "";
            cliente.agente.nombre = "";
            cliente.agente.correo = "";
        }

        // console.log(cliente.agente);
    }

    function AsignarIdEstado(id, nombre) {
        direccion.idEstado = id;
        direccion.estado = nombre;
        direccion.municipio = "";
        // console.log(nombre, "esId", id);
    }

    function AsignarMunicipio(id, nombre) {
        direccion.idMunicipio = id;
        direccion.municipio = nombre;
        // console.log(id, "eadqw", nombre);
    }

    async function handleSubmit(event) {
        // Handle form submission

        if ($donde === "editar") {
            await EditarClienteSelecto();
        }

        // console.log("dddonde", $donde);
        // console.log(cliente);
        // console.log(direccion);
        if (event.target.checkValidity()) {
            // console.log("envio");
            return new Promise((resolve, reject) => {
                // console.log("Enviar data");
                postData("app/clientes/DatosCliente/Guardado_Edicion_Cliente", {
                    cliente: cliente,
                    direccion: direccion,
                    accion: $donde,
                    IdClientSelect: IdClientSelect,
                    cliMod: $editar_store.cliente,
                }).then((res) => {
                    // console.log($donde, "*********");
                    if (res.ok) {
                        $mensajes_app.push({
                            tipo: "exito",
                            mensaje: res.mensaje,
                        });
                        $mensajes_app = $mensajes_app;
                        resolve(res.ok);
                        goto("app/clientes");
                    } else {
                        $mensajes_app.push({
                            tipo: "error",
                            mensaje: res.mensaje,
                        });
                        $mensajes_app = $mensajes_app;
                        resolve(res.ok);
                    }
                });
            });
            // envio();
        }
    }

    function asignarDatosClienteSelecto() {
        let clientSelect = $editar_store.cliente;
        let direccionCliSelect = clientSelect.direcciones_asociadas[0];
        direccion.calle = direccionCliSelect.calle;
        direccion.colonia = direccionCliSelect.colonia;
        direccion.cp = direccionCliSelect.cp;
        direccion.entre_calle = direccionCliSelect.entre_calle;
        direccion.estado = direccionCliSelect.estado;
        direccion.idEstado = direccionCliSelect.idEstado;
        direccion.localidad = direccionCliSelect.localidad;
        direccion.localidad_nombre = direccionCliSelect.localidad_nombre;
        direccion.municipio = direccionCliSelect.municipio;
        direccion.idMunicipio = direccionCliSelect.idMunicipio;
        direccion.nombre = direccionCliSelect.nombre;
        direccion.notas = direccionCliSelect.notas;
        direccion.numero_exterior = direccionCliSelect.numero_exterior;
        direccion.numero_interior = direccionCliSelect.numero_interior;
        direccion.pais = direccionCliSelect.pais;
        direccion.idPais = direccionCliSelect.idPais;
        direccion.y_calle = direccionCliSelect.y_calle;
        direccion.tipo = direccionCliSelect.tipo;
        direccion.rfc = direccionCliSelect.rfc;
        direccion.cfdi = direccionCliSelect.cfdi;
        direccion.rfiscal = direccionCliSelect.rfiscal;
        direccion.tipo_persona = direccionCliSelect.tipo_persona;
        direccion.telefono = direccionCliSelect.telefono;
        direccion.correo = direccionCliSelect.correo;
        direccion.predeterminada = direccionCliSelect.predeterminada;

        cliente.nombre = clientSelect.nombre;
        cliente.alias = clientSelect.alias;
        cliente.correo = clientSelect.correo;
        cliente.direcciones_asociadas = clientSelect.direcciones_asociadas;
        cliente.fecha_nacimiento = new Date(clientSelect.fecha_nacimiento)
            .toISOString()
            .split("T")[0];
        cliente.fecha_creacion = new Date(clientSelect.fecha_creacion);
        cliente.fecha_update = new Date(clientSelect.fecha_update);
        cliente.fecha_desactivacion = new Date(
            clientSelect.fecha_desactivacion,
        );
        cliente.datos_fiscales.razon_social =
            clientSelect.datos_fiscales.razon_social;
        cliente.datos_fiscales.rfc = clientSelect.datos_fiscales.rfc;
        cliente.datos_fiscales.nombre = clientSelect.datos_fiscales.nombre;
        cliente.datos_fiscales.rfiscal = clientSelect.datos_fiscales.rfiscal;
        cliente.datos_fiscales.tipo_persona =
            clientSelect.datos_fiscales.tipo_persona;
        cliente.datos_fiscales.cfdi = clientSelect.datos_fiscales.cfdi;
        cliente.localidad = clientSelect.localidad;
        cliente.localidad_nombre = clientSelect.localidad_nombre;
        cliente.location.lat = clientSelect.location.lat;
        cliente.location.lng = clientSelect.location.lng;
        cliente.perfil.perfil = clientSelect.perfil.perfil || "Mayoreo";
        cliente.perfil.porcentaje = clientSelect.perfil.porcentaje !== undefined ? clientSelect.perfil.porcentaje : 0;
        cliente.perfil.mostrar = clientSelect.perfil.mostrar || `${cliente.perfil.porcentaje}%`;
        cliente.plataforma = clientSelect.plataforma;
        cliente.push_token = clientSelect.push_token;
        cliente.region = clientSelect.region;
        cliente.telefono = clientSelect.telefono;
        cliente.uid = clientSelect.uid;
        cliente.password = clientSelect.password;
        cliente.observaciones = clientSelect.observaciones;
        cliente.agente.id = clientSelect.agente.id;
        // cliente.agente.nombre = clientSelect.agente.nombre;
        // cliente.agente.correo = clientSelect.agente.correo;
    }

    async function EditarClienteSelecto() {
        $editar_store.cliente.newData = true;
        $editar_store.cliente.nombre = cliente.nombre;
        $editar_store.cliente.alias = cliente.alias;
        $editar_store.cliente.telefono = cliente.telefono;
        $editar_store.cliente.correo = cliente.correo;
        $editar_store.cliente.fecha_nacimiento = cliente.fecha_nacimiento;
        $editar_store.cliente.region = cliente.region;
        $editar_store.cliente.perfil.perfil = cliente.perfil.perfil || "Mayoreo";
        $editar_store.cliente.perfil.porcentaje = cliente.perfil.porcentaje !== undefined ? cliente.perfil.porcentaje : 0;
        $editar_store.cliente.perfil.mostrar = cliente.perfil.mostrar || `${cliente.perfil.porcentaje}%`;
        $editar_store.cliente.observaciones = cliente.observaciones;
        $editar_store.cliente.datos_fiscales.rfc = cliente.datos_fiscales.rfc;
        $editar_store.cliente.datos_fiscales.tipo_persona =
            cliente.datos_fiscales.tipo_persona;
        $editar_store.cliente.datos_fiscales.cfdi = cliente.datos_fiscales.cfdi;
        $editar_store.cliente.datos_fiscales.rfiscal =
            cliente.datos_fiscales.rfiscal;
        $editar_store.cliente.direcciones_asociadas[0] = {
            calle: direccion.calle,
            colonia: direccion.colonia,
            cp: direccion.cp,
            entre_calle: direccion.entre_calle,
            estado: direccion.estado,
            idEstado: direccion.idEstado,
            localidad: direccion.localidad,
            localidad_nombre: direccion.localidad_nombre,
            municipio: direccion.municipio,
            idMunicipio: direccion.idMunicipio,
            nombre: direccion.nombre,
            notas: direccion.notas,
            numero_exterior: direccion.numero_exterior,
            numero_interior: direccion.numero_interior,
            pais: direccion.pais,
            idPais: direccion.idPais,
            y_calle: direccion.y_calle,
            tipo: direccion.tipo,
            rfc: direccion.rfc,
            cfdi: direccion.cfdi,
            rfiscal: direccion.rfiscal,
            tipo_persona: direccion.tipo_persona,
            telefono: direccion.telefono,
            correo: direccion.correo,
            predeterminada: direccion.predeterminada,
        };

        if (
            $usuario_db.rol === "administrador" ||
            $usuario_db.rol === "gerente"
        ) {
            $editar_store.cliente.agente.id = cliente.agente.id;
            $editar_store.cliente.agente.nombre = cliente.agente.nombre;
        }
    }

    // Example starter JavaScript for disabling form submissions if there are invalid fields
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
    crossorigin="anonymous"
/>

<div class="form-container">
    {#if $donde === "editar"}
        <h2>Editar Cliente</h2>
    {:else}
        <h2>Registro de Cliente</h2>
    {/if}
    <form
        on:submit|preventDefault={handleSubmit}
        class="row g-3 needs-validation"
        novalidate
    >
        <div class="col-md-4">
            <div class="form-floating mb-3">
                <input
                    type="text"
                    class="form-control"
                    bind:value={cliente.nombre}
                    id="inputNombre"
                    required
                />
                <label for="inputNombre" class="form-label">Nombre</label>
                <div class="valid-feedback">¡Se ve bien!</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="form-floating mb-3">
                <input
                    type="text"
                    class="form-control"
                    bind:value={cliente.alias}
                    id="inputAlias"
                    required
                    readonly
                />
                <label for="inputAlias">Alias</label>
                <div class="valid-feedback">¡Se ve bien!</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    class="form-control"
                    bind:value={cliente.telefono}
                    id="inputTelefono"
                />
                <label for="inputTelefono" class="form-label">Telefono</label>
                <div class="valid-feedback">¡Se ve bien!</div>
            </div>
        </div>
        <!-- Correo y Contraseña ya no se usan -->
        <!--
        <div class="col-md-6">
            <div class="form-floating mb-3">
                <input
                    type="email"
                    class="form-control"
                    bind:value={cliente.correo}
                    id="inputCorreo"
                />
                <label for="inputCorreo" class="form-label">Correo</label>
                <div class="valid-feedback">¡Se ve bien!</div>
            </div>
        </div>
        <div class="col-md-6">
            {#if $donde != "editar"}
                <div class="form-floating mb-3">
                    <input
                        type="password"
                        class="form-control"
                        bind:value={cliente.password}
                        id="inputContra"
                        aria-describedby="passwordHelpBlock"
                    />
                    <label for="inputContra" class="form-label"
                        >Contraseña</label
                    >
                    <div class="valid-feedback">¡Se ve bien!</div>
                </div>
            {/if}
        </div>
        -->
        <div class="col-md-3">
            <div class="form-floating mb-3">
                <input
                    type="date"
                    class="form-control"
                    bind:value={cliente.fecha_nacimiento}
                    id="inputCumple"
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                />
                <label for="inputCumple" class="form-label">Cumpleaños</label>
                <div class="valid-feedback">¡Se ve bien!</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="form-floating">
                <select
                    class="form-select"
                    id="floatingSelectRegion"
                    aria-label="Floating label select example"
                    bind:value={cliente.region}
                >
                    <option value="" selected>Seleccione una Region</option>
                    <option value="Noroeste">Noroeste</option>
                    <option value="Noreste">Noreste</option>
                    <option value="Occidente Bajío">Occidente Bajío</option>
                    <option value="Centro">Centro</option>
                    <option value="Sureste">Sureste</option>
                </select>
                <label for="floatingSelect">Region</label>
            </div>
        </div>
        <div class="col-md-3">
            <div class="form-floating">
                <select
                    class="form-select"
                    id="floatingPerfil"
                    aria-label="Floating label select example"
                    required
                    bind:value={cliente.perfil.porcentaje}
                    on:change={(event) => {
                        const pct = Number(event.target.value);
                        cliente.perfil.porcentaje = pct;
                        cliente.perfil.perfil = "Mayoreo";
                        cliente.perfil.mostrar = `${pct}%`;
                    }}
                >
                    <option value="" selected>Seleccione un Descuento</option>
                    {#each perfiles_lista as item}
                        <option value={item.porcentaje}>{item.mostrar}</option>
                    {/each}
                </select>
                <label for="floatingPerfil">Descuento</label>
            </div>
        </div>
        {#if $usuario_db.rol === "administrador" || $usuario_db.rol === "gerente"}
            <div class="col-md-3">
                <div class="form-floating">
                    <select
                        class="form-select"
                        id="floatingAgente"
                        aria-label="Floating label select example"
                        bind:value={cliente.agente.id}
                        on:change={actualizarAgente}
                        required
                    >
                        <option value="" selected>Seleccione un Agente</option>
                        {#each listaAgente as item}
                            <option value={item._id}>{item.nombre}</option>
                        {/each}
                    </select>
                    <label for="floatingSelect">Agente</label>
                </div>
            </div>
        {/if}
        <div class="col-md-12">
            <div class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputObservaciones"
                    bind:value={cliente.observaciones}
                />
                <label for="floatingInputGrid">Observaciones</label>
            </div>
        </div>
        <hr />
        <div class="col-md-3">
            <div class="form-floating">
                <select
                    class="form-select"
                    id="floatingSelectRegion"
                    aria-label="Floating label select example"
                    bind:value={direccion.tipo}
                >
                    <option value="" selected>Tipo de direccion</option>
                    <option value="Envio">Envio</option>
                    <option value="Envio/Facturacion">Envio/Facturacion</option>
                    <option value="Facturacion">Facturacion</option>
                </select>
                <label for="floatingSelect">Tipo de direccion</label>
            </div>
        </div>
        {#if direccion.tipo === "Envio/Facturacion" || direccion.tipo == "Facturacion"}
            <div class="col-md-3">
                <div class="d-flex align-items-center mb-3">
                    <input
                        type="file"
                        id="satPdfInput"
                        accept=".pdf"
                        on:change={handleSatPdfUpload}
                        style="display: none;"
                    />
                    <button
                        type="button"
                        class="btn btn-primary w-100"
                        style="height: 58px;"
                        on:click={() => document.getElementById('satPdfInput').click()}
                    >
                        Cargar Constancia SAT
                    </button>
                </div>
            </div>
            <div class="col-md-3">
                <div class="form-floating mb-3">
                    <input
                        type="text"
                        class="form-control"
                        id="floatingInput"
                        bind:value={cliente.datos_fiscales.rfc}
                    />
                    <label for="floatingInput">RFC</label>
                </div>
            </div>
            <div class="col-md-2">
                <div class="form-floating">
                    <select
                        class="form-select"
                        id="floatingSelectRegion"
                        aria-label="Floating label select example"
                        bind:value={cliente.datos_fiscales.tipo_persona}
                        on:change={updateCfdiOptions}
                    >
                        <option value="" selected>Tipo de Persona</option>
                        {#each tp as item}
                            <option value={item}>{item}</option>
                        {/each}
                    </select>
                    <label for="floatingSelect">Tipo de Persona</label>
                </div>
            </div>
            <div class="col-md-2">
                <div class="form-floating">
                    <select
                        class="form-select"
                        id="floatingSelectRegion"
                        aria-label="Floating label select example"
                        disabled={cfdiOptions.length === 0 ||
                            cliente.tipo_persona === ""}
                        bind:value={cliente.datos_fiscales.cfdi}
                        on:change={updateRfisOptions}
                    >
                        <option value="" selected>Uso del CFDI</option>
                        {#if cfdiOptions.length != 0}
                            {#each cfdiOptions as item}
                                <option value={item.value}>{item.label}</option>
                            {/each}
                        {/if}
                    </select>
                    <label for="floatingSelect">Uso del CFDI</label>
                </div>
            </div>
            <div class="col-md-2">
                <div class="form-floating">
                    <select
                        class="form-select"
                        id="floatingSelectRegion"
                        aria-label="Floating label select example"
                        disabled={rfOptions.length === 0 || cliente.cfdi === ""}
                        bind:value={cliente.datos_fiscales.rfiscal}
                    >
                        <option value="" selected>Regimen Fiscal</option>
                        {#each rfOptions as item}
                            <option value={item.value}>{item.label}</option>
                        {/each}
                    </select>
                    <label for="floatingSelect">Regimen Fiscal</label>
                </div>
            </div>
        {/if}
        <hr />
        <SelectPaisBs5
            bind:donde={$donde}
            bind:pais={direccion.pais}
            bind:idPais={direccion.idPais}
            on:pais_cambio={(event) =>
                AsignarIdPais(event.detail.id, event.detail.nombre)}
            size="col-md-4"
        />
        <SelectEstadoBs5
            bind:donde={$donde}
            bind:Pais={direccion.pais}
            bind:estado={direccion.estado}
            bind:IdPais={direccion.idPais}
            on:estado_cambio={(event) =>
                AsignarIdEstado(event.detail.id, event.detail.nombre)}
            size="col-md-4"
        />
        <SelectMunicipiosBS5
            bind:donde={$donde}
            bind:IdPais={direccion.idPais}
            bind:Pais={direccion.pais}
            bind:Estado={direccion.estado}
            bind:municipio={direccion.municipio}
            bind:IdEstado={direccion.idEstado}
            on:municipio_cambio={(event) =>
                AsignarMunicipio(event.detail.id, event.detail.nombre)}
            size="col-md-4"
        />
        <div class="col-md-3">
            <form class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    id="floatingInputValueZip"
                    bind:value={direccion.cp}
                />
                <label for="floatingInputValueZip">C.P.</label>
            </form>
        </div>
        <div class="col-md-3">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueLocalidad"
                    bind:value={direccion.localidad_nombre}
                />
                <label for="floatingInputValueLocalidad">Localidad</label>
            </form>
        </div>
        <div class="col-md-3">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueColonia"
                    bind:value={direccion.colonia}
                />
                <label for="floatingInputValueColonia">Colonia</label>
            </form>
        </div>
        <div class="col-md-3">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueCalle"
                    bind:value={direccion.calle}
                />
                <label for="floatingInputValueCalle">Calle</label>
            </form>
        </div>
        <div class="col-md-2">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueInterior"
                    bind:value={direccion.numero_interior}
                />
                <label for="floatingInputValueInterior">N° Interior</label>
            </form>
        </div>
        <div class="col-md-2">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueExterior"
                    bind:value={direccion.numero_exterior}
                />
                <label for="floatingInputValueExterior">N° Exterior</label>
            </form>
        </div>
        <div class="col-md-4">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueEntreC"
                    bind:value={direccion.entre_calle}
                />
                <label for="floatingInputValueEntreC">Entre Calle</label>
            </form>
        </div>
        <div class="col-md-4">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueYCalle"
                    bind:value={direccion.y_calle}
                />
                <label for="floatingInputValueYCalle">Y Calle</label>
            </form>
        </div>
        <div class="col-md-2">
            <div class="form-check">
                <input
                    class="form-check-input"
                    type="checkbox"
                    id="gridCheck"
                    bind:checked={direccion.predeterminada}
                />
                <label class="form-check-label" for="gridCheck">
                    Usar como Predeterminada
                </label>
            </div>
        </div>
        <div class="col-md-10">
            <form class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    id="floatingInputValueIndicaciones"
                    bind:value={direccion.notas}
                />
                <label for="floatingInputValueIndicaciones">Indicaciones</label>
            </form>
        </div>
        <div class="d-grid gap-2 d-md-flex justify-content-md-end w-100">
            <button type="submit" class="btn btn-dark me-md-2 w-100">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-floppy-fill"
                viewBox="0 0 16 16"
            >
                <path
                d="M0 1.5A1.5 1.5 0 0 1 1.5 0H3v5.5A1.5 1.5 0 0 0 4.5 7h7A1.5 1.5 0 0 0 13 5.5V0h.086a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5H14v-5.5A1.5 1.5 0 0 0 12.5 9h-9A1.5 1.5 0 0 0 2 10.5V16h-.5A1.5 1.5 0 0 1 0 14.5z"
                />
                <path
                d="M3 16h10v-5.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5zm9-16H4v5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5zM9 1h2v4H9z"
                />
            </svg>
            Guardar
            </button>
            <button
            type="button"
            class="btn btn-danger w-100"
            on:click={() => goto("app/clientes")}
            >
            Cancelar
            </button>
        </div>
    </form>
</div>



<style>
    .form-container {
        max-width: inherit;
        margin: 1rem;
        padding: 1rem;
        border: 1px solid #222d32;
        border-radius: 8px;
        background-color: #f0f1ff;
    }
    .form-group {
        margin-bottom: 1rem;
    }
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #f0f1ff;
        border-radius: 4px;
    }

    /* Estilos del Modal Personalizado */
    .modal-backdrop-custom {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .modal-card-custom {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 550px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        overflow: hidden;
    }

    .modal-header-custom {
        padding: 1.5rem 1.5rem 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .modal-icon-container {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background-color: #eff6ff;
        color: #3b82f6;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
    }

    .modal-header-custom h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #0f172a;
    }

    .modal-body-custom {
        padding: 1.5rem;
        color: #475569;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    .modal-body-custom p {
        margin-top: 0;
        margin-bottom: 1.25rem;
    }

    .names-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
    }

    .name-box {
        padding: 0.85rem 1rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .current-name {
        background-color: #f8fafc;
        border-left: 4px solid #94a3b8;
    }

    .new-name {
        background-color: #f0fdf4;
        border-color: #bbf7d0;
        border-left: 4px solid #22c55e;
    }

    .name-box .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: #64748b;
    }

    .current-name .label {
        color: #64748b;
    }

    .new-name .label {
        color: #166534;
    }

    .name-box .value {
        font-weight: 600;
        color: #0f172a;
        word-break: break-word;
    }

    .new-name .value {
        color: #14532d;
    }

    .modal-alert-box {
        display: flex;
        align-items: flex-start;
        background-color: #fffbeb;
        border: 1px solid #fef3c7;
        color: #92400e;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.85rem;
    }

    .modal-footer-custom {
        padding: 1rem 1.5rem 1.5rem;
        background-color: #f8fafc;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .btn-custom {
        padding: 0.625rem 1.25rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 550;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
    }

    .btn-secondary-custom {
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
    }

    .btn-secondary-custom:hover {
        background-color: #f1f5f9;
        color: #0f172a;
        border-color: #94a3b8;
    }

    .btn-primary-custom {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: #ffffff;
        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
    }

    .btn-primary-custom:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        box-shadow: 0 4px 12px -1px rgba(59, 130, 246, 0.3);
        transform: translateY(-1px);
    }

    .btn-primary-custom:active {
        transform: translateY(0);
    }
</style>
