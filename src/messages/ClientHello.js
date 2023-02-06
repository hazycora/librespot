import HandshakeMessage from './HandshakeMessage.js'

export default class ClientHello extends HandshakeMessage {
	product
	productFlags
	platform

	constructor(options) {
		options = options??{}
        super (
            'keyexchange.proto',
            'ClientHello'
		)
		this.product = options.product
		this.productFlags = options.productFlags
		this.platform = options.platform
    }

    fromObject ({ publicKey }) {
        const nonce = Buffer.allocUnsafe(16);
        for(let i = 0; i < 16; i++) {
            nonce[i] = Math.floor(Math.random() * 0xFF)
        }
        this.payload = {
            buildInfo: {
                product: this.product??this.protoRoot.getEnum('Product').PRODUCT_PARTNER,
                productFlags: this.productFlags??[
                    this.protoRoot.getEnum('ProductFlags').PRODUCT_FLAG_NONE
                ],
                platform: this.platform??this.protoRoot.getEnum('Platform').PLATFORM_LINUX_X86,
                version: 0x10800000000
            },
            cryptosuitesSupported: [ this.protoRoot.getEnum('Cryptosuite').CRYPTO_SUITE_SHANNON ],
            loginCryptoHello: {
                diffieHellman: {
                    gc: publicKey,
                    serverKeysKnown: 1
                }
            },
            clientNonce: nonce,
            padding: Buffer.from([0x1e])
        }
    }
}