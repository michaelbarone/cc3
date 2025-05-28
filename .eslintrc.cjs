module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-native/all",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "react-hooks", "react-native", "@typescript-eslint", "prettier"],
  rules: {
    // General
    "no-unused-vars": "off",
    "no-extra-boolean-cast": "off",

    // React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/display-name": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // React Native
    "react-native/no-unused-styles": "off",
    "react-native/no-inline-styles": "warn",
    "react-native/no-color-literals": "off",
    "react-native/no-raw-text": "warn",
    "react-native/no-single-element-style-arrays": "warn",

    // TypeScript
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^(?:React|_)$",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/no-empty-interface": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",

    // Prettier
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
        singleQuote: false,
        semi: true,
        tabWidth: 2,
        printWidth: 100,
        trailingComma: "all",
      },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  env: {
    "react-native/react-native": true,
    node: true,
  },
  overrides: [
    {
      files: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
      env: {
        jest: true,
      },
    },
  ],
  ignorePatterns: ["node_modules/", "coverage/", "dist/", "build/", "docs/", ".next/"],
};
