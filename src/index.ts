import fetch, { Response } from 'node-fetch'
import audioDecrypt from './audio/decrypt.js'
import { getRandomSpclient } from './utils/getService.js'
import base62toHex from './utils/base62tohex.js'
import LibrespotSession from './session/index.js'
import { randomBytes } from 'crypto'
import { Readable } from 'stream'
import { parseAlbum, parsePlaylist, parsePlaylistTrack, parseTrack } from './utils/parse.js'

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
	}
	
	async relogin() {
		return this.login(this.credentials.username, this.credentials.password)
	}

	async disconnect() {
		return this.session.close()
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
		let tracks = []
		let resp = await (await this.fetchWithAuth('get', `https://api.spotify.com/v1/playlists/${albumId}/tracks`, {
			'Accept': 'application/json'
		})).json()
		tracks.push(...resp.items)
		while (resp.next) {
			resp = await (await this.fetchWithAuth('get', resp.next, {
				'Accept': 'application/json'
			})).json()
			tracks.push(...resp.items)
		}
		return tracks.map(parsePlaylistTrack)
	}

	async getAlbumMetadata(albumId: string): Promise<SpotifyAlbum> {
		let resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/albums/${albumId}`, {
			'Accept': 'application/json'
		})
		return parseAlbum(await resp.json())
	}

	async getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
		let tracks = []
		let resp = await (await this.fetchWithAuth('get', `https://api.spotify.com/v1/albums/${albumId}/tracks`, {
			'Accept': 'application/json'
		})).json()
		tracks.push(...resp.items)
		while (resp.next) {
			resp = await (await this.fetchWithAuth('get', resp.next, {
				'Accept': 'application/json'
			})).json()
			tracks.push(...resp.items)
		}
		return tracks.map(parseTrack)
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

	async getTrackStream(trackId: string): Promise<{ sizeBytes: number, stream: Readable }> {
		const trackMetadata4 = await (await this.fetchWithAuth('get', `/metadata/4/track/${base62toHex(trackId)}`, {
			'Accept': 'application/json'
		})).json()
		const resp = await this.fetchWithAuth('get', `/storage-resolve/files/audio/interactive/${trackMetadata4.file[1].file_id}?alt=json`, {
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

	async getTrack(trackId: string): Promise<{ metadata: SpotifyTrack, sizeBytes: number, stream: Readable }> {
		const [trackStream, trackMetadata] = await Promise.all([
			this.getTrackStream(trackId),
			this.getTrackMetadata(trackId)
		])
		return {
			...trackStream,
			metadata: trackMetadata
		}
	}
}