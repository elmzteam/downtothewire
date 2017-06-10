module.exports = {
	"env": {
		"browser": true,
		"es6": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"rules": {
		// --init
		"indent": [
			"error",
			"tab",
			{ "SwitchCase": 1 }
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"never"
		],
		// Functional
		"eqeqeq": [
			"error",
			"always"
		],
		"no-eval": "error",
		"no-useless-escape": "error",
		"no-useless-return": "error",
		"no-use-before-define": [
			"error",
			{ "functions": false, "classes": true }
		],
		// Style
		"array-bracket-spacing": [
			"error",
			"never"
		],
		"block-spacing": [
			"error",
			"always"
		],
		"brace-style": "error",
		"camelcase": "error",
		"comma-style": "error",
		"comma-dangle": "error",
		"eol-last": "error",
		"func-call-spacing": "error",
		"global-require": "error",
		"key-spacing": "error",
		"max-len": ["warn", 120],
		"no-lonely-if": "error",
		"no-mixed-requires": "error",
		"no-multiple-empty-lines": "error",
		"no-negated-condition": "error",
		"no-trailing-spaces": "error",
		"no-unneeded-ternary": "error",
		"no-whitespace-before-property": "error",
		"object-curly-newline": "error",
		"object-curly-spacing": [
			"error",
			"always",
		],
		"space-in-parens": "error",
		// ES6
		"arrow-body-style": "error",
		"arrow-parens": "error",
		"arrow-spacing": "error",
		"no-confusing-arrow": [
			"error",
			{ "allowParens": true }
		],
		"no-useless-computed-key": "error",
		"no-useless-constructor": "error",
		"no-useless-rename": "error",
		"no-var": "error",
		"prefer-const": "warn",
		"prefer-numeric-literals": "error",
		"prefer-template": "warn",
		"template-curly-spacing": "error"
	}
}