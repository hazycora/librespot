import Message from './Message.js'

export default class MercuryHeader extends Message {
	constructor() {
		super('mercury.proto', 'Header')
	}

	fromObject({ contentType, ...rest } = {}) {
		this.payload = {
			...rest
		}
		if (contentType) {
			this.payload.content_type = contentType
		}
	}
}
