import { fetch } from 'undici'

export async function getRandomOf(service) {
	const serviceReq = await fetch(
		`http://apresolve.spotify.com/?type=${encodeURIComponent(service)}`
	)
	const { [service]: list } = await serviceReq.json()
	const randomEndpointIndex = Math.floor(Math.random() * list.length)
	return list[randomEndpointIndex]
}

export async function getRandomAP() {
	return getRandomOf('accesspoint')
}

export async function getRandomSpclient() {
	return getRandomOf('spclient')
}
