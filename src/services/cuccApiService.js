const httpFetch = globalThis.fetch || fetch;

/**
 * Servicio de Integración REST y OAuth2 con PAC CUCC
 */

export async function obtenerOAuthToken(config) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const baseUrl = config.cucc_api_base || "https://cucc.com.mx/v2/api-cucc/public";
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', config.client_id || '41');
        params.append('client_secret', config.client_secret || '');
        params.append('username', config.soap_user || '');
        params.append('password', config.soap_pass_plain || '');

        const response = await httpFetch(`${baseUrl}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params,
            signal: controller.signal
        });

        const data = await response.json();
        if (response.ok && data.access_token) {
            return { ok: true, access_token: data.access_token, token_data: data };
        } else {
            return { ok: false, mensaje: data.message || data.error || 'Error al autenticar con el PAC CUCC' };
        }
    } catch (err) {
        console.error("Error en obtenerOAuthToken CUCC:", err);
        return {
            ok: false,
            err: err.message,
            mensaje: err.name === "AbortError"
                ? "La conexión con el PAC CUCC excedió el tiempo de espera."
                : "Error de conexión con el PAC CUCC"
        };
    } finally {
        clearTimeout(timeout);
    }
}

export async function obtenerPerfilCUCC(token, config) {
    try {
        const baseUrl = config.cucc_api_base || "https://cucc.com.mx/v2/api-cucc/public";
        const response = await httpFetch(`${baseUrl}/api/perfil/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        if (response.ok) {
            return { ok: true, perfil: data };
        } else {
            return { ok: false, mensaje: data.message || 'Error al obtener perfil desde CUCC' };
        }
    } catch (err) {
        console.error("Error en obtenerPerfilCUCC:", err);
        return { ok: false, err: err.message };
    }
}

export async function actualizarPerfilCUCC(datosFiscales, token, config) {
    try {
        const baseUrl = config.cucc_api_base || "https://cucc.com.mx/v2/api-cucc/public";
        const response = await httpFetch(`${baseUrl}/api/perfil/me`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                rfc: datosFiscales.rfc,
                razon_social: datosFiscales.razon_social,
                cp: datosFiscales.cp,
                regimen_fiscal: datosFiscales.regimen_fiscal
            })
        });

        const data = await response.json();
        if (response.ok) {
            return { ok: true, resultado: data };
        } else {
            return { ok: false, mensaje: data.message || 'Error al actualizar perfil en CUCC' };
        }
    } catch (err) {
        console.error("Error en actualizarPerfilCUCC:", err);
        return { ok: false, err: err.message };
    }
}

export async function subirCSDCUCC(files, passCertificado, token, config) {
    try {
        const baseUrl = config.cucc_api_base || "https://cucc.com.mx/v2/api-cucc/public";
        const FormClass = globalThis.FormData;
        const BlobClass = globalThis.Blob;
        const form = new FormClass();

        if (files.certificado) {
            const blob = new BlobClass([files.certificado.buffer], { type: 'application/x-x509-ca-cert' });
            form.append('certificado', blob, files.certificado.originalname || 'certificado.cer');
        }

        if (files.llave) {
            const blob = new BlobClass([files.llave.buffer], { type: 'application/octet-stream' });
            form.append('llave', blob, files.llave.originalname || 'llave.key');
        }

        if (passCertificado) {
            form.append('pass_ccrtificado', passCertificado);
            form.append('pass_certificado', passCertificado);
        }

        if (files.logo) {
            const blob = new BlobClass([files.logo.buffer], { type: files.logo.mimetype || 'image/png' });
            form.append('logo', blob, files.logo.originalname || 'logo.png');
        }

        const response = await httpFetch(`${baseUrl}/api/perfil/me/csd`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });

        const data = await response.json();
        if (response.ok) {
            return { ok: true, resultado: data };
        } else {
            return { ok: false, mensaje: data.message || 'Error al subir CSD a CUCC' };
        }
    } catch (err) {
        console.error("Error en subirCSDCUCC:", err);
        return { ok: false, err: err.message };
    }
}
