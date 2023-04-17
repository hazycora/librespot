import stream from 'stream'
import crypto from 'crypto'

const iv = Buffer.from('72e067fbddcbcf77ebe8bc643f630d93', 'hex')

class skipTransform extends stream.Transform {
	toSkip = 0xa7
	_transform(chunk: Buffer, _encoding: string, callback: () => void) {
		if (this.toSkip > chunk.length) {
			this.toSkip -= chunk.length
		} else {
			if (this.toSkip !== chunk.length) this.push(chunk.subarray(this.toSkip))
			this.toSkip = 0
		}
		callback()
	}
}

export default function decrypt(
	readStream: stream.Readable | NodeJS.ReadableStream,
	key: Buffer
): stream.Readable {
	const readable =
		readStream instanceof ReadableStream
			? new stream.Readable().wrap(readStream)
			: readStream
	const decipher = crypto.createDecipheriv('AES-128-CTR', key, iv)
	return readable.pipe(decipher).pipe(new skipTransform())
}
