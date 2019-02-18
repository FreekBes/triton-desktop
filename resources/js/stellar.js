const StellarSdk = require('stellar-sdk');
let horizonServer = new StellarSdk.Server('https://horizon.stellar.org');
/*
let keypair = StellarSdk.Keypair.random();
*/
let keypair = StellarSdk.Keypair.fromSecret("***REMOVED_PRIV_KEY_STELLAR_HORIZON_SOURCE_ACC***");
console.log(keypair);
console.log("Public key:", keypair.publicKey());
console.log("Secret key:", keypair.secret());

StellarSdk.Network.usePublicNetwork();

async function hashMemo(key = null, hash = null) {
    if (hash == null) {
        return;
    }
    const account = await horizonServer.loadAccount(key || keypair.publicKey());
    const transaction = new StellarSdk.TransactionBuilder(account)
        .setTimeout(0)
        .addOperation(StellarSdk.Operation.bumpSequence({
            bumpTo: account.sequenceNumber() + 1,
        }))
        .addMemo(new StellarSdk.Memo(StellarSdk.MemoHash, hash))
        .build();
    transaction.sign(keypair);
    const r = await horizonServer.submitTransaction(transaction);
    console.log(r);
}

async function create() {
    StellarSdk.Network.useTestNetwork();
    // create an Account object using locally tracked sequence number
    const account = await horizonServer.loadAccount(keypair.publicKey());    
    var transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.createAccount({
          destination: keypair.publicKey(),
          startingBalance: "10"  // in XLM
        }))
        .build();
    
    transaction.sign(keypair);
    // transaction.sign(keypair);
    // try {
    const r = await horizonServer.submitTransaction(transaction);
    console.log(r);
    const user = await horizonServer.loadAccount(keypair.publicKey());    
    var transaction = new StellarSdk.TransactionBuilder(user)
        .addOperation(StellarSdk.Operation.setOptions({
            signer: {
            ed25519PublicKey: publicKey,
            weight: 2
            }
        }))
        .addOperation(StellarSdk.Operation.setOptions({
            masterWeight: 1, // set master key weight
            lowThreshold: 1,
            medThreshold: 2, // a payment is medium threshold
            highThreshold: 2 // make sure to have enough weight to add up to the high threshold!
        }))
    .build();
    
    transaction.sign(keypair);
    try {
        const r2 = await horizonServer.submitTransaction(transaction);    
        console.log(r2);
    } catch (e) { 
        console.log(e);
        console.log(e.response.data.extras)
    }
};

// create();