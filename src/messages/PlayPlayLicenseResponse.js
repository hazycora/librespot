import Message from './Message.js'

export default class PlayPlayLicenseResponse extends Message {
	constructor() {
		super('playplay.proto', 'PlayPlayLicenseResponse')
	}
}
