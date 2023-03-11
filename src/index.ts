import fetch, { Response } from 'node-fetch'
import { getRandomSpclient } from './utils/getService.js'
import timeout from './utils/timeout.js'
import LibrespotSession from './session/index.js'
import LibrespotBrowse from './browse.js'
import LibrespotGet from './get.js'
import { randomBytes } from 'crypto'

const defaultScopes = [
	'user-read-playback-state',
	'user-read-private',
	'user-read-birthdate',
	'user-read-email',
	'playlist-read-private',
	'user-library-read',
	'user-library-modify',
	'user-top-read',
	'playlist-read-collaborative',
	'playlist-modify-public',
	'playlist-modify-private',
	'user-follow-read',
	'user-follow-modify',
	'user-read-currently-playing',
	'user-modify-playback-state',
	'user-read-recently-played'
]

class LibrespotToken {
	accessToken: string
	expiresIn: number
	createdAt: number
	tokenType: 'Bearer'
	scopes: string[]
	permissions: number[]
	constructor(token: {
		accessToken: string
		expiresIn: number
		tokenType: 'Bearer'
		scope: string[]
		permissions: number[]
	}) {
		this.accessToken = token.accessToken
		this.expiresIn = token.expiresIn
		this.tokenType = token.tokenType
		this.scopes = token.scope
		this.permissions = token.permissions
		this.createdAt = Date.now()
	}
	isExpired() {
		return Date.now() > this.createdAt + this.expiresIn * 1000
	}
}

export default class Librespot {
	options: LibrespotOptions
	session?: LibrespotSession
	credentials?: LibrespotCredentials
	token?: LibrespotToken
	deviceId: string
	spclient?: string
	keySequence: number = 0
	sessionOptions: LibrespotSessionOptions
	maxQuality: QualityOption = 1

	constructor(options: LibrespotOptions) {
		options = {
			clientId: '65b708073fc0480ea92a077233ca87bd',
			scopes: defaultScopes,
			...options
		}
		this.keySequence = 0
		this.session = undefined
		this.deviceId = options.deviceId ?? randomBytes(20).toString('hex')
		this.options = options

		this.sessionOptions = options.sessionOptions ?? {
			deviceId: this.deviceId
		}
	}

	async login(username: string, password: string) {
		this.spclient = await getRandomSpclient()
		this.credentials = {
			username,
			password
		}
		this.session = new LibrespotSession(this.sessionOptions)
		await this.session.setup(username, password)
		this.token = await this.getToken(this.options.scopes)
		if (this.isPremium()) this.maxQuality = 2
	}

	async relogin() {
		if (!this.credentials) throw new Error('No credentials')
		return this.login(this.credentials.username, this.credentials.password)
	}

	async disconnect() {
		if (!this.session) throw new Error('Not logged in')
		return this.session.close()
	}

	getAttribute(attribute: string): string | number {
		if (!this.session) throw new Error('Not logged in')
		return this.session.attributes[attribute]
	}

	isPremium() {
		return this.getAttribute('type') == 'premium'
	}

	async getToken(scopes?: string[]): Promise<LibrespotToken> {
		if (!this.session) throw new Error('Not logged in')
		scopes = scopes || defaultScopes
		if (this.token && !this.token.isExpired()) {
			if (this.token.scopes.every(scope => scopes?.includes(scope))) {
				return this.token
			}
		}
		const keymasterResponse = await this.session.sendMercuryRequest({
			uri: `hm://keymaster/token/authenticated?scope=${scopes.join(
				','
			)}&client_id=${this.options.clientId}&device_id=${this.deviceId}`,
			method: 'GET'
		})
		let tokenResponse = JSON.parse(keymasterResponse.payloads?.[0].toString())
		return new LibrespotToken(tokenResponse)
	}

	async fetchWithAuth(
		method: string,
		url: string,
		headers = {}
	): Promise<Response> {
		if (!url.startsWith('https://')) url = `https://${this.spclient}${url}`
		let resp = <Response>await timeout(
			fetch(url, {
				method,
				headers: {
					...headers,
					Authorization: `Bearer ${
						(
							await this.getToken(defaultScopes)
						).accessToken
					}`
				}
			})
		)
		if (!resp.ok) {
			throw new Error(resp.status + ' error code on ' + url)
		}
		return resp
	}

	async loopNext(url: string, maxPages?: number): Promise<any[]> {
		maxPages = maxPages ?? Infinity
		let items = []
		let resp = <PagedResponse>await (
			await this.fetchWithAuth('get', url, {
				Accept: 'application/json'
			})
		).json()
		items.push(...resp.items)
		let pageCount = 1
		while (resp.next && pageCount < maxPages) {
			resp = <PagedResponse>await (
				await this.fetchWithAuth('get', resp.next, {
					Accept: 'application/json'
				})
			).json()
			items.push(...resp.items)
			pageCount += 1
		}
		return items
	}

	getAudioKey(fileId: string, gid: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			if (!this.session) return reject('Not logged in')
			let sequenceBuffer = Buffer.alloc(4)
			sequenceBuffer.writeUintBE(this.keySequence, 0, 4)
			let finalBuf = Buffer.concat([
				Buffer.from(fileId, 'hex'),
				Buffer.from(gid, 'hex'),
				sequenceBuffer,
				Buffer.from([0x00, 0x00])
			])
			this.session.once('aes-key', e => {
				resolve(e.payload.subarray(4, e.payload.length))
			})
			this.keySequence += 1
			this.session.sendCommand(0x0c, finalBuf)
		})
	}

	browse = new LibrespotBrowse(this)

	get = new LibrespotGet(this)
}
