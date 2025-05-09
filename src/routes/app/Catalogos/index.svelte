<script>
    import { Textfield, Button } from "svelte-mui/src";
    import {
        postData,
        usuario_db,
        mensajes_app,
        logo_negro,
    } from "./../../stores";
    import { onMount } from "svelte";

    let activeTab = "Marcas"; // La pestaña activa por defecto
    let mostrarModal = false;
    let nameCatalogo = "";
    let dato = "";

    let nuevaMarca = "";
    let nuevaUnidad = "";
    let nuevaCuenta = "";

    let nuevoPais = "";
    let paisNomenclatura = "";
    let paisSelect = "1";
    let paises = [];

    let nuevoEstado = "";
    let estadoNom = "";
    let estadosSelect = [];

    let nuevoMuicipio = "";
    let pMunicipio = "";
    let eMunicipio = "";
    let estados = [];
    let estadoSelect = "";
    let municipios = [];

    let banco = "";
    let cuenta = "";
    let clabe = "";

    let idCuentaSelect = "";

    let modalEditarCuenta = false;

    let idRegistro = "";
    let marcas = [];
    let unidades = [];
    let cuentas = [];

    let nombre = "";
    let rfc = "";
    let telefono = "";
    let calle = "";
    let colonia = "";
    let municipio = "";
    let estado = "";
    let cp = "";
    let email = "";

    let DatosGrals = "";

    onMount(() => {
        getColeccion();
        consultaPaises();
    });

    function Clean() {
        mostrarModal = false;
        nameCatalogo = "";
        dato = "";

        nuevaMarca = "";
        nuevaUnidad = "";
        nuevaCuenta = "";

        banco = "";
        cuenta = "";
        clabe = "";

        idCuentaSelect = "";

        modalEditarCuenta = false;

        idRegistro = "";

        nombre = "";
        rfc = "";
        telefono = "";
        calle = "";
        colonia = "";
        municipio = "";
        estado = "";
        cp = "";
        email = "";

        nuevoPais = "";
        paisNomenclatura = "";
        paisSelect = "1";
        // paises = [];

        nuevoEstado = "";
        estadoNom = "";
        // estadosSelect = [];

        nuevoMuicipio = "";
    }

    function getColeccion() {
        return new Promise((resolve, reject) => {
            postData("app/productos/catalogoConsulta", {
                tipo: "consulta",
            }).then((res) => {
                if (res.ok && res.catalogos.length != 0) {
                    idRegistro = res.catalogos._id;
                    if (res.catalogos.Marcas.length != 0) {
                        marcas = res.catalogos.Marcas.sort((a, b) =>
                            a.localeCompare(b),
                        );
                    }
                    if (res.catalogos.Unidades.length != 0) {
                        unidades = res.catalogos.Unidades.sort((a, b) =>
                            a.localeCompare(b),
                        );
                    }
                    if (res.catalogos.Cuentas.length != 0) {
                        cuentas = res.catalogos.Cuentas;
                        // console.log(cuentas);
                    }
                    if (res.catalogos.DatosGrals.length != 0) {
                        DatosGrals = res.catalogos.DatosGrals;
                        // console.log(DatosGrals);
                    }
                    resolve(res.ok);
                }
                if (res.ok && res.catalogos.length == 0) {
                    idRegistro = "SinDatos";
                    resolve(res.ok);
                }
            });
        });
    }

    function ConfirmarGuardado(nameCat, dato1) {
        if (!dato1) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "El dato a guardar no puede estar vacío",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        // console.log("rr", dato1);
        if (nameCat == "DatosGrals") {
            if (
                !dato1.nombre ||
                !dato1.rfc ||
                !dato1.telefono ||
                !dato1.direccion.calle ||
                !dato1.direccion.colonia ||
                !dato1.direccion.municipio ||
                !dato1.direccion.estado ||
                !dato1.direccion.cp ||
                !dato1.email
            ) {
                $mensajes_app.push({
                    tipo: "error",
                    mensaje:
                        "Todos los campos de Datos Generales deben estar completos",
                });
                $mensajes_app = $mensajes_app;
                return;
            }
        }
        nameCatalogo = nameCat;
        dato = dato1;
        mostrarModal = true;
    }

    function ConfirmaGuardadoCuenta(nameCat, banco, cuenta, clabe) {
        if (!banco || !cuenta || !clabe) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Los campos no pueden estar vacíos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        nameCatalogo = nameCat;
        // dato = `${banco} - ${cuenta} - ${clabe}`;
        dato = {
            banco: banco,
            cuenta: cuenta,
            clabe: clabe,
        };
        mostrarModal = true;
    }

    function guardarCatalogo() {
        //nameCatalogo == "Cuentas"
        return new Promise((resolve, reject) => {
            postData("app/productos/catalogoConsulta", {
                tipo: "guardar",
                id: idRegistro,
                catalogo: nameCatalogo,
                dato: dato,
            }).then((res) => {
                if (res.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Guardado Correctamente",
                    });
                    $mensajes_app = $mensajes_app;
                    mostrarModal = false;
                    getColeccion();
                    Clean();
                    resolve(res.ok);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al guardar el catálogo",
                    });
                    $mensajes_app = $mensajes_app;
                    resolve(res.ok);
                }
            });
        });
    }

    function editarCatalogoCuenta() {
        nameCatalogo = "Cuentas";
        if (!banco || !cuenta || !clabe) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Los campos no pueden estar vacíos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        // console.log(
        //     idRegistro,
        //     nameCatalogo,
        //     idCuentaSelect,
        //     banco,
        //     cuenta,
        //     clabe,
        // );
        return new Promise((resolve, reject) => {
            postData("app/productos/catalogoConsulta", {
                tipo: "editarCatalogoCuenta",
                id: idRegistro,
                catalogo: nameCatalogo,
                dato: {
                    _id: idCuentaSelect,
                    banco: banco,
                    cuenta: cuenta,
                    clabe: clabe,
                },
            }).then((res) => {
                if (res.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Guardado Correctamente",
                    });
                    $mensajes_app = $mensajes_app;
                    modalEditarCuenta = false;
                    getColeccion();
                    Clean();
                    resolve(res.ok);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al guardar el catálogo",
                    });
                    $mensajes_app = $mensajes_app;
                    resolve(res.ok);
                }
            });
        });
    }

    // Función para dividir los datos en columnas de 15 elementos
    function dividirEnColumnas(lista, maxItemsPorColumna = 15) {
        // console.log("lista", lista, "max", maxItemsPorColumna);
        let columnas = [];
        for (let i = 0; i < lista.length; i += maxItemsPorColumna) {
            columnas.push(lista.slice(i, i + maxItemsPorColumna));
        }
        return columnas;
    }

    //funcion para editar la cuenta
    function editarCuenta(id) {
        // console.log(id);
        idCuentaSelect = id;
        //se asignan los valores a cuenta clabe y banco dependiendo del id que se recibe
        const cuentaSeleccionada = cuentas.find((c) => c._id === id);
        if (cuentaSeleccionada) {
            banco = cuentaSeleccionada.banco;
            cuenta = cuentaSeleccionada.cuenta;
            clabe = cuentaSeleccionada.clabe;
        }
        modalEditarCuenta = true;
    }

    function GuardarPais(pais, nom) {
        // console.log("pais", pais, "nom", nom);
        if (!pais || !nom) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Los campos no pueden estar vacíos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        return new Promise((resolve, reject) => {
            postData("app/Catalogos/CatalogoPaises", {
                tipo: "guardarPais",
                dato: {
                    pais: pais,
                    nomenclatura: nom,
                },
            }).then((res) => {
                if (res.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Guardado Correctamente",
                    });
                    $mensajes_app = $mensajes_app;
                    mostrarModal = false;
                    getColeccion();
                    Clean();
                    resolve(res.ok);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al guardar el pais",
                    });
                    $mensajes_app = $mensajes_app;
                    resolve(res.ok);
                }
            });
        });
    }

    function consultaPaises() {
        return new Promise((resolve, reject) => {
            postData("app/Catalogos/CatalogoPaises", {
                tipo: "consultaPaises",
            }).then((res) => {
                if (res.ok) {
                    // console.log(res);
                    paises = res.paises;
                    resolve(res.paises);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al consultar los paises",
                    });
                }
            });
        });
    }

    function guardarEstado(id, estado, nom) {
        if (!id || !estado) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Los campos no pueden estar vacíos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        // console.log("id", id, "estado ", estado);
        return new Promise((resolve, reject) => {
            postData("app/Catalogos/CatalogoPaises", {
                tipo: "guardarEstado",
                dato: {
                    id: id,
                    estado: estado,
                    nomenclatura: nom,
                },
            }).then((res) => {
                if (res.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Guardado Correctamente",
                    });
                    $mensajes_app = $mensajes_app;
                    paises = paises.map((pais) => {
                        if (pais._id === id) {
                            return { ...pais, estados: res.estados };
                        }
                        return pais;
                    });
                    estadosSelect = res.estados;
                    Clean();
                    resolve(res.ok);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al guardar el estado",
                    });
                    $mensajes_app = $mensajes_app;
                    resolve(res.ok);
                }
            });
        });
    }

    function guardarMunicipio(pais, estado, nuevoMuicipio) {
        // console.log("p", pais, "e", estado, "M", nuevoMuicipio);
        return new Promise((resolve, reject) => {
            postData("app/Catalogos/CatalogoPaises", {
                tipo: "guardarMunicipio",
                dato: {
                    pais: pais,
                    estado: estado,
                    municipio: nuevoMuicipio,
                },
            }).then((res) => {
                if (res.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Guardado Correctamente",
                    });
                    $mensajes_app = $mensajes_app;
                    municipios = res.municipios;
                    paises = paises.map((pais) => {
                        if (pais._id === pMunicipio) {
                            return {
                                ...pais,
                                estados: pais.estados.map((estado) => {
                                    if (estado._id === estado) {
                                        return {
                                            ...estado,
                                            municipios: res.municipios,
                                        };
                                    }
                                    return estado;
                                }),
                            };
                        }
                        return pais;
                    });
                    // console.log("=>", paises);
                    Clean();
                    resolve(res.ok);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al guardar el municipio",
                    });
                    $mensajes_app = $mensajes_app;
                    resolve(res.ok);
                }
            });
        });
    }
