import { CoreCfdiError } from "./errores.js";

// Valor de ejemplo de .env.example: si sigue puesto, la integración no está configurada.
const URL_DE_EJEMPLO = "https://mi-dominio.com/api/v1";
const DEVICE_NAME_POR_DEFECTO = "xenon";

/**
 * Lee del entorno la configuración fija de CoreCFDI: a qué servidor se conecta este sistema.
 * La empresa (tenant), el email y la contraseña NO van aquí: los escribe el usuario al iniciar
 * sesión en CoreCFDI desde la pantalla.
 */
export function leerConfigCoreCfdi(env = process.env) {
    const baseUrl = (env.CORECFDI_BASE_URL || "").trim().replace(/\/+$/, "");
    if (!baseUrl || baseUrl === URL_DE_EJEMPLO) {
        throw new CoreCfdiError("configuracion", "La integración con CoreCFDI no está configurada. Falta la variable de entorno CORECFDI_BASE_URL.");
    }

    // Sin HTTPS solo en desarrollo: localhost o un dominio .test (reservado para pruebas locales).
    const esLocal = /^http:\/\/(localhost|127\.0\.0\.1|[a-z0-9.-]+\.test)(:|\/|$)/i.test(baseUrl);
    if (!baseUrl.startsWith("https://") && !esLocal) {
        throw new CoreCfdiError("configuracion", "CORECFDI_BASE_URL debe usar HTTPS (salvo localhost o un dominio .test).");
    }

    return {
        baseUrl,
        deviceName: (env.CORECFDI_DEVICE_NAME || "").trim() || DEVICE_NAME_POR_DEFECTO
    };
}
