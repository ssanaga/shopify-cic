/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
const crypto = require('crypto');

const BLOCK_SIZE = 16;

exports.onExecutePostLogin = async (event, api) => {
    if (event.secrets.MULTIPASS_SECRET.length === 0) throw new Error('Invalid Secret');

    // Use the Multipass secret to derive two cryptographic keys, one for encryption, one for signing
    const hash = crypto.createHash("sha256").update(event.secrets.MULTIPASS_SECRET).digest();
    const encryptionKey = hash.slice(0, BLOCK_SIZE);
    const signingKey = hash.slice(BLOCK_SIZE, 32);

    const userData = {
        email: event.user.email,
        created_at: new Date().toISOString(),
        identifier: event.user.user_id,
        first_name: event.user.given_name,
        last_name: event.user.family_name,
    };

    // Shopify Multipass does not support IPv6
    if (!event.request.ip.includes(":")) {
        userData.remote_ip = event.request.ip;
    }

    if (event.request.query['shopifyReturnTo']) {
        userData.return_to = event.request.query['shopifyReturnTo'];
    }

    // Encrypt
    // Use a random IV
    const iv = crypto.randomBytes(BLOCK_SIZE);
    const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);

    // Use IV as first block of ciphertext
    const cipherText = Buffer.concat([iv, cipher.update(JSON.stringify(userData), 'utf8'), cipher.final()]);

    // Create a signature (message authentication code) of the ciphertext
    // and encode everything using URL-safe Base64 (RFC 4648)
    const signed = crypto.createHmac("SHA256", signingKey).update(cipherText).digest();
    let token = Buffer.concat([cipherText, signed]).toString('base64');
    token = token.replace(/\+/g, '-') // Replace + with -
        .replace(/\//g, '_'); // Replace / with _

    api.idToken.setCustomClaim(`https://myshopify.com/multipass`, token);
};

/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };
