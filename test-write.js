// test-write.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

db.collection('test').doc('hello').set({ msg: 'It works!' })
  .then(() => console.log("✅ Test write successful"))
  .catch(err => console.error("❌ Test write failed:", err));
