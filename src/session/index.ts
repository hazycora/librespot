import crypto from 'crypto'
import EventEmitter from 'events'
import Shannon from 'shannon-bindings'
import Client from './client.js'
import logger from '../utils/logger.js'
import handler from './handler.js'
import MercuryManager from '../mercury/MercuryManager.js'
import MercuryMessage from '../mercury/MercuryMessage.js'

import {
	ClientHello,
	APResponseMessage,
	ClientResponsePlainText,
	ClientResponseEncrypted,
	APWelcome,
	APLoginFailed
} from '../messages/index.js'

interface ShannonObject {
	nonce: number
	shannon?: Shannon
}

interface HandshakeOptions {
	product?: number
	productFlags?: number[]
	platform?: number
}

class AuthenticationError extends Error {
	code?: number
	constructor(message: string, code?: number) {
		super(message)
		this.code = code
	}
}

export interface LibrespotSessionOptions {
	address?: string
	port?: number
	handshakeOptions?: HandshakeOptions
}

export default class LibrespotSession extends EventEmitter {
	address: string
	port: number
	diffie: crypto.DiffieHellmanGroup
	client: Client
	send: ShannonObject
	recv: ShannonObject
	mercury: MercuryManager
	destroyed: boolean
	handshakeOptions?: HandshakeOptions

	constructor({
		address = 'ap.spotify.com',
		port = 80,
		...options
	}: LibrespotSessionOptions) {
		super()
		this.destroyed = false
		this.address = address
		this.port = port
		this.diffie = crypto.getDiffieHellman('modp1')
		this.diffie.generateKeys()
		this.client = new Client(address, port)
		this.handshakeOptions = options.handshakeOptions
		this.send = {
			nonce: 0
		}
		this.recv = {
			nonce: 0
		}
		this.mercury = new MercuryManager(this)
	}

	close() {
		this.destroyed = true
		this.client.destroy()
	}

	async handshake() {
		await this.client.connect()

		const clientHello = await new ClientHello(this.handshakeOptions).init()
		clientHello.from({ publicKey: this.diffie.getPublicKey() })
		const clientHelloBuffer = clientHello.encode()

		const clientHelloMessageLength = Buffer.alloc(4)
		clientHelloMessageLength.writeInt32BE(2 + 4 + clientHelloBuffer.length)
		const clientHelloPayload = Buffer.concat([
			Buffer.from([0x00, 0x04]),
			clientHelloMessageLength,
			clientHelloBuffer
		])
		this.client.write(clientHelloPayload)

		const apResponsePayload = await this.client.readHandshakePayload()

		const apResponseMessage = await new APResponseMessage().init()
		apResponseMessage.from(apResponsePayload)

		const { challenge, loginFailed } = apResponseMessage.payload

		if (loginFailed) {
			throw new Error('Login failed. '+loginFailed)
		}

		const sharedKey = this.diffie.computeSecret(challenge.loginCryptoChallenge.diffieHellman.gs)
		const packets = Buffer.concat([
			clientHelloPayload,
			apResponsePayload
		])

		const accumulator = []
		for (let i = 1; i < 6; i++) {
			const target = Buffer.concat([
				packets,
				Buffer.from([i])
			])
			const iteration = crypto.createHmac('sha1', sharedKey).update(target).digest()
			accumulator.push(iteration)
		}

		const challengeKeysBuffer = Buffer.concat(accumulator)
		const challengeHmac = crypto.createHmac('sha1', challengeKeysBuffer.slice(0, 20)).update(packets).digest()

		this.send.shannon = new Shannon(challengeKeysBuffer.slice(20, 52))
		this.recv.shannon = new Shannon(challengeKeysBuffer.slice(52, 84))

		const clientResponse = await new ClientResponsePlainText().init()
		clientResponse.from({ hmac: challengeHmac })
		const clientResponseBuffer = clientResponse.encode()

		const clientResponseMessageLength = Buffer.alloc(4)
		clientResponseMessageLength.writeInt32BE(4 + clientResponseBuffer.length)
		const clientResponsePayload = Buffer.concat([
			clientResponseMessageLength,
			clientResponseBuffer
		])
		this.client.write(clientResponsePayload)
	}

	async authenticate(credentials) {
		const clientResponse = await new ClientResponseEncrypted().init()
		clientResponse.from(credentials)
		const encodedResponse = clientResponse.encode()
		this.sendCommand(0xab, encodedResponse)
		const response = await this.receiveCommand()

		if (response.cmd === 0xac) {
			const apWelcome = await new APWelcome().init()
			apWelcome.from(response.payload)
			// logger.info(apWelcome.payload)
			logger.info('> Authentication Successful with user', apWelcome.payload.canonicalUsername)
		} else if (response.cmd === 0xad) {
			const apFailed = await new APLoginFailed().init()
			apFailed.from(response.payload)
			let description = 'Unknown error'
			switch (apFailed.payload.errorCode) {
				case 0xb:
					description = 'Account needs Spotify Premium'
					break
				case 0xc:
					description = 'Bad credentials'
					break
			}
			throw new AuthenticationError(description, apFailed.payload.errorCode)
		} else {
			throw new AuthenticationError('Unknown error')
		}
	}

	async startHandlerLoop() {
		while (!this.client.destroyed && !this.client.destroyed) {
			const { cmd, payload } = await this.receiveCommand()
			handler({ cmd, payload, session: this })
		}
	}

	receiveCommand() {
		const nonce = Buffer.allocUnsafe(4)
		nonce.writeUInt32BE(this.recv.nonce++)
		this.recv.shannon.nonce(nonce)
		return this.client.readEncryptedPayload(this.recv.shannon)
	}

	sendCommand(cmd: number, request: Uint8Array) {
		const size = Buffer.allocUnsafe(2)
		size.writeUInt16BE(request.length)
		const nonce = Buffer.allocUnsafe(4)
		nonce.writeUInt32BE(this.send.nonce++)
		this.send.shannon.nonce(nonce)

		let payload = Buffer.concat([
			Buffer.from([cmd]),
			size,
			request
		])
		const mac = Buffer.allocUnsafe(4)

		this.send.shannon.encrypt(payload)
		this.send.shannon.finish(mac)

		payload = Buffer.concat([
			payload,
			mac
		])

		return this.client.write(payload)
	}

	sendMercuryRequest(options, payloads?): Promise<MercuryMessage> {
		return new Promise((resolve, reject) => {
			this.mercury.send(options, payloads, resolve)
		})
	}

	parseMercuryRequest(payload) {
		return this.mercury.parse(payload)
	}
}