</script>

<main>
    <h1>Catálogos</h1>
    <!-- Nav Tabs -->
    <div class="nav-tabs">
        <div
            class="nav-item {activeTab === 'Marcas' ? 'active' : ''}"
            on:click={() => (activeTab = "Marcas")}
        >
            Marcas
        </div>
        <div
            class="nav-item {activeTab === 'Unidades' ? 'active' : ''}"
            on:click={() => (activeTab = "Unidades")}
        >
            Unidades
        </div>
        <div
            class="nav-item {activeTab === 'Paises' ? 'active' : ''}"
            on:click={() => (activeTab = "Paises")}
        >
            Paises
        </div>
        <div
            class="nav-item {activeTab === 'Estados' ? 'active' : ''}"
            on:click={() => (activeTab = "Estados")}
        >
            Estados
        </div>
        <div
            class="nav-item {activeTab === 'Municipios' ? 'active' : ''}"
            on:click={() => (activeTab = "Municipios")}
        >
            Municipios
        </div>
        {#if $usuario_db.nombre === "Soporte Isotech" || $usuario_db.usuario === "isotech_Xenonymas"}
            <div
                class="nav-item {activeTab === 'Cuentas' ? 'active' : ''}"
                on:click={() => (activeTab = "Cuentas")}
            >
                Cuentas
            </div>
            <div
                class="nav-item {activeTab === 'Datos' ? 'active' : ''}"
                on:click={() => (activeTab = "Datos")}
            >
                Datos Generales
            </div>
        {/if}
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
        {#if activeTab === "Marcas"}
            <div>
                <h2>Marcas</h2>
                <Textfield
                    outlined
                    id="marca_input"
                    bind:value={nuevaMarca}
                    placeholder="Nueva Marca"
                    message="Nueva Marca"
                    type="text"
                />
                <button
                    on:click={() => ConfirmarGuardado("Marcas", nuevaMarca)}
                >
                    Agregar Marca
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(marcas) as columna}
                            <ul>
                                {#each columna as marca}
                                    <li>{marca}</li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if activeTab === "Paises"}
            <div>
                <h2>Paises</h2>

                <div class="row">
                    <Textfield
                        outlined
                        id="pais_input"
                        bind:value={nuevoPais}
                        placeholder="Nuevo Pais"
                        message="Nuevo Pais"
                        type="text"
                    />
                    <Textfield
                        outlined
                        id="pais_nom_input"
                        bind:value={paisNomenclatura}
                        placeholder="Nomenclatura"
                        message="Nomenclatura ejemplo: MEX"
                        type="text"
                    />
                </div>

                <button
                    on:click={() => GuardarPais(nuevoPais, paisNomenclatura)}
                >
                    Agregar Pais
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(paises) as columna}
                            <ul>
                                {#each columna as pais, index}
                                    <li>
                                        {index + 1}.- {pais.nombre} - {pais.codigo}
                                    </li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if activeTab === "Estados"}
            <div>
                <h2>Estados</h2>

                <select
                    bind:value={paisSelect}
                    on:change={() => {
                        estadosSelect = [];
                        estadosSelect = paises.find(
                            (p) => p._id === paisSelect,
                        ).estados;
                    }}
                >
                    <option value="">Pais</option>
                    {#each paises as pais}
                        <option value={pais._id}>{pais.nombre}</option>
                    {/each}
                </select>

                {#if paisSelect !== "1"}
                    <div class="row">
                        <Textfield
                            outlined
                            id="estado_nombre_input"
                            bind:value={nuevoEstado}
                            placeholder="Nuevo Estado"
                            message="Nuevo Estado"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="estado_nom_input"
                            bind:value={estadoNom}
                            placeholder="Nombenclatura Estado"
                            message="Nombenclatura estado ejemplo AGU"
                            type="text"
                        />
                    </div>
                {/if}

                <br />

                <button
                    on:click={() =>
                        guardarEstado(paisSelect, nuevoEstado, estadoNom)}
                >
                    Agregar Estado
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(estadosSelect) as columna}
                            <ul>
                                {#each columna as estado, index}
                                    <li>
                                        {index + 1}.- {estado.nombreEstado} - {estado.codigoEstado}
                                    </li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if activeTab === "Municipios"}
            <div>
                <h2>Municipios</h2>

                <div class="row">
                    <select
                        bind:value={pMunicipio}
                        on:change={() => {
                            estados = [];
                            estados = paises.find(
                                (p) => p._id === pMunicipio,
                            ).estados;
                        }}
                    >
                        <option value="">Pais</option>
                        {#each paises as pais}
                            <option value={pais._id}>{pais.nombre}</option>
                        {/each}
                    </select>

                    <select
                        class="form-select"
                        bind:value={eMunicipio}
                        on:change={() => {
                            municipios = [];
                            municipios = paises
                                .find((p) => p._id === pMunicipio)
                                .estados.find(
                                    (e) => e._id === eMunicipio,
                                ).municipios;
                        }}
                    >
                        <option value="">Estados</option>
                        {#each estados as estado}
                            <option value={estado._id}
                                >{estado.nombreEstado}</option
                            >
                        {/each}
                    </select>
                </div>
                <div class="row">
                    <Textfield
                        outlined
                        id="municipio_nombre_input"
                        bind:value={nuevoMuicipio}
                        placeholder="Nuevo Municipio"
                        message="Nuevo Municipio"
                        type="text"
                    />
                    <!-- <Textfield
                        outlined
                        id="estado_nom_input"
                        bind:value={estadoNom}
                        placeholder="Nombenclatura Estado"
                        message="Nombenclatura estado ejemplo AGU"
                        type="text"
                    /> -->
                </div>

                <br />

                <button
                    on:click={() =>
                        guardarMunicipio(pMunicipio, eMunicipio, nuevoMuicipio)}
                >
                    Agregar Municipio
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(municipios) as columna}
                            <ul>
                                {#each columna as municipio, index}
                                    <li>
                                        {index + 1}.- {municipio.nombreMunicipio}
                                    </li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if activeTab === "Unidades"}
            <div>
                <h2>Unidades</h2>
                <Textfield
                    outlined
                    id="unidad_input"
                    bind:value={nuevaUnidad}
                    placeholder="Nueva Unidad"
                    message="Nueva Unidad"
                    type="text"
                />
                <button
                    on:click={() => ConfirmarGuardado("Unidades", nuevaUnidad)}
                >
                    Agregar Unidad
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(unidades) as columna}
                            <ul>
                                {#each columna as unidad}
                                    <li>{unidad}</li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if $usuario_db.nombre === "Soporte Isotech" || $usuario_db.usuario === "isotech_Xenonymas"}
            <!-- {console.log($usuario_db)} -->
            {#if activeTab === "Cuentas"}
                <div>
                    <h2>Cuentas</h2>
                    <Textfield
                        outlined
                        id="banco_input"
                        bind:value={banco}
                        placeholder="Banco"
                        message="Banco"
                        type="text"
                    />
                    <Textfield
                        outlined
                        id="cuenta_input"
                        bind:value={cuenta}
                        placeholder="Cuenta"
                        message="Cuenta"
                        type="text"
                    />
                    <Textfield
                        outlined
                        id="clabe_input"
                        bind:value={clabe}
                        placeholder="CLABE"
                        message="CLABE"
                        type="text"
                    />
                    <button
                        on:click={() =>
                            ConfirmaGuardadoCuenta(
                                "Cuentas",
                                banco,
                                cuenta,
                                clabe,
                            )}
                    >
                        Agregar Cuenta
                    </button>
                    <div class="lista-scroll">
                        <div class="columnas mt-2">
                            {#each cuentas as cuenta}
                                <ul>
                                    <li
                                        on:click={() =>
                                            editarCuenta(cuenta._id)}
                                    >
                                        Banco: {cuenta.banco}, Cuenta: {cuenta.cuenta},
                                        CLABE: {cuenta.clabe}
                                    </li>
                                </ul>
                            {/each}
                            <!-- {#each dividirEnColumnas(cuentas) as columna}
                            <ul>
                                {#each columna as cuenta}
                                    <li>{cuenta}</li>
                                {/each}
                            </ul>
                        {/each} -->
                        </div>
                    </div>
                </div>
            {/if}

            {#if activeTab === "Datos"}
                <div>
                    <h2>Datos Generales</h2>
                    <div class="row">
                        <Textfield
                            outlined
                            id="nombre_input"
                            bind:value={nombre}
                            placeholder="Nombre"
                            message="Nombre"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="rfc_input"
                            bind:value={rfc}
                            placeholder="RFC"
                            message="RFC"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="telefono_input"
                            bind:value={telefono}
                            placeholder="Telefono"
                            message="Telefono"
                            type="text"
                        />
                    </div>
                    <div class="row">
                        <Textfield
                            outlined
                            id="calle_input"
                            bind:value={calle}
                            placeholder="Calle"
                            message="Calle"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="colonia_input"
                            bind:value={colonia}
                            placeholder="Colonia"
                            message="Colonia"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="municipio_input"
                            bind:value={municipio}
                            placeholder="Municipio"
                            message="Municipio"
                            type="text"
                        />
                    </div>
                    <div class="row">
                        <Textfield
                            outlined
                            id="estado_input"
                            bind:value={estado}
                            placeholder="Estado"
                            message="Estado"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="cp_input"
                            bind:value={cp}
                            placeholder="CP"
                            message="CP"
                            type="text"
                        />
                        <Textfield
                            outlined
                            id="email_input"
                            bind:value={email}
                            placeholder="Email"
                            message="Email"
                            type="text"
                        />
                    </div>
                    <button
                        on:click={() =>
                            ConfirmarGuardado("DatosGrals", {
                                nombre: nombre,
                                rfc: rfc,
                                direccion: {
                                    calle: calle,
                                    colonia: colonia,
                                    municipio: municipio,
                                    estado: estado,
                                    cp: cp,
                                },
                                telefono: telefono,
                                email: email,
                            })}
                    >
                        Agregar Datos
                    </button>
                    <div class="lista-scroll">
                        <div class="columnas mt-2">
                            {#if DatosGrals}
                                <ul>
                                    <li>
                                        <strong>Nombre:</strong>
                                        {DatosGrals.nombre},
                                        <strong>RFC:</strong>
                                        {DatosGrals.rfc},
                                        <br />
                                        <strong>Teléfono:</strong>
                                        {DatosGrals.telefono},
                                        <strong>Calle:</strong>
                                        {DatosGrals.direccion.calle},
                                        <br />
                                        <strong>Colonia:</strong>
                                        {DatosGrals.direccion.colonia},
                                        <strong>Municipio:</strong>
                                        {DatosGrals.direccion.municipio},
                                        <br />
                                        <strong>Estado:</strong>
                                        {DatosGrals.direccion.estado},
                                        <strong>CP:</strong>
                                        {DatosGrals.direccion.cp},
                                        <strong>Email:</strong>
                                        {DatosGrals.email}
                                    </li>
                                </ul>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        {/if}
    </div>

    <!-- Modal -->
    {#if mostrarModal}
        <div class="modal">
            <div class="modal-content">
                {#if nameCatalogo == "DatosGrals"}
                    <h2>Confirmar Guardado</h2>

                    <p>
                        ¿Confirma el guardado de los datos generales?
                        <br />
                        <strong>Nombre:</strong>
                        {nombre},
                        <strong>RFC:</strong>
                        {rfc},
                        <br />
                        <strong>Teléfono:</strong>
                        {telefono},
                        <strong>Calle:</strong>
                        {calle},
                        <br />
                        <strong>Colonia:</strong>
                        {colonia},
                        <strong>Municipio:</strong>
                        {municipio},
                        <br />
                        <strong>Estado:</strong>
                        {estado},
                        <strong>CP:</strong>
                        {cp},
                        <strong>Email:</strong>
                        {email}
                    </p>
                {/if}
                {#if nameCatalogo == "Cuentas"}
                    <h2>Confirmar Guardado</h2>
                    <p>
                        ¿Confirma el guardado de la cuenta Banco: {banco},
                        Cuenta: {cuenta}, CLABE: {clabe} en el catálogo "{nameCatalogo}"?
                    </p>
                {/if}
                {#if nameCatalogo != "DatosGrals" && nameCatalogo != "Cuentas"}
                    <h2>Confirmar Guardado</h2>
                    <p>
                        ¿Confirma el guardado de {dato} en el catálogo "{nameCatalogo}"?
                    </p>
                {/if}
                <!-- <p>
                    ¿Confirma el guardado de {dato} en el catálogo "{nameCatalogo}"?
                </p> -->
                <button on:click={guardarCatalogo}>Confirmar</button>
                <button
                    on:click={() => {
                        Clean();
                        mostrarModal = false;
                    }}>Cancelar</button
                >
            </div>
        </div>
    {/if}
    {#if modalEditarCuenta}
        <div class="modal">
            <div class="modal-content">
                <h2>Editar Cuenta</h2>
                <Textfield
                    outlined
                    id="banco_input"
                    bind:value={banco}
                    placeholder="Banco"
                    message="Banco"
                    type="text"
                />
                <Textfield
                    outlined
                    id="cuenta_input"
                    bind:value={cuenta}
                    placeholder="Cuenta"
                    message="Cuenta"
                    type="text"
                />
                <Textfield
                    outlined
                    id="clabe_input"
                    bind:value={clabe}
                    placeholder="CLABE"
                    message="CLABE"
                    type="text"
                />
                <button on:click={editarCatalogoCuenta}>Confirmar</button>
                <button
                    on:click={() => {
                        Clean();
                        modalEditarCuenta = false;
                    }}>Cancelar</button
                >
            </div>
        </div>
    {/if}
</main>

<style>
    .nav-tabs {
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;
    }
    .nav-item {
        margin: 0 0.5rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        border: 1px solid transparent;
        border-radius: 5px 5px 0 0;
        background-color: #f8f9fa;
    }
    .nav-item.active {
        border-color: #ddd;
        background-color: #fff;
        border-bottom-color: transparent;
        font-weight: bold;
    }
    .tab-content {
        padding: 1rem;
        border: 1px solid #ddd;
        border-top: none;
        background-color: #fff;
    }
    main {
        padding: 2rem;
        font-family: Arial, sans-serif;
    }

    h1 {
        color: #333;
    }

    button {
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        cursor: pointer;
    }

    button:hover {
        background-color: #0056b3;
    }

    .lista-scroll {
        overflow-x: auto;
        white-space: nowrap;
    }

    .columnas {
        display: flex;
        flex-wrap: nowrap;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0 1rem;
    }

    li {
        padding: 0.5rem;
        border-bottom: 1px solid #ddd;
    }

    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .modal-content {
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        max-width: 500px;
        width: 100%;
    }

    .row {
        display: flex;
        gap: 1rem;
    }
</style>
