const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function getServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
        return JSON.parse(json);
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }

    return null;
}

const serviceAccount = getServiceAccount();

if (!admin.apps.length) {
    const options = {
        databaseURL: process.env.FIREBASE_DATABASE_URL
    };

    if (serviceAccount) {
        options.credential = admin.credential.cert(serviceAccount);
    } else {
        throw new Error(
            'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH locally, or FIREBASE_SERVICE_ACCOUNT_BASE64/FIREBASE_SERVICE_ACCOUNT_JSON in deployment.'
        );
    }

    admin.initializeApp(options);
}

module.exports = {
    admin,
    database: admin.database(),
    serverValue: admin.database.ServerValue
};
