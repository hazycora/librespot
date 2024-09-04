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
			const sequenceNum = payload.readUInt32BE(0)
			const key = payload.subarray(4, payload.length)
			session.emit('aes-key', { sequenceNum, key })
			break
		case 0x0e:
			const seq = payload.readUInt32BE(0)
			const code1 = payload[4]
			const code2 = payload[5]
			session.emit('aes-key-error', { sequenceNum: seq, code1, code2 })
			break
	}
}
