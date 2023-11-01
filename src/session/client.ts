import net from 'net'
import logger from '../utils/logger.js'

export default class Client {
	address: string
	port: number
	client: net.Socket
	dataReceived: Buffer
	readers: {
		nbOfBytes: number
		partial: boolean
		resolve: (buffer: Buffer | PromiseLike<Buffer>) => void
	}[]
	destroyed: boolean

	constructor(address: string, port: number) {
		this.destroyed = false
		this.address = address
		this.port = port
		this.client = new net.Socket()
		this.client.setKeepAlive(true)
		this.client.on('close', () => {
			logger.info('Connection closed.')
		})
		this.dataReceived = Buffer.from('')
		this.client.on('data', data => {
			logger.info('> Received data, length:', data.length)
			logger.info('> Buffered data length', this.dataReceived.length)
			this.dataReceived = Buffer.concat([this.dataReceived, data])
			for (let i = 0; i < this.readers.length; i++) {
				const { nbOfBytes, partial, resolve } = this.readers[i]
				const dataRead = this.readAndSlice(nbOfBytes)
				if (dataRead) {
					resolve(dataRead)
					this.readers.shift()
					if (partial) break
				} else {
					break
				}
			}
		})
		this.readers = []
	}

	connect() {
		return new Promise<void>(resolve =>
			this.client.connect(this.port, this.address, () => {
				logger.info('Connected to ' + this.address)
				resolve()
			})
		)
	}

	destroy() {
		this.destroyed = true
		this.client.destroy()
	}

	readAndSlice(nbOfBytes: number) {
		if (this.dataReceived.length >= nbOfBytes) {
			const readData = this.dataReceived.slice(0, nbOfBytes)
			this.dataReceived = this.dataReceived.slice(nbOfBytes)
			return readData
		}
		return null
	}

	read(nbOfBytes: number, { partial = false, prioritized = false } = {}) {
		logger.info('Trying to read', nbOfBytes, 'bytes')
		return new Promise<Buffer>(resolve => {
			const dataRead = this.readAndSlice(nbOfBytes)
			if (dataRead) return resolve(dataRead)
			this.readers[prioritized ? 'unshift' : 'push']({
				nbOfBytes,
				partial,
				resolve
			})
		})
	}

	write(payload: string | Buffer | Uint8Array) {
		this.client.write(payload)
	}

	async readHandshakePayload() {
		const length = await this.read(4, { partial: true })
		const payload = await this.read(length.readUInt32BE() - 4, {
			prioritized: true
		})
		return Buffer.concat([length, payload])
	}

	async readEncryptedPayload(shannon: Shannon) {
		const cmdBuffer = await this.read(1, { partial: true })
		shannon.decrypt(cmdBuffer)
		const sizeBuffer = await this.read(2, { partial: true, prioritized: true })
		shannon.decrypt(sizeBuffer)

		const cmd = cmdBuffer.readUInt8()
		const size = sizeBuffer.readUInt16BE()

		const payload = await this.read(size, { partial: true, prioritized: true })
		shannon.decrypt(payload)

		const mac = await this.read(4, { prioritized: true })

		const expectedMac = Buffer.alloc(4)
		shannon.finish(expectedMac)

		if (!expectedMac.equals(mac)) throw new Error('Received mac mismatch')

		logger.info('cmd: 0x' + cmd.toString(16).toUpperCase())

		return { cmd, payload }
	}
}
