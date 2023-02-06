import LibrespotSession, { LibrespotSessionOptions } from './session/index.js'
import { getRandomAP } from './utils/getService.js'
import logger from './utils/logger.js'
import { randomBytes } from 'crypto'

export { MakeLibrespotSessionOptions, LibrespotSession }

interface MakeLibrespotSessionOptions extends LibrespotSessionOptions {
	deviceId: string
}

export async function makeLibrespotSession(username: string, password: string, options: MakeLibrespotSessionOptions): Promise<LibrespotSession> {
	try {
		let address = 'ap.spotify.com'
		let port = 80
		try {
			[ address, port ] = (await getRandomAP()).split(':')
		} catch (error) {
			console.error(error)
			console.error('Error occured, using the default endpoint.')
		}

		logger.info('Connecting to address ' + address + ':' + port + ' …')

		const session = new LibrespotSession({
			...options,
			address,
			port
		})

		await session.handshake()

		let credentials = {
			username,
			auth_type: 0,
			auth_data: Buffer.from(password, 'utf-8'),
			device_id: options.deviceId
		}

		await session.authenticate(credentials)

		session.startHandlerLoop()

		return session
	} catch (error) {
		console.error(error)
	}
}