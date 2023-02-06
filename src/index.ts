import fetch, { Response } from 'node-fetch'
import audioDecrypt from './audio/decrypt.js'
import { getRandomSpclient } from './utils/getService.js'
import base62toHex from './utils/base62tohex.js'
import { makeLibrespotSession, LibrespotSession, MakeLibrespotSessionOptions } from './core.js'
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

interface LibrespotOptions {
	clientId?: string
	deviceId?: string
	scopes?: string[]
	sessionOptions?: MakeLibrespotSessionOptions
}

interface LibrespotCredentials {
	username: string
	password: string
}

class LibrespotToken {
	accessToken: string
	expiresIn: number
	createdAt: number
	tokenType: 'Bearer'
	scopes: string[]
	permissions: number[]
	constructor(token: {accessToken: string, expiresIn: number, tokenType: 'Bearer', scope: string[], permissions: number[]}) {
		this.accessToken = token.accessToken
		this.expiresIn = token.expiresIn
		this.tokenType = token.tokenType
		this.scopes = token.scope
		this.permissions = token.permissions
		this.createdAt = Date.now()
	}
	isExpired() {
		return Date.now()>(this.createdAt+this.expiresIn*1000)
	}
}

export default class Librespot {
	options: LibrespotOptions
	session?: LibrespotSession
	credentials: LibrespotCredentials
	token: LibrespotToken
	deviceId: string
	spclient: string
	keySequence: number
	sessionOptions: MakeLibrespotSessionOptions

	constructor(options: LibrespotOptions) {
		options = {
			clientId: '65b708073fc0480ea92a077233ca87bd',
			scopes: defaultScopes,
			...options
		}
		this.keySequence = 0
		this.session = null
		this.deviceId = randomBytes(20).toString('hex')
		this.options = options

		this.sessionOptions = options.sessionOptions ?? {
			deviceId: this.deviceId
		}
		if (this.options.deviceId && !options.sessionOptions.deviceId) {
			options.sessionOptions.deviceId = this.deviceId
		}
	}
	
	async login(username: string, password: string) {
		this.spclient = await getRandomSpclient()
		this.credentials = {
			username, password
		}
		this.session = await makeLibrespotSession(username, password, this.sessionOptions)
		this.token = await this.getToken(this.options.scopes)
	}
	
	async relogin() {
		return this.login(this.credentials.username, this.credentials.password)
	}

	async disconnect() {
		return this.session.close()
	}

	async getToken(scopes: string[]): Promise<LibrespotToken> {
		if (this.token && !this.token.isExpired()) {
			if (this.token.scopes.every(scope => scopes.includes(scope))) {
				return this.token
			}
		}
		const keymasterResponse = await this.session.sendMercuryRequest({
			uri: `hm://keymaster/token/authenticated?scope=${scopes.join(',')}&client_id=${this.options.clientId}&device_id=${this.deviceId}`,
			method: 'GET'
		})
		let tokenResponse = JSON.parse(keymasterResponse.payloads[0].toString())
		return new LibrespotToken(tokenResponse)
	}

	async sendHttpRequest(method: string, url: string, headers = {}): Promise<Response> {
		let resp = await fetch(`https://${this.spclient}${url}`, {
			method,
			headers: {
				...headers,
				"Authorization": `Bearer ${(await this.getToken(defaultScopes)).accessToken}`
			}
		})
		if (resp.status < 200 || resp.status >= 300) {
			throw new Error(resp.status+' error code on '+url)
		}
		return resp
	}

	async getTrackMetadata(trackId: string) {
		const resp = await this.sendHttpRequest('get', `/metadata/4/track/${base62toHex(trackId)}`, {
			'Accept': 'application/json'
		})
		return await resp.json()
	}

	getAudioKey(fileId: string, gid: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
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

	async getTrack(trackId: string) {
		const trackMetadata = await this.getTrackMetadata(trackId)
		const resp = await this.sendHttpRequest('get', `/storage-resolve/files/audio/interactive/${trackMetadata.file[1].file_id}?alt=json`, {
			"Accept": 'application/json'
		})
		const data = await resp.json()
		const key = await this.getAudioKey(data.fileid, trackMetadata.gid)
		const cdnUrl = data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = await fetch(cdnUrl)
		return {
			metadata: trackMetadata,
			size: cdnResp.headers['content-length']-0xA7,
			stream: audioDecrypt(cdnResp.body, key),
		}
	}
}