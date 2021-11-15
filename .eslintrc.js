module.exports = {
  extends: "eslint:recommended",
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 13,
  },
  rules: {
    quotes: [2, "double", { avoidEscape: true }],
    semi: ["error", "never"],
  },
}
