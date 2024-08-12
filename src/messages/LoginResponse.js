import Message from './Message.js'

export default class LoginResponse extends Message {
	constructor() {
		super('login5.proto', 'LoginResponse')
	}
}
