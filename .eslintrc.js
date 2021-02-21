const OFF = 0, WARN = 1, ERROR = 2;

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',  // Specifies the ESLint parser
    plugins: ["@typescript-eslint"],
    extends: ['plugin:@typescript-eslint/recommended',  // Uses the recommended rules from
        // the
        // @typescript-eslint/eslint-plugin
    ],
    parserOptions: {
        ecmaVersion: 2015,  // Allows for the parsing of modern ECMAScript
                            // features
        sourceType: 'module',  // Allows for the use of imports
    },
    rules: {
        // Place to specify ESLint rules. Can be used to overwrite rules
        // specified from the extended configs e.g.
        // "@typescript-eslint/explicit-function-return-type": "off",
        "max-len": [ERROR, 120],
        "prefer-const": [ERROR],
        "semi": [ERROR],
        "eqeqeq": [ERROR],
        "no-trailing-spaces": [ERROR],
        "quotes": [ERROR, 'single'],
        "arrow-spacing": [ERROR],
        "@typescript-eslint/explicit-member-accessibility": [OFF],
        "space-before-blocks": [ERROR],
        "comma-dangle": [ERROR, "always-multiline"],
        "@typescript-eslint/ban-ts-comment": [ERROR, {
            "ts-expect-error": false,
        }],
        "@typescript-eslint/interface-name-prefix": [OFF],
        "@typescript-eslint/no-var-requires": [WARN],
        "@typescript-eslint/no-use-before-define": [OFF],
        "@typescript-eslint/no-empty-function": [OFF],
        "@typescript-eslint/naming-convention": [ERROR, {
            selector: 'default',
            format: ['camelCase'],
        },
            {
                selector: 'typeParameter',
                format: ['StrictPascalCase'],
                // Multichar type parameters end with a T
                custom: {
                    "regex": "[a-z]^T",
                    "match": false,
                },
            },
            {
                selector: 'variable',
                format: ['camelCase', 'UPPER_CASE'],
            },
            {
                selector: ['typeLike', 'enumMember'],
                format: ['PascalCase'],
            },
            {
                selector: 'property',
                // Off because use interfaces for objects that come directly
                // from sql databases which are usually not camel cased.
                format: [],
            },
            {
                selector: 'interface',
                format: ['PascalCase'],
                // Interfaces dont start with an I
                custom: {
                    "regex": "^I[A-Z]",
                    "match": false,
                },
            },
        ],
        "@typescript-eslint/consistent-type-assertions": [WARN],
        "@typescript-eslint/member-ordering": [ERROR, {
            "default": ["field", "constructor", "method"],
        }], // Only FIXME and XXX are forbidden. TODO is still allowed
        "no-warning-comments": [ERROR, {"terms": ["fixme", "xxx"], "location": "start"}],
        "@typescript-eslint/no-inferrable-types": [OFF],
        "no-restricted-imports": [ERROR, {
            // Importing from the source folder is always an error.
            // Import from the dist folder of the yarn module instead
            patterns: ["**/src/ts/**"],
        }],
    },
    env: {
        browser: true, node: true,
    },
    "overrides": [
        {
            // enable the rule specifically for TypeScript files
            "files": ["*.ts", "*.tsx"],
            "rules": {
                "@typescript-eslint/explicit-member-accessibility": [ERROR,
                    {
                        accessibility: 'explicit',
                        overrides: {
                            accessors: 'explicit',
                            constructors: 'explicit',
                            methods: 'explicit',
                            properties: 'explicit',
                            parameterProperties: 'explicit',
                        },
                    },
                ],
            },
        },
        {
            "files": ["*.test.ts", "*.test.tsx"],
            "rules": {
                "@typescript-eslint/explicit-member-accessibility": [OFF],
            },
        },
    ],
};