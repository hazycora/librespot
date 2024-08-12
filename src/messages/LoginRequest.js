import Message from './Message.js'

export default class LoginRequest extends Message {
	constructor() {
		super('login5.proto', 'LoginRequest')
	}

	fromObject(params) {
		this.payload = {
			clientInfo: {
				clientId: params.client_id
			}
		}
		if (params.login_context) {
			this.payload.loginContext = params.login_context
		}
		if (params.credentials) {
			if (params.credentials.password) {
				this.payload.password = {
					id: params.credentials.username,
					password: params.credentials.password
				}
			} else {
				this.payload.storedCredential = {
					username: params.credentials.username,
					data: params.credentials.stored_credential
				}
			}
		}
		if (params.solutions) {
			const solutions = []
			for (const solution of params.solutions) {
				solutions.push({
					hashcash: {
						suffix: solution
					}
				})
			}
			this.payload.challengeSolutions = {
				solutions
			}
		}
	}
}
