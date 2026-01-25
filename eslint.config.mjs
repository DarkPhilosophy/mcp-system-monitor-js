import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
    js.configs.recommended,
    prettierConfig,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.es2021
            }
        },
        plugins: {
            jsdoc,
            prettier
        },
        rules: {
            // Formatting (strict)
            "indent": "off",
            "quotes": "off",
            "semi": "off",
            "comma-dangle": "off",
            "object-curly-spacing": "off",
            "arrow-parens": "off",
            "prefer-template": "error",
            "prefer-const": "warn",
            "no-var": "error",

            // Naming (strict)
            "no-unused-vars": ["error", {
                "vars": "local",
                "varsIgnorePattern": "(^unused|_$)",
                "argsIgnorePattern": "^(unused|_)"
            }],
            "camelcase": ["error", {
                "properties": "never",
                "allow": ["^vfunc_", "^on_", "^new_"]
            }],

            // Code quality (strict)
            "eqeqeq": "error",
            "curly": ["error", "all"],
            "no-implicit-coercion": "error",
            "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
            "prettier/prettier": "warn",

            // JSDoc (relaxed)
            "jsdoc/require-jsdoc": "warn",
            "jsdoc/require-param": "warn",
            "jsdoc/require-param-description": "warn",
            "jsdoc/require-param-name": "warn",
            "jsdoc/require-param-type": "warn",
            "jsdoc/check-param-names": "warn",
            "jsdoc/check-tag-names": "warn"
        }
    }
];
