import { fetch } from 'undici'

type Service = 'accesspoint' | 'spclient'

export async function getRandomOf(service: Service) {
	const serviceReq = await fetch(
		`http://apresolve.spotify.com/?type=${encodeURIComponent(service)}`
	)
	const { [service]: list } = <{ [service in Service]: string[] }>(
		await serviceReq.json()
	)
	const randomEndpointIndex = Math.floor(Math.random() * list.length)
	return list[randomEndpointIndex]
}

export async function getRandomAP() {
	return getRandomOf('accesspoint')
}

export async function getRandomSpclient() {
	return getRandomOf('spclient')
}
