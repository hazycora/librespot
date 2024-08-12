import { fetch, Request, RequestInit, Response } from 'undici'
import { getRandomSpclient } from './utils/getService.js'
import timeout from './utils/timeout.js'
import LibrespotSession from './session/index.js'
import LibrespotBrowse from './browse.js'
import LibrespotGet from './get.js'
import LibrespotPlayer from './player.js'
import { randomBytes } from 'crypto'
import { LibrespotSessionOptions, QualityOption } from './utils/types.js'
import { PagedResponse, RawSpotifyAuthResponse } from './utils/rawtypes.js'
import { text } from '@clack/prompts'
import { generateCodeChallenge, generateRandomString } from './utils/random.js'
import { parseAuthorization } from './utils/parse.js'

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
	username: string
	accessToken: string
	expiresAt: Date
	tokenType: 'Bearer'
	scopes: string[]
	constructor(token: {
		username: string
		accessToken: string
		expiresAt: Date
		tokenType: 'Bearer'
		scopes: string[]
	}) {
		this.username = token.username
		this.accessToken = token.accessToken
		this.expiresAt = token.expiresAt
		this.tokenType = token.tokenType
		this.scopes = token.scopes
	}
	isExpired() {
		return Date.now() > this.expiresAt.getTime()
	}
}

export interface LibrespotOptions {
	clientId?: string
	deviceId?: string
	scopes?: string[]
	sessionOptions?: Partial<LibrespotSessionOptions>
}

export interface LibrespotCredentials {
	username: string
	accessToken: string
	refreshToken: string
	expiresAt: Date
	scopes?: string[]
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

	constructor(options: LibrespotOptions, credentials?: LibrespotCredentials) {
		options = {
			clientId: '65b708073fc0480ea92a077233ca87bd',
			scopes: defaultScopes,
			...options
		}
		this.keySequence = 0
		this.session = undefined
		this.deviceId = options.deviceId ?? randomBytes(20).toString('hex')
		this.options = options
		if (credentials) {
			this.credentials = credentials
		}

		this.sessionOptions = {
			deviceId: this.deviceId,
			...(options.sessionOptions ?? {})
		}
	}

	async oauthGetUrl(scopes = defaultScopes) {
		const scope = scopes.join(' ')
		const clientId = `${this.options.clientId}`
		const redirectUri = `http://127.0.0.1/login`

		const { codeVerifier, codeChallenge } = await generateCodeChallenge()

		const params = new URLSearchParams({
			response_type: 'code',
			client_id: clientId,
			scope,
			code_challenge_method: 'S256',
			code_challenge: codeChallenge,
			redirect_uri: redirectUri
		})
		const url = `https://accounts.spotify.com/authorize?${params.toString()}`
		return { url, codeVerifier, redirectUri }
	}

	async oauthGetToken(
		code: string,
		codeVerifier: string,
		redirectUri = `http://127.0.0.1/login`
	) {
		const clientId = `${this.options.clientId}`
		const resp = await fetch('https://accounts.spotify.com/api/token', {
			method: 'post',
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				client_id: clientId,
				code: code.toString(),
				code_verifier: codeVerifier,
				redirect_uri: redirectUri
			}),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		})

		const respJson = <RawSpotifyAuthResponse>await resp.json()
		return parseAuthorization(respJson)
	}

	async login() {
		const clientId = `${this.options.clientId}`
		if (this.credentials?.refreshToken) {
			const resp = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: this.credentials.refreshToken,
					client_id: clientId
				})
			})
			const authResponse = <RawSpotifyAuthResponse>await resp.json()
			const authorization = parseAuthorization(authResponse)
			this.token = new LibrespotToken(authorization)
			await this.connectToSP()
			return
		}
		const { url, codeVerifier, redirectUri } = await this.oauthGetUrl()
		console.log('Visit:', url)
		console.log('Then copy the code at the destination URL')
		let codeAnswer = await text({
			message: 'What is your code?'
		}).then(code => code.toString())

		let code: string
		if (codeAnswer.startsWith('http://') || codeAnswer.startsWith('https://')) {
			const answerUrl = new URL(codeAnswer)
			code = answerUrl.searchParams.get('code') || ''
		} else {
			code = codeAnswer
		}

		const authorization = await this.oauthGetToken(
			code,
			codeVerifier,
			redirectUri
		)
		this.token = new LibrespotToken(authorization)
		console.log(authorization)
		await this.connectToSP()
	}

	async connectToSP() {
		if (!this.token) throw new Error('Not logged in')
		this.spclient = await getRandomSpclient()
		this.session = new LibrespotSession(this.sessionOptions)
		await this.session.setup(this.token.username, this.token.accessToken)
		this.token = await this.getToken()
		if (this.isPremium()) this.maxQuality = 2
	}

	async relogin() {
		if (!this.credentials) throw new Error('No credentials')
		return this.login()
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

	async getToken(): Promise<LibrespotToken> {
		if (!this.session) throw new Error('Not logged in')
		if (this.token && !this.token.isExpired()) {
			return this.token
		}
		await this.login()
		return this.token!
	}

	async fetchWithAuth(
		resource: Request | string,
		init?: RequestInit
	): Promise<Response> {
		if (typeof resource == 'string') {
			if (!resource.startsWith('https://')) {
				resource = `https://${this.spclient}${resource}`
			}
			resource = new Request(resource)
		}
		init = init ?? {}
		init.headers = (init.headers ?? {}) as { [key: string]: string }
		init.headers['Authorization'] = `Bearer ${
			(await this.getToken()).accessToken
		}`
		const resp = <Response>await timeout(fetch(resource, init))
		if (!resp.ok) {
			console.log('??:', await resp.text())
			throw new Error(resp.status + ' error code on ' + resource.url)
		}
		return resp
	}

	async loopNext<T>(url: string, maxPages?: number): Promise<T[]> {
		maxPages = maxPages ?? Infinity
		const items = []
		let resp = <PagedResponse<T>>await (
			await this.fetchWithAuth(url, {
				headers: {
					Accept: 'application/json'
				}
			})
		).json()
		items.push(...resp.items)
		let pageCount = 1
		while (resp.next && pageCount < maxPages) {
			resp = <PagedResponse<T>>await (
				await this.fetchWithAuth(resp.next, {
					headers: {
						Accept: 'application/json'
					}
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
			const sequenceBuffer = Buffer.alloc(4)
			sequenceBuffer.writeUintBE(this.keySequence, 0, 4)
			const finalBuf = Buffer.concat([
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

	player = new LibrespotPlayer(this)
}
