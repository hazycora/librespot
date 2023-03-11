import Message from './Message.js'

export default class HandshakeMessage extends Message {
	constructor(...args) {
		super(...args)
	}

	from(argument) {
		if (argument instanceof Buffer) {
			this.payload = this.type.decode(argument.slice(4))
		} else {
			super.from(argument)
		}
	}
}
