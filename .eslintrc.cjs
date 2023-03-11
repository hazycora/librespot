module.exports = {
	root: true,
	extends: ['eslint:recommended', 'prettier'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	},
	env: {
		browser: false,
		es2017: true,
		node: true
	},
	ignorePatterns: ['build/*', 'docs/*']
}
