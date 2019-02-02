const kbpgp = require('kbpgp');
const PGP = kbpgp["const"].openpgp;

let opts;
let keyManagers = {
    me: null,
    other: null
};
let keys = {
    private: null,
    public: null
};
let otherKeys = {
    public: null
};

exports.getPrivateKey = function() {
    return keys.private;
};

exports.getPublicKey = function() {
    return keys.public;
};

exports.setOtherKeys = function(publicKey) {
    otherKeys.public = publicKey;
    kbpgp.KeyManager.import_from_armored_pgp({
        armored: publicKey
    }, function(err, keyManager) {
        if (!err) {
            keyManagers.other = keyManager;
            console.log("Other keyManager has been imported into Assembl Desktop. We can now encrypt data.");
        }
        else {
            console.warn("An error occured while importing the public key from the receiver into the KeyManager.");
            console.error(err);
        }
    });
};

exports.createKeys = function(displayName, userId) {
    if (userId == null) {
        userId = Math.random().toString(36).substring(11);
    }
    opts = {
        userid: displayName + " <" + userId + "@users.assembl.science>",
        primary: {
            nbits: 4096,
            flags: PGP.certify_keys | PGP.sign_data | PGP.auth | PGP.encrypt_comm | PGP.encrypt_storage,
            expire_in: 86400 * 42       // 42 days
        },
        subkeys: [
            {
                nbits: 2048,
                flags: PGP.sign_data,
                expire_in: 86400 * 21   // 21 days
            }, 
            {
                nbits: 2048,
                flags: PGP.encrypt_storage,
                expire_in: 86400 * 21   // 21 days
            }
        ]
    };

    return new Promise(
        function(resolve, reject) {
            let checkForKeys = setInterval(function() {
                if (keys.private != null && keys.public != null) {
                    console.log("Keypair has been generated!");
                    clearInterval(checkForKeys);
                    resolve(keys.public);
                }
                else {
                    console.log("Keypair has not been generated yet.");
                }
            }, 500);
            kbpgp.KeyManager.generate(opts, function(err, keyManager) {
                if (!err) {
                    // sign subkeys
                    keyManager.sign({}, function(err) {
                        if (err) {
                            console.warn("Could not sign subkeys");
                            console.error(err);
                            clearInterval(checkForKeys);
                            reject("Could not sign subkeys");
                            return;
                        }
                        keyManagers.me = keyManager;
                        keyManager.export_pgp_private (
                            {
                                passphrase: ''
                            },
                            function(err, pgp_private) {
                                if (err) {
                                    console.warn("Could not export private key");
                                    console.error(err);
                                    clearInterval(checkForKeys);
                                    reject("Could not export private key");
                                    return;
                                }
                                console.log("Private key exported");
                                keys.private = pgp_private;
                            }
                        );
                        keyManager.export_pgp_public(
                            {

                            },
                            function(err, pgp_public) {
                                if (err) {
                                    console.warn("Could not export public key");
                                    console.error(err);
                                    clearInterval(checkForKeys);
                                    reject("Could not export public key");
                                    return;
                                }
                                console.log("Public key exported");
                                keys.public = pgp_public;
                            }
                        );
                    });
                }
                else {
                    console.warn("An error occured while generating a PGP keypair.");
                    console.error(err);
                    clearInterval(checkForKeys);
                    reject("Could not generate a PGP keypair");
                }
            });
        }
    );
};

exports.encryptChunk = function(chunk) {
    let buffer = new Buffer.from(chunk);
    let params = {
        msg: buffer,
        encrypt_for: keyManagers.other,
        // sign_with: keyManagers.me
    };
    return new Promise(
        function(resolve, reject) {
            kbpgp.box(params, function(err, result_string, result_buffer) {
                if (err) {
                    reject(err.message);
                }
                else {
                    // send string through instead of buffer
                    resolve(result_string);
                }
            });
        }
    );
};

// in the following function, chunk is a PGP message and not a Buffer nor ArrayBuffer
exports.decryptChunk = function(pgp_msg) {
    return new Promise(
        function(resolve, reject) {
            let keyRing = new kbpgp.keyring.KeyRing();
            keyRing.add_key_manager(keyManagers.me);
            kbpgp.unbox({ keyfetch: keyRing, armored: pgp_msg }, function(err, literals) {
                if (err != null) {
                    console.error(err);
                    reject(err);
                }
                else {
                    // send buffer through instead of string
                    resolve(literals[0].toBuffer());
                }
            });
        }
    );
};