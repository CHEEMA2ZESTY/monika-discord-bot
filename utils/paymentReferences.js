// utils/paymentReferences.js

const references = new Map(); // key: reference, value: Discord user ID

function saveReference(reference, userId, pillType) {
  references.set(reference, { userId, pillType });
}

function getReferenceOwner(reference) {
  return references.get(reference);
}

module.exports = {
  saveReference,
  getReferenceOwner,
};
