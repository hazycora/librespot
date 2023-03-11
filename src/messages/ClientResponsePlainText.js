import HandshakeMessage from './HandshakeMessage.js'

export default class ClientResponsePlainText extends HandshakeMessage {
	constructor() {
		super('keyexchange.proto', 'ClientResponsePlaintext')
	}

	fromObject({ hmac }) {
		this.payload = {
			loginCryptoResponse: {
				diffieHellman: {
					hmac
				}
			},
			powResponse: {},
			cryptoResponse: {}
		}
	}
}
