const FETCH_TIMEOUT = process.env.LIBRESPOT_FETCH_TIMEOUT
	? parseInt(process.env.LIBRESPOT_FETCH_TIMEOUT)
	: 20000

export default async function timeout(promise: Promise<any>) {
	let interval
	let value = await Promise.race([
		promise,
		new Promise((resolve, reject) => {
			interval = setTimeout(reject, FETCH_TIMEOUT, new Error('Timed out'))
		})
	])
	clearInterval(interval)
	return value
}
