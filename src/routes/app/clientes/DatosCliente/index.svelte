<!--

    Este componente Svelte es parte del módulo "DatosCliente" dentro de la sección "clientes" de la aplicación.
    Se encuentra en el directorio "routes/app/clientes/DatosCliente".
    El componente es responsable de manejar y mostrar los datos del cliente.
-->

<script>
    import { onMount } from "svelte";
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
            perfil: "Público en general",
            porcentaje: 0,
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
        let direccionCliSelect =
            clientSelect.direcciones_asociadas &&
            clientSelect.direcciones_asociadas[0]
                ? clientSelect.direcciones_asociadas[0]
                : {};

        direccion.calle =
            direccionCliSelect.calle != null ? direccionCliSelect.calle : null;
        direccion.colonia =
            direccionCliSelect.colonia != null
                ? direccionCliSelect.colonia
                : null;
        direccion.cp =
            direccionCliSelect.cp != null ? direccionCliSelect.cp : null;
        direccion.entre_calle =
            direccionCliSelect.entre_calle != null
                ? direccionCliSelect.entre_calle
                : null;
        direccion.estado =
            direccionCliSelect.estado != null
                ? direccionCliSelect.estado
                : null;
        direccion.idEstado =
            direccionCliSelect.idEstado != null
                ? direccionCliSelect.idEstado
                : null;
        direccion.localidad =
            direccionCliSelect.localidad != null
                ? direccionCliSelect.localidad
                : null;
        direccion.localidad_nombre =
            direccionCliSelect.localidad_nombre != null
                ? direccionCliSelect.localidad_nombre
                : null;
        direccion.municipio =
            direccionCliSelect.municipio != null
                ? direccionCliSelect.municipio
                : null;
        direccion.idMunicipio =
            direccionCliSelect.idMunicipio != null
                ? direccionCliSelect.idMunicipio
                : null;
        direccion.nombre =
            direccionCliSelect.nombre != null
                ? direccionCliSelect.nombre
                : null;
        direccion.notas =
            direccionCliSelect.notas != null ? direccionCliSelect.notas : null;
        direccion.numero_exterior =
            direccionCliSelect.numero_exterior != null
                ? direccionCliSelect.numero_exterior
                : null;
        direccion.numero_interior =
            direccionCliSelect.numero_interior != null
                ? direccionCliSelect.numero_interior
                : null;
        direccion.pais =
            direccionCliSelect.pais != null ? direccionCliSelect.pais : null;
        direccion.idPais =
            direccionCliSelect.idPais != null
                ? direccionCliSelect.idPais
                : null;
        direccion.y_calle =
            direccionCliSelect.y_calle != null
                ? direccionCliSelect.y_calle
                : null;
        direccion.tipo =
            direccionCliSelect.tipo != null ? direccionCliSelect.tipo : null;
        direccion.rfc =
            direccionCliSelect.rfc != null ? direccionCliSelect.rfc : null;
        direccion.cfdi =
            direccionCliSelect.cfdi != null ? direccionCliSelect.cfdi : null;
        direccion.rfiscal =
            direccionCliSelect.rfiscal != null
                ? direccionCliSelect.rfiscal
                : null;
        direccion.tipo_persona =
            direccionCliSelect.tipo_persona != null
                ? direccionCliSelect.tipo_persona
                : null;
        direccion.telefono =
            direccionCliSelect.telefono != null
                ? direccionCliSelect.telefono
                : null;
        direccion.correo =
            direccionCliSelect.correo != null
                ? direccionCliSelect.correo
                : null;
        direccion.predeterminada =
            direccionCliSelect.predeterminada != null
                ? direccionCliSelect.predeterminada
                : null;

        cliente.nombre =
            clientSelect.nombre != null ? clientSelect.nombre : null;
        cliente.alias = clientSelect.alias != null ? clientSelect.alias : null;
        cliente.correo =
            clientSelect.correo != null ? clientSelect.correo : null;
        cliente.direcciones_asociadas =
            clientSelect.direcciones_asociadas != null
                ? clientSelect.direcciones_asociadas
                : null;
        cliente.fecha_nacimiento =
            clientSelect.fecha_nacimiento != null
                ? new Date(clientSelect.fecha_nacimiento)
                      .toISOString()
                      .split("T")[0]
                : null;
        cliente.fecha_creacion =
            clientSelect.fecha_creacion != null
                ? new Date(clientSelect.fecha_creacion)
                : null;
        cliente.fecha_update =
            clientSelect.fecha_update != null
                ? new Date(clientSelect.fecha_update)
                : null;
        cliente.fecha_desactivacion =
            clientSelect.fecha_desactivacion != null
                ? new Date(clientSelect.fecha_desactivacion)
                : null;
        cliente.datos_fiscales.razon_social =
            clientSelect.datos_fiscales &&
            clientSelect.datos_fiscales.razon_social != null
                ? clientSelect.datos_fiscales.razon_social
                : null;
        cliente.datos_fiscales.rfc =
            clientSelect.datos_fiscales &&
            clientSelect.datos_fiscales.rfc != null
                ? clientSelect.datos_fiscales.rfc
                : null;
        cliente.datos_fiscales.nombre =
            clientSelect.datos_fiscales &&
            clientSelect.datos_fiscales.nombre != null
                ? clientSelect.datos_fiscales.nombre
                : null;
        cliente.datos_fiscales.rfiscal =
            clientSelect.datos_fiscales &&
            clientSelect.datos_fiscales.rfiscal != null
                ? clientSelect.datos_fiscales.rfiscal
                : null;
        cliente.datos_fiscales.tipo_persona =
            clientSelect.datos_fiscales &&
            clientSelect.datos_fiscales.tipo_persona != null
                ? clientSelect.datos_fiscales.tipo_persona
                : null;
        cliente.datos_fiscales.cfdi =
            clientSelect.datos_fiscales &&
            clientSelect.datos_fiscales.cfdi != null
                ? clientSelect.datos_fiscales.cfdi
                : null;
        cliente.localidad =
            clientSelect.localidad != null ? clientSelect.localidad : null;
        cliente.localidad_nombre =
            clientSelect.localidad_nombre != null
                ? clientSelect.localidad_nombre
                : null;
        cliente.location.lat =
            clientSelect.location && clientSelect.location.lat != null
                ? clientSelect.location.lat
                : null;
        cliente.location.lng =
            clientSelect.location && clientSelect.location.lng != null
                ? clientSelect.location.lng
                : null;
        cliente.perfil.perfil =
            clientSelect.perfil && clientSelect.perfil.perfil != null
                ? clientSelect.perfil.perfil
                : null;
        cliente.perfil.porcentaje =
            clientSelect.perfil && clientSelect.perfil.porcentaje != null
                ? clientSelect.perfil.porcentaje
                : null;
        cliente.plataforma =
            clientSelect.plataforma != null ? clientSelect.plataforma : null;
        cliente.push_token =
            clientSelect.push_token != null ? clientSelect.push_token : null;
        cliente.region =
            clientSelect.region != null ? clientSelect.region : null;
        cliente.telefono =
            clientSelect.telefono != null ? clientSelect.telefono : null;
        cliente.uid = clientSelect.uid != null ? clientSelect.uid : null;
        cliente.password =
            clientSelect.password != null ? clientSelect.password : null;
        cliente.observaciones =
            clientSelect.observaciones != null
                ? clientSelect.observaciones
                : null;
        cliente.agente.id =
            clientSelect.agente && clientSelect.agente.id != null
                ? clientSelect.agente.id
                : null;
        // cliente.agente.nombre = clientSelect.agente && clientSelect.agente.nombre != null ? clientSelect.agente.nombre : null;
        // cliente.agente.correo = clientSelect.agente && clientSelect.agente.correo != null ? clientSelect.agente.correo : null;
    }

    async function EditarClienteSelecto() {
        $editar_store.cliente.newData = true;
        $editar_store.cliente.nombre = cliente.nombre;
        $editar_store.cliente.alias = cliente.alias;
        $editar_store.cliente.telefono = cliente.telefono;
        $editar_store.cliente.correo = cliente.correo;
        $editar_store.cliente.fecha_nacimiento = cliente.fecha_nacimiento;
        $editar_store.cliente.region = cliente.region;
        $editar_store.cliente.perfil.perfil = cliente.perfil.perfil;
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
                    required
                />
                <label for="inputTelefono" class="form-label">Telefono</label>
                <div class="valid-feedback">¡Se ve bien!</div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="form-floating mb-3">
                <input
                    type="email"
                    class="form-control"
                    bind:value={cliente.correo}
                    id="inputCorreo"
                    required
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
        <div class="col-md-3">
            <div class="form-floating mb-3">
                <input
                    type="date"
                    class="form-control"
                    bind:value={cliente.fecha_nacimiento}
                    id="inputCumple"
                    max={new Date(
                        new Date().setFullYear(new Date().getFullYear() - 18),
                    )
                        .toISOString()
                        .split("T")[0]}
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
                    required
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
                    bind:value={cliente.perfil.perfil}
                >
                    <option value="" selected>Seleccione un Perfil</option>
                    <option value="Elite">Elite</option>
                    <option value="Distribuidor">Distribuidor</option>
                    <option value="Mayoreo">Mayoreo</option>
                    <option value="Menudeo">Menudeo</option>
                    <option value="Público en general"
                        >Público en general</option
                    >
                </select>
                <label for="floatingSelect">Perfil</label>
            </div>
        </div>
        {#if $usuario_db.rol === "administrador" || usuario_db.rol === "gerente"}
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
                    required
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
                <div class="form-floating mb-3">
                    <input
                        type="text"
                        class="form-control"
                        id="floatingInput"
                        required
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
                        required
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
                        required
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
                        required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
</style>
