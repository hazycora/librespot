import Message from './Message.js'

export default class APWelcome extends Message {
    constructor () {
        super(
            'authentication.proto',
            'APWelcome'
        )
    }
}