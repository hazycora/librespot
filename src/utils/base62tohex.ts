export default function base62toHex(str: string): string {
	const charset =
		'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
	const base = BigInt(62)
	const value = str
		.split('')
		.reverse()
		.reduce(
			(prev, char, i) =>
				prev + BigInt(charset.indexOf(char)) * base ** BigInt(i),
			BigInt(0)
		)
		.toString(16)
	return value.padStart(32, '0')
}
