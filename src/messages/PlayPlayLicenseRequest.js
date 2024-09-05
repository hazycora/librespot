import Message from './Message.js'

export default class PlayPlayLicenseRequest extends Message {
	constructor() {
		super('playplay.proto', 'PlayPlayLicenseRequest')
	}

	fromObject(params) {
		this.payload = {
			version: params.version,
			token: params.token,
			interactivity: params.interactivity,
			contentType: params.content_type,
			timestamp: Math.floor(Date.now() / 1000)
		}
	}
}
