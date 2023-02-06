import Message from './Message.js'

export default class MercuryResponse extends Message {
    constructor () {
        super (
            'mercury.proto',
            'MercuryResponse'
        )
    }
}