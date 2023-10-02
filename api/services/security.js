const Forge = require('node-forge');
const crypto = require('crypto-js');

module.exports = {
  decryptWithCert: async (encrypted) => {
    const key = Forge.pki.privateKeyFromPem(process.env.SERVER_PRIVATE);
    const decoded = Forge.util.decode64(encrypted);
    return JSON.parse(key.decrypt(decoded, 'RSA-OAEP'));
  },
  decryptWithCipher: async (key, encrypted) => {
    const bytes = crypto.AES.decrypt(encrypted, key);
    return JSON.parse(bytes.toString(crypto.enc.Utf8));
  },
  encryptWithCert: async (data) => {
    const key = Forge.pki.publicKeyFromPem(process.env.CLIENT_PUBLIC);
    const encrypted = key.encrypt(JSON.stringify(data), 'RSA-OAEP');
    return Forge.util.encode64(encrypted);
  },
  encryptWithCipher: async (key, obj) => {
    return crypto.AES.encrypt(JSON.stringify(obj), key).toString();
  },
}