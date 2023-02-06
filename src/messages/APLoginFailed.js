import Message from './Message.js'

export default class APLoginFailed extends Message {
    constructor () {
        super(
            'keyexchange.proto',
            'APLoginFailed'
        )
		this.errorDescription = undefined
		this.errorCode = undefined
    }
}