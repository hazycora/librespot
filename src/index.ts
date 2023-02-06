import fetch, { Response } from 'node-fetch'
import audioDecrypt from './audio/decrypt.js'
import selectFile from './audio/selectFile.js'
import { getRandomSpclient } from './utils/getService.js'
import base62toHex from './utils/base62tohex.js'
import LibrespotSession from './session/index.js'
import { randomBytes } from 'crypto'
import { parseAlbum, parseArtist, parseEpisode, parsePlaylist, parsePlaylistTrack, parsePodcast, parseTrack } from './utils/parse.js'

const defaultScopes = [
	'user-read-playback-state',
	'user-read-private',
	'user-read-birthdate',
	'user-read-email',
	'playlist-read-private',
	'user-library-read',
	'user-library-modify',
	'user-top-read',
	'playlist-read-collaborative',
	'playlist-modify-public',
	'playlist-modify-private',
	'user-follow-read',
	'user-follow-modify',
	'user-read-currently-playing',
	'user-modify-playback-state',
	'user-read-recently-played'
]

class LibrespotToken {
	accessToken: string
	expiresIn: number
	createdAt: number
	tokenType: 'Bearer'
	scopes: string[]
	permissions: number[]
	constructor(token: {accessToken: string, expiresIn: number, tokenType: 'Bearer', scope: string[], permissions: number[]}) {
		this.accessToken = token.accessToken
		this.expiresIn = token.expiresIn
		this.tokenType = token.tokenType
		this.scopes = token.scope
		this.permissions = token.permissions
		this.createdAt = Date.now()
	}
	isExpired() {
		return Date.now()>(this.createdAt+this.expiresIn*1000)
	}
}

export default class Librespot {
	options: LibrespotOptions
	session?: LibrespotSession
	credentials: LibrespotCredentials
	token: LibrespotToken
	deviceId: string
	spclient: string
	keySequence: number
	sessionOptions: LibrespotSessionOptions
	maxQuality: QualityOption

	constructor(options: LibrespotOptions) {
		options = {
			clientId: '65b708073fc0480ea92a077233ca87bd',
			scopes: defaultScopes,
			...options
		}
		this.keySequence = 0
		this.session = null
		this.deviceId = randomBytes(20).toString('hex')
		this.options = options
		this.maxQuality = 1

		this.sessionOptions = options.sessionOptions ?? {
			deviceId: this.deviceId
		}
		if (this.options.deviceId && !options.sessionOptions.deviceId) {
			options.sessionOptions.deviceId = this.deviceId
		}
	}
	
	async login(username: string, password: string) {
		this.spclient = await getRandomSpclient()
		this.credentials = {
			username, password
		}
		this.session = new LibrespotSession(this.sessionOptions)
		await this.session.setup(username, password)
		this.token = await this.getToken(this.options.scopes)
		if (this.isPremium()) this.maxQuality = 2
	}
	
	async relogin() {
		return this.login(this.credentials.username, this.credentials.password)
	}

	async disconnect() {
		return this.session.close()
	}

	getAttribute(attribute: string): string|number {
		return this.session.attributes[attribute]
	}

	isPremium() {
		return this.getAttribute('type')=='premium'
	}

	async getToken(scopes: string[]): Promise<LibrespotToken> {
		if (this.token && !this.token.isExpired()) {
			if (this.token.scopes.every(scope => scopes.includes(scope))) {
				return this.token
			}
		}
		const keymasterResponse = await this.session.sendMercuryRequest({
			uri: `hm://keymaster/token/authenticated?scope=${scopes.join(',')}&client_id=${this.options.clientId}&device_id=${this.deviceId}`,
			method: 'GET'
		})
		let tokenResponse = JSON.parse(keymasterResponse.payloads[0].toString())
		return new LibrespotToken(tokenResponse)
	}

	async fetchWithAuth(method: string, url: string, headers = {}): Promise<Response> {
		if (!url.startsWith('https://')) url = `https://${this.spclient}${url}`
		let resp = await fetch(url, {
			method,
			headers: {
				...headers,
				"Authorization": `Bearer ${(await this.getToken(defaultScopes)).accessToken}`
			}
		})
		if (resp.status < 200 || resp.status >= 300) {
			throw new Error(resp.status+' error code on '+url)
		}
		return resp
	}
	
	async loopNext(url: string): Promise<any[]> {
		let items = []
		let resp = await (await this.fetchWithAuth('get', url, {
			'Accept': 'application/json'
		})).json()
		items.push(...resp.items)
		while (resp.next) {
			resp = await (await this.fetchWithAuth('get', resp.next, {
				'Accept': 'application/json'
			})).json()
			items.push(...resp.items)
		}
		return items
	}
	
