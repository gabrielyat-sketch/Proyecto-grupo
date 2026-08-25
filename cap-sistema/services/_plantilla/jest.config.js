module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // Algunas dependencias modernas (@scure/base, @noble/hashes — que arrastra
  // otplib en el servicio auth) se publican solo como ESM. Node 22 puede
  // hacer require() de un modulo ESM, pero el runtime CommonJS de Jest no.
  // Se le pide a ts-jest que las transforme en vez de ignorarlas como al
  // resto de node_modules.
  //
  // El lookahead lleva .* a proposito: sin el, no alcanza los node_modules
  // anidados, que es justo donde suelen quedar estas dependencias.
  transformIgnorePatterns: ['node_modules/(?!.*(@scure|@noble)/)'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs' } }],
  },
};
