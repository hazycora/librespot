export default {
	info: process.env.DEBUG ? console.log : () => { },
	warn: console.warn,
	error: console.error
}