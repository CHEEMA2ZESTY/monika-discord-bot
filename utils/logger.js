// logger.js
const path = require('path');

function getCallerFile() {
  const originalFunc = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const err = new Error();
  const stack = err.stack;
  Error.prepareStackTrace = originalFunc;

  const currentFile = __filename;

  for (let i = 2; i < stack.length; i++) {
    const callerFile = stack[i].getFileName();
    if (callerFile !== currentFile) {
      return `${path.basename(callerFile)}:${stack[i].getLineNumber()}`;
    }
  }
  return 'unknown';
}

function logRoute(method, args) {
  const caller = getCallerFile();
  const route = args.map(arg => {
    if (typeof arg === 'string') return `"${arg}"`;
    if (typeof arg === 'function') return `[Function]`;
    if (arg instanceof RegExp) return `[RegExp: ${arg}]`;
    if (arg && typeof arg === 'object' && 'handle' in arg && 'stack' in arg) return '[Router]';
    return `[Unknown: ${typeof arg}]`;
  }).join(', ');

  console.log(`🧩 ${method}(${route}) ↳ from ${caller}`);
}

// Patch express routing
module.exports = (app) => {
  ['use', 'get', 'post', 'put', 'patch', 'delete'].forEach(method => {
    const original = app[method];
    app[method] = function (...args) {
      logRoute(method, args);
      return original.apply(this, args);
    };
  });
};
