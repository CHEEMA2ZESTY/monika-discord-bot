const db = require('../firebase');

const collection = db.collection('paymentReferences');

async function saveReference(reference, userId, pillType) {
  await collection.doc(reference).set({
    userId,
    pillType,
    timestamp: Date.now()
  });
}

async function getReferenceOwner(reference) {
  const doc = await collection.doc(reference).get();
  return doc.exists ? doc.data() : null;
}

module.exports = {
  saveReference,
  getReferenceOwner,
};
