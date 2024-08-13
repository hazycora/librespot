import LoginRequest from '../messages/LoginRequest.js'
import LoginResponse from '../messages/LoginResponse.js'

const URL = 'https://login5.spotify.com/v3/login'

interface Login5Credentials {
	username: string
	password?: string
	stored_credential?: Buffer
}

export default class Login5Client {
	clientId: string
	init = false
	loginRequest: LoginRequest = new LoginRequest()
	loginResponse: LoginResponse = new LoginResponse()

	refreshCredentials?: Login5Credentials

	constructor(clientId: string) {
		this.clientId = clientId
	}

	async login(username: string, password: string) {
		const response = await this.#flow({ username, password })
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
		const params = {
			client_id: this.clientId,
			credentials
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

			const params = {
				client_id: this.clientId,
				login_context: loginContext,
				credentials,
				solutions: [solution]
			}

			const resp = await this.call(params)
			if (resp.ok) return resp.ok
		} else if (response.ok) return response.ok
	}

	async call(params: object) {
		if (!this.init) {
			this.loginRequest = await new LoginRequest().init()
			this.loginResponse = await new LoginResponse().init()
			this.init = true
		}

		this.loginRequest.from(params)
		const encodedRequest = this.loginRequest.encode()
		const resp = await fetch(URL, { method: 'POST', body: encodedRequest })
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
}
