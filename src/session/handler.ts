import { XMLParser } from 'fast-xml-parser'
import logger from '../utils/logger.js'
import LibrespotSession from './index.js'

export default async function ({
	cmd,
	payload,
	session
}: {
	cmd: number
	payload: Buffer
	session: LibrespotSession
}) {
	switch (cmd) {
		case 0x4:
			// PacketPing
			// Send back same data with cmd 0x49
			logger.info('> Ping?')
			session.sendCommand(0x49, payload)
			break
		case 0x4a:
			// PacketPongAck
			// Ignore
			logger.info('> Pong.')
			break
		case 0x1b: {
			// PacketCountryCode
			const country = payload.toString('utf-8')
			logger.info('Country:', country)
			break
		}
		case 0x50: {
			const parser = new XMLParser()
			const jObj = parser.parse(payload.toString())
			const newAttributes = jObj.products.product
			session.attributes = {
				...session.attributes,
				...newAttributes
			}
			break
		}
		case 0xb2:
		case 0xb3:
		case 0xb4:
		case 0xb5:
			// Mercury (unsupported)
			break
		case 0x0d:
			// Audio key (unsupported)
			break
		case 0x0e:
			// Audio key error (unsupported)
			break
	}
}
