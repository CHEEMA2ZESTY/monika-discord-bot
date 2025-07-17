// utils/route-debugger.js
const path = require("path");

module.exports = function patchExpressDebug(app) {
  const originalUse = app.use;
  const originalGet = app.get;
  const originalPost = app.post;

  const logCaller = () => {
    const err = new Error();
    const stack = err.stack.split("\n").slice(2);
    const callerLine = stack.find(line => line.includes("at"));
    return callerLine?.trim() || "unknown";
  };

  const formatArgs = (args) => {
    return args.map((arg) => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
      if (arg instanceof RegExp) return `[RegExp: ${arg}]`;
      if (arg && typeof arg === 'object' && 'handle' in arg && 'stack' in arg) return '[Router]';
      return `[Unknown: ${typeof arg}]`;
    }).join(', ');
  };

  app.use = function (...args) {
    try {
      console.log(`🧩 app.use(${formatArgs(args)}) \n ↳ from ${logCaller()}`);
    } catch (e) {
      console.warn('⚠️ app.use debug log failed:', e.message);
    }
    return originalUse.apply(this, args);
  };

  app.get = function (...args) {
    try {
      console.log(`📥 app.get(${formatArgs(args)}) \n ↳ from ${logCaller()}`);
    } catch (e) {
      console.warn('⚠️ app.get debug log failed:', e.message);
    }
    return originalGet.apply(this, args);
  };

  app.post = function (...args) {
    try {
      console.log(`📤 app.post(${formatArgs(args)}) \n ↳ from ${logCaller()}`);
    } catch (e) {
      console.warn('⚠️ app.post debug log failed:', e.message);
    }
    return originalPost.apply(this, args);
  };
};
