import { fetch, Request, RequestInit, Response } from 'undici'
import { getRandomSpclient } from './utils/getService.js'
import timeout from './utils/timeout.js'
import LibrespotSession from './session/index.js'
import LibrespotBrowse from './browse.js'
import LibrespotGet from './get.js'
import LibrespotPlayer from './player.js'
import { randomBytes } from 'crypto'
import { LibrespotSessionOptions, QualityOption } from './utils/types.js'
import { PagedResponse } from './utils/rawtypes.js'
import Login5Client, { Login5Credentials } from './session/login5.js'
import PlayPlayClient from './playplay.js'

class LibrespotToken {
	accessToken: string
	expiresIn: number
	createdAt: number
	constructor(token: { accessToken: string; accessTokenExpiresIn: number }) {
		this.accessToken = token.accessToken
		this.expiresIn = token.accessTokenExpiresIn
		this.createdAt = Date.now()
	}
	isExpired() {
		return Date.now() > this.createdAt + this.expiresIn * 1000
	}
}

export interface LibrespotOptions {
	clientId?: string
	deviceId?: string
	sessionOptions?: Partial<LibrespotSessionOptions>
}

export default class Librespot {
	options: LibrespotOptions
	session?: LibrespotSession
	login5?: Login5Client
	credentials?: Login5Credentials
	token?: LibrespotToken
	deviceId: string
	spclient?: string
	keySequence: number = 0
	sessionOptions: LibrespotSessionOptions
	maxQuality: QualityOption = 1
	premium?: boolean

	constructor(options: LibrespotOptions) {
		options = {
			clientId: '9a8d2f0ce77a4e248bb71fefcb557637',
			...options
		}
		this.keySequence = 0
		this.session = undefined
		this.deviceId = options.deviceId ?? randomBytes(8).toString('hex')
		this.options = options

		this.sessionOptions = {
			deviceId: this.deviceId,
			...(options.sessionOptions ?? {})
		}
	}

	async login(username: string, password: string) {
		this.credentials = {
			username,
			password
		}
		return await this.setupSession(this.credentials)
	}

	async loginWithStoredCreds(username: string, storedCredential: string) {
		this.credentials = {
			username,
			stored_credential: Buffer.from(storedCredential)
		}
		return await this.setupSession(this.credentials)
	}

	async setupSession(credentials: Login5Credentials) {
		this.spclient = await getRandomSpclient()
		this.login5 = new Login5Client(this.options.clientId!, this.deviceId)
		const loginResponse = await this.login5.login(credentials)
		this.session = new LibrespotSession(this.sessionOptions)
		await this.session.setup(
			loginResponse.username,
			loginResponse.storedCredential
		)
		this.token = new LibrespotToken(loginResponse)
		if (await (this.isPremium())) this.maxQuality = 2
	}

	getStoredCredentials() {
		const refresh = this.login5?.refreshCredentials 
		if (!refresh) throw new Error('Not logged in')
		return {
			username: refresh.username,
			storedCredential: refresh.stored_credential!.toString()
		}
	}

	async relogin() {
		if (!this.credentials) throw new Error('No credentials')
		return await this.setupSession(this.credentials)
	}

	async disconnect() {
		if (!this.session) return
		return this.session.close()
	}

	getAttribute(attribute: string): string | number {
		if (!this.session) throw new Error('Not logged in')
		return this.session.attributes[attribute]
	}

	async isPremium() {
		if (typeof this.premium == 'boolean') return this.premium
		const check = (await this.get.me()).plan == 'premium'
		this.premium = check
		return check
	}

	async getToken(): Promise<LibrespotToken> {
		if (!this.session) throw new Error('Not logged in')
		if (this.token && !this.token.isExpired()) {
			return this.token
		}
		const tokenResponse = await this.login5?.refresh()
		this.token = new LibrespotToken(tokenResponse)
		return this.token
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

	browse = new LibrespotBrowse(this)

	get = new LibrespotGet(this)

	player = new LibrespotPlayer(this)

	playplay = new PlayPlayClient(this)
}
