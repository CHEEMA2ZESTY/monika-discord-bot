// firebase.js (place this in the root directory)

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://monika-bot-63999.firebaseio.com'
});

const db = admin.firestore();

module.exports = db;
