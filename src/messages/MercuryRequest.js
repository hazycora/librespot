import Message from './Message.js'

export default class MercuryRequest extends Message {
	constructor() {
		super('mercury.proto', 'MercuryRequest')
	}

	fromObject({ uri, body = null, etag = null, contentType = null } = {}) {
		this.payload = {
			uri,
			body,
			etag,
			content_type: contentType
		}
	}
}
