import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.APP_SECRET || 'xenon_secret_fiscal_key_2026').digest();
const IV_LENGTH = 16;

export function encryptText(text) {
    if (!text) return '';
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error("Error al cifrar texto:", err);
        return text;
    }
}

export function decryptText(encryptedText) {
    if (!encryptedText) return '';
    try {
        const textParts = encryptedText.split(':');
        if (textParts.length !== 2) return encryptedText; // Retornar tal cual si no tiene formato IV:Data
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedData = Buffer.from(textParts[1], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error("Error al descifrar texto:", err);
        return '';
    }
}

export function obtenerClientSecret(config) {
    if (!config) return "";
    return decryptText(config.client_secret_encrypted) || config.client_secret || "";
}
