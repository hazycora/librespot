import LoginRequest from './messages/LoginRequest.js'
import LoginResponse from './messages/LoginResponse.js'

const URL_V3 = 'https://login5.spotify.com/v3/login'
const URL_V4 = 'https://login5.spotify.com/v4/login'

export interface Login5Credentials {
	username: string
	password?: string
	stored_credential?: Buffer
}

interface Login5Request {
	client_id: string,
	device_id: string,
	credentials: Login5Credentials,
	login_context?: Buffer,
	solutions?: [Buffer],
	interaction?: {
		uri: string,
		nonce: string,
		ui_locales: string,
	},
}

export default class Login5Client {
	clientId: string
	deviceId: string
	init = false
	loginRequest: LoginRequest = new LoginRequest()
	loginResponse: LoginResponse = new LoginResponse()

	refreshCredentials?: Login5Credentials

	constructor(clientId: string, deviceId: string) {
		this.clientId = clientId
		this.deviceId = deviceId
	}

	async login(credentials: Login5Credentials) {
		const response = await this.#flow(credentials)
		this.refreshCredentials = {
			username: response.username,
			stored_credential: response.storedCredential
		}
		return response
	}

	async refresh() {
		if (!this.refreshCredentials)
			throw new Error('Cannot refresh token if not logged in')
		return await this.#flow(this.refreshCredentials)
	}

	async #flow(credentials: Login5Credentials) {
		let params: Login5Request = {
			client_id: this.clientId,
			device_id: this.deviceId,
			credentials,
		}

		if (credentials.password) {
			params.interaction = {
				uri: 'https://auth-callback.spotify.com/r/android/music/login',
				nonce: this.uuidv4(),
				ui_locales: 'en'
			}
		}

		const response = await this.call(params)

		if (response.challenges) {
			const loginContext = response.loginContext
			const challenge = response.challenges.challenges[0].hashcash

			const solution = await this.solveHashcash(
				loginContext,
				challenge.prefix,
				challenge.length
			)

			params = {
				...params,
				login_context: loginContext,
				solutions: [solution]
			}

			const resp = await this.call(params)
			if (resp.ok) return resp.ok
			else if ('error' in resp) this.handleError(resp.error)
			else if (resp.challenges) throw new Error("Multiple challenges received")
		} else if (response.ok) return response.ok
		else if ('error' in response) this.handleError(response.error)
	}

	handleError(error: number) {
		let description = 'Unknown error'
		switch (error) {
			case 1:
				description = 'Invalid credentials'
				break
			case 2:
				description = 'Bad request'
				break
			case 3:
				description = 'Unsupported login protocol'
				break
			case 4:
				description = 'Timeout'
				break
			case 5:
				description = 'Unknown identifier'
				break
			case 6:
				description = 'Too many attempts'
				break
			case 7:
				description = 'Invalid phone number'
				break
			case 8:
				description = 'Try again later'
				break
		}
		throw new Error(description)
	}

	async call(params: Login5Request) {
		if (!this.init) {
			this.loginRequest = await new LoginRequest().init()
			this.loginResponse = await new LoginResponse().init()
			this.init = true
		}
		
		let url = URL_V3
		if (params.interaction) {
			url = URL_V4
		}

		this.loginRequest.from(params)
		const encodedRequest = this.loginRequest.encode()
		const resp = await fetch(url, { method: 'POST', body: encodedRequest, headers: {
			'cache-control': 'no-cache, no-store, max-age=0',
			'user-agent': 'Spotify/8.9.86.551 Android/34 (sdk_gphone64_x86_64)',
			'content-type': 'application/x-protobuf',
		} })
		this.loginResponse.from(Buffer.from(await resp.arrayBuffer()))
		return this.loginResponse.payload
	}

	async solveHashcash(loginContext: Buffer, prefix: Buffer, length: number) {
		const contextSum = await globalThis.crypto.subtle.digest(
			'SHA-1',
			loginContext
		)
		const view = new DataView(contextSum)
		const target = view.getBigUint64(12, false)

		let counter = BigInt(0)

		// eslint-disable-next-line no-constant-condition
		while (true) {
			const suffix = new ArrayBuffer(16)
			const suffixView = new DataView(suffix)
			suffixView.setBigUint64(0, target + counter, false)
			suffixView.setBigUint64(8, counter, false)

			const sum = await globalThis.crypto.subtle.digest(
				'SHA-1',
				Buffer.concat([prefix, Buffer.from(suffix)])
			)
			const sumView = new DataView(sum)

			if (this.countTrailingZeros(sumView.getBigUint64(12, false)) >= length)
				return Buffer.from(suffix)

			counter += BigInt(1)
		}
	}

	countTrailingZeros(n: bigint) {
		const bit = n.toString(2).split('')
		let zero = 0
		for (let i = 63; i >= 0; i--) {
			if (bit[i] == '0') zero++
			else break
		}

		return zero
	}

	// https://stackoverflow.com/a/2117523
	uuidv4() {
		return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
		  	(+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
		)
	}
}
