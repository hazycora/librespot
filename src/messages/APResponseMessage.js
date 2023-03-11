import HandshakeMessage from './HandshakeMessage.js'

export default class APResponseMessage extends HandshakeMessage {
	constructor() {
		super('keyexchange.proto', 'APResponseMessage')
	}
}
