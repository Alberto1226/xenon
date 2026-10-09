export const USOS_CFDI_FISICA = [
    { clave: "G01", descripcion: "Adquisición de mercancías", regimenes: [601, 603, 606, 6012, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "G02", descripcion: "Devoluciones, descuentos o bonificaciones", regimenes: [601, 603, 606, 612, 616, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "G03", descripcion: "Gastos en general", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I01", descripcion: "Construcciones", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I02", descripcion: "Mobiliario y equipo de oficina por inversiones", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I03", descripcion: "Equipo de transporte", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I04", descripcion: "Equipo de cómputo y accesorios", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I05", descripcion: "Dados, troqueles, moldes, matrices y herramental", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I06", descripcion: "Comunicaciones telefónicas", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I07", descripcion: "Comunicaciones satelitales", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "I08", descripcion: "Otra maquinaria y equipo", regimenes: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626] },
    { clave: "D01", descripcion: "Honorarios médicos, dentales y gastos hospitalarios", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D02", descripcion: "Gastos médicos por incapacidad o discapacidad", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D03", descripcion: "Gastos funerales", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D04", descripcion: "Donativos", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D05", descripcion: "Intereses reales efectivamente pagados por créditos hipotecarios", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D06", descripcion: "Aportaciones voluntarias al SAR", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D07", descripcion: "Primas por seguros de gastos médicos", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D08", descripcion: "Gastos de transportación escolar obligatoria", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D09", descripcion: "Depósitos para el ahorro y planes de pensiones", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "D10", descripcion: "Pagos por servicios educativos (colegiaturas)", regimenes: [605, 606, 608, 611, 612, 614, 607, 615, 625] },
    { clave: "S01", descripcion: "Sin efectos fiscales", regimenes: [601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622, 623, 624, 607, 615, 625, 626] },
    { clave: "CP01", descripcion: "Pagos", regimenes: [601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622, 623, 624, 607, 615, 625, 626] },
    { clave: "CN01", descripcion: "Nómina", regimenes: [605] }
];

export const USOS_CFDI_MORAL = USOS_CFDI_FISICA.filter(uso =>
    !["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "CN01"].includes(uso.clave)
);

export const REGIMENES_FISCALES = [
    { clave: "601", descripcion: "General de Ley Personas Morales" },
    { clave: "603", descripcion: "Personas Morales con Fines no Lucrativos" },
    { clave: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
    { clave: "606", descripcion: "Arrendamiento" },
    { clave: "607", descripcion: "Régimen de Enajenación o Adquisición de Bienes" },
    { clave: "608", descripcion: "Demás ingresos" },
    { clave: "609", descripcion: "Consolidación" },
    { clave: "610", descripcion: "Residentes en el Extranjero sin Establecimiento Permanente en México" },
    { clave: "611", descripcion: "Ingresos por Dividendos (socios y accionistas)" },
    { clave: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales" },
    { clave: "614", descripcion: "Ingresos por intereses" },
    { clave: "615", descripcion: "Régimen de los ingresos por obtención de premios" },
    { clave: "616", descripcion: "Sin obligaciones fiscales" },
    { clave: "620", descripcion: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
    { clave: "621", descripcion: "Incorporación Fiscal" },
    { clave: "622", descripcion: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
    { clave: "623", descripcion: "Opcional para Grupos de Sociedades" },
    { clave: "624", descripcion: "Coordinados" },
    { clave: "625", descripcion: "Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
    { clave: "626", descripcion: "Régimen Simplificado de Confianza" },
    { clave: "628", descripcion: "Hidrocarburos" },
    { clave: "629", descripcion: "Regímenes Fiscales Preferentes y Empresas Multinacionales" },
    { clave: "630", descripcion: "Enajenación de acciones en bolsa de valores" }
];

export function obtenerCatalogosFiscales(tipoPersona, usoCfdi) {
    const usos = tipoPersona === "MORAL" ? USOS_CFDI_MORAL : USOS_CFDI_FISICA;
    const uso = usos.find(item => item.clave === usoCfdi);
    const regimenes = uso
        ? REGIMENES_FISCALES.filter(item => uso.regimenes.includes(Number(item.clave)))
        : [];
    return { usos, regimenes };
}

export function esCombinacionFiscalValida(tipoPersona, usoCfdi, regimenFiscal) {
    const catalogos = obtenerCatalogosFiscales(tipoPersona, usoCfdi);
    return catalogos.regimenes.some(regimen => regimen.clave === regimenFiscal);
}
