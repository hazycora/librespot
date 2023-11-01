declare module 'shannon-bindings'

interface Shannon {
	nonce: (data: Buffer) => void
	encrypt: (data: Buffer) => void
	decrypt: (data: Buffer) => void
	finish: (data: Buffer) => void
}
