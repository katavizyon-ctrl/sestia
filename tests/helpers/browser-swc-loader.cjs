// Test-only JSX compilation; application sources are loaded without modification.
module.exports = function (source) {
  const callback = this.async();
  const swc = require('next/dist/build/swc');
  swc.loadBindings().then(() => swc.transform(source, {
    filename: this.resourcePath,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022',
      transform: { react: { runtime: 'automatic' } } },
  })).then(result => callback(null, result.code), callback);
};
