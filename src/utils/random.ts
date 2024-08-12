export function generateRandomString(length: number) {
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const values = crypto.getRandomValues(new Uint8Array(length))
	return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

export async function generateCodeChallenge() {
	const codeVerifier = generateRandomString(64)
	const codeVerifierBuffer = new TextEncoder().encode(codeVerifier)
	const hashBuffer = await globalThis.crypto.subtle.digest(
		'SHA-256',
		codeVerifierBuffer
	)
	const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
	return {
		codeVerifier,
		codeChallenge
	}
}
