import Message from './Message.js'

export default class ClientResponseEncrypted extends Message {
	constructor() {
		super('authentication.proto', 'ClientResponseEncrypted')
	}

	fromObject(credentials) {
		this.payload = {
			loginCredentials: {
				username: credentials.username,
				typ: credentials.auth_type,
				authData: credentials.auth_data
			},
			systemInfo: {
				os: 0x00,
				cpuFamily: 0x00,
				informationString: 'spotify_js',
				deviceId: credentials.device_id,
				versionString: '0.0.1'
			},
			versionString: '0.0.1'
		}
	}
}
