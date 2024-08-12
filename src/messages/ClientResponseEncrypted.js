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
				os: 1,
				cpuFamily: 2,
				informationString: 'spotify',
				deviceId: credentials.device_id
			},
			versionString: '0.0.1'
		}
	}
}
