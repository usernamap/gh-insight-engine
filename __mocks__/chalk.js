// Mock simple pour chalk
const mockFn = (text) => text;

const chalk = new Proxy(mockFn, {
  get: () => chalk,
  apply: (target, thisArg, args) => args[0] || ''
});

module.exports = chalk;
module.exports.default = chalk; 