	async getArtistMetadata(artistId: string): Promise<SpotifyArtist> {
		const resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/artists/${artistId}`, {
			'Accept': 'application/json'
		})
		return parseArtist(await resp.json())
	}
	
	async getArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/artists/${artistId}/albums`)).map(parseAlbum)
	}

	async getArtist(episodeId: string): Promise<SpotifyArtist> {
		const [artistMetadata, artistAlbums] = await Promise.all([
			this.getArtistMetadata(episodeId),
			this.getArtistAlbums(episodeId)
		])
		return {
			...artistMetadata,
			albums: artistAlbums
		}
	}

	async getPodcastMetadata(showId: string): Promise<SpotifyPodcast> {
		const resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/shows/${showId}`, {
			'Accept': 'application/json'
		})
		return parsePodcast(await resp.json())
	}

	async getEpisodeMetadata(episodeId: string): Promise<SpotifyEpisode> {
		const resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/episodes/${episodeId}`, {
			'Accept': 'application/json'
		})
		return parseEpisode(await resp.json())
	}

	async getTrackMetadata(trackId: string): Promise<SpotifyTrack> {
		const resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/tracks/${trackId}`, {
			'Accept': 'application/json'
		})
		return parseTrack(await resp.json())
	}

	async getPlaylistMetadata(playlistId: string): Promise<SpotifyPlaylist> {
		let resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/playlists/${playlistId}`, {
			'Accept': 'application/json'
		})
		return parsePlaylist(await resp.json())
	}

	async getPlaylistTracks(albumId: string): Promise<SpotifyTrack[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/playlists/${albumId}/tracks`)).map(parsePlaylistTrack)
	}

	async getAlbumMetadata(albumId: string): Promise<SpotifyAlbum> {
		let resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/albums/${albumId}`, {
			'Accept': 'application/json'
		})
		return parseAlbum(await resp.json())
	}

	async getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/albums/${albumId}/tracks`)).map(parsePlaylistTrack)
	}

	getAudioKey(fileId: string, gid: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			let sequenceBuffer = Buffer.alloc(4)
			sequenceBuffer.writeUintBE(this.keySequence, 0, 4)
			let finalBuf = Buffer.concat([
				Buffer.from(fileId, 'hex'),
				Buffer.from(gid, 'hex'),
				sequenceBuffer,
				Buffer.from([0x00, 0x00])
			])
			this.session.once('aes-key', e => {
				resolve(e.payload.subarray(4, e.payload.length))
			})
			this.keySequence += 1
			this.session.sendCommand(0x0c, finalBuf)
		})
	}

	async getTrackStream(trackId: string, maxQuality?: QualityOption): Promise<LibrespotStream> {
		const trackMetadata4 = await (await this.fetchWithAuth('get', `/metadata/4/track/${base62toHex(trackId)}`, {
			'Accept': 'application/json'
		})).json()
		const resp = await this.fetchWithAuth(
			'get',
			`/storage-resolve/files/audio/interactive/${selectFile(trackMetadata4.file, 'vorbis', maxQuality??this.maxQuality).file_id}?alt=json`, {
			"Accept": 'application/json'
		})
		const data = await resp.json()
		const key = await this.getAudioKey(data.fileid, trackMetadata4.gid)
		const cdnUrl = data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = await fetch(cdnUrl)

		return {
			sizeBytes: parseInt(cdnResp.headers.get('content-length'))-0xA7,
			stream: audioDecrypt(cdnResp.body, key),
		}
	}

	async getEpisodeStream(episodeId: string, maxQuality?: QualityOption): Promise<LibrespotStream> {
		const trackMetadata4 = await (await this.fetchWithAuth('get', `/metadata/4/episode/${base62toHex(episodeId)}`, {
			'Accept': 'application/json'
		})).json()
		const resp = await this.fetchWithAuth(
			'get',
			`/storage-resolve/files/audio/interactive/${selectFile(trackMetadata4.audio, 'vorbis', maxQuality??this.maxQuality).file_id}?alt=json`, {
			"Accept": 'application/json'
		})
		const data = await resp.json()
		const key = await this.getAudioKey(data.fileid, trackMetadata4.gid)
		const cdnUrl = data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = await fetch(cdnUrl)

		return {
			sizeBytes: parseInt(cdnResp.headers.get('content-length'))-0xA7,
			stream: audioDecrypt(cdnResp.body, key),
		}
	}

	async getTrack(trackId: string, maxQuality?: QualityOption): Promise<LibrespotStreamAndMetadata> {
		const [trackStream, trackMetadata] = await Promise.all([
			this.getTrackStream(trackId, maxQuality),
			this.getTrackMetadata(trackId)
		])
		return {
			...trackStream,
			metadata: trackMetadata
		}
	}

	async getEpisode(episodeId: string, maxQuality?: QualityOption): Promise<LibrespotStreamAndMetadata> {
		const [episodeStream, episodeMetadata] = await Promise.all([
			this.getEpisodeStream(episodeId, maxQuality),
			this.getEpisodeMetadata(episodeId)
		])
		return {
			...episodeStream,
			metadata: episodeMetadata
		}
	}

	getUri(spotifyUri: string, maxQuality?: QualityOption): Promise<LibrespotStreamAndMetadata|SpotifyArtist|SpotifyAlbum|SpotifyPlaylist|SpotifyPodcast> {
		let uriParts = spotifyUri.split(':')
		if (uriParts[0]!='spotify') throw new Error('Invalid Spotify URI')
		switch (uriParts[1]) {
			case 'artist': return this.getArtist(uriParts[2])
			case 'track': return this.getTrack(uriParts[2], maxQuality)
			case 'episode': return this.getEpisode(uriParts[2], maxQuality)
			case 'album': return this.getAlbumMetadata(uriParts[2])
			case 'playlist': return this.getPlaylistMetadata(uriParts[2])
			case 'show': return this.getPodcastMetadata(uriParts[2])
			default: throw new Error(`Unknown spotify URI ${spotifyUri}`)
		}
	}

	getUrl(spotifyUrl: string, maxQuality?: QualityOption) {
		let urlObj = new URL(spotifyUrl)
		let parts = urlObj.pathname.slice(1).split('/')
		if (parts.length > 2) throw new Error('Unknown Spotify URL')
		return this.getUri(`spotify:${parts[0]}:${parts[1]}`, maxQuality)
	}
}