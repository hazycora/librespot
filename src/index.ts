import fetch, { Response } from 'node-fetch'
import audioDecrypt from './audio/decrypt.js'
import selectFile from './audio/selectFile.js'
import { getRandomSpclient } from './utils/getService.js'
import base62toHex from './utils/base62tohex.js'
import LibrespotSession from './session/index.js'
import { randomBytes } from 'crypto'
import { parseAlbum, parseArtist, parseEpisode, parsePlaylist, parsePlaylistTrack, parsePodcast, parseTrack, parseUser } from './utils/parse.js'

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

const FETCH_TIMEOUT = process.env.LIBRESPOT_FETCH_TIMEOUT?parseInt(process.env.LIBRESPOT_FETCH_TIMEOUT):20000

async function timeout(promise: Promise<any>) {
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

export default class Librespot {
	options: LibrespotOptions
	session?: LibrespotSession
	credentials?: LibrespotCredentials
	token?: LibrespotToken
	deviceId: string
	spclient?: string
	keySequence: number = 0
	sessionOptions: LibrespotSessionOptions
	maxQuality: QualityOption = 1

	constructor(options: LibrespotOptions) {
		options = {
			clientId: '65b708073fc0480ea92a077233ca87bd',
			scopes: defaultScopes,
			...options
		}
		this.keySequence = 0
		this.session = undefined
		this.deviceId = options.deviceId??randomBytes(20).toString('hex')
		this.options = options

		this.sessionOptions = options.sessionOptions ?? {
			deviceId: this.deviceId
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
		if (!this.credentials) throw new Error('No credentials')
		return this.login(this.credentials.username, this.credentials.password)
	}

	async disconnect() {
		if (!this.session) throw new Error('Not logged in')
		return this.session.close()
	}

	getAttribute(attribute: string): string|number {
		if (!this.session) throw new Error('Not logged in')
		return this.session.attributes[attribute]
	}

	isPremium() {
		return this.getAttribute('type')=='premium'
	}

	async getToken(scopes?: string[]): Promise<LibrespotToken> {
		if (!this.session) throw new Error('Not logged in')
		scopes = scopes||defaultScopes
		if (this.token && !this.token.isExpired()) {
			if (this.token.scopes.every(scope => scopes?.includes(scope))) {
				return this.token
			}
		}
		const keymasterResponse = await this.session.sendMercuryRequest({
			uri: `hm://keymaster/token/authenticated?scope=${scopes.join(',')}&client_id=${this.options.clientId}&device_id=${this.deviceId}`,
			method: 'GET'
		})
		let tokenResponse = JSON.parse(keymasterResponse.payloads?.[0].toString())
		return new LibrespotToken(tokenResponse)
	}

	async fetchWithAuth(method: string, url: string, headers = {}): Promise<Response> {
		if (!url.startsWith('https://')) url = `https://${this.spclient}${url}`
		let resp = <Response>await timeout(fetch(url, {
			method,
			headers: {
				...headers,
				"Authorization": `Bearer ${(await this.getToken(defaultScopes)).accessToken}`
			}
		}))
		if (resp.status < 200 || resp.status >= 300) {
			throw new Error(resp.status+' error code on '+url)
		}
		return resp
	}
	
	async loopNext(url: string, maxPages?: number): Promise<any[]> {
		maxPages = maxPages??Infinity
		let items = []
		let resp = <PagedResponse>(await (await this.fetchWithAuth('get', url, {
			'Accept': 'application/json'
		})).json())
		items.push(...resp.items)
		let pageCount = 1
		while (resp.next&&pageCount<maxPages) {
			resp = <PagedResponse>(await (await this.fetchWithAuth('get', resp.next, {
				'Accept': 'application/json'
			})).json())
			items.push(...resp.items)
			pageCount += 1
		}
		return items
	}

	async getSearch(query: string, types?: SpotifyTypes[]): Promise<SpotifySearch> {
		types = types??[
			'artist',
			'album',
			'track',
			'playlist',
			'show',
			'episode'
		]
		interface RawSpotifySearch {
			artists?: PagedResponse
			albums?: PagedResponse
			tracks?: PagedResponse
			playlists?: PagedResponse
			shows?: PagedResponse
			episodes?: PagedResponse
		}
		let url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(types.join(','))}`
		const resp = await this.fetchWithAuth('get', url, {
			'Accept': 'application/json'
		})
		const results = <RawSpotifySearch>await resp.json()
		return {
			artists: results.artists?.items.map(parseArtist),
			albums: results.albums?.items.map(parseAlbum),
			tracks: results.tracks?.items.map(parseTrack),
			playlists: results.playlists?.items.map(parsePlaylist),
			podcasts: results.shows?.items.map(parsePodcast),
			episodes: results.episodes?.items.map(parseEpisode)
		}
	}
	
	async getArtistMetadata(artistId: string): Promise<SpotifyArtist> {
		const resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/artists/${artistId}`, {
			'Accept': 'application/json'
		})
		return parseArtist(await resp.json())
	}
	
	async getArtistAlbums(artistId: string, maxPages?: number): Promise<SpotifyAlbum[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/artists/${artistId}/albums`, maxPages)).map(parseAlbum)
	}

	async getArtist(episodeId: string, maxPages?: number): Promise<SpotifyArtist> {
		const [artistMetadata, artistAlbums] = await Promise.all([
			this.getArtistMetadata(episodeId),
			this.getArtistAlbums(episodeId, maxPages)
		])
		return {
			...artistMetadata,
			albums: artistAlbums
		}
	}
	
	async getUserMetadata(userId: string): Promise<SpotifyUser> {
		const resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/users/${userId}`, {
			'Accept': 'application/json'
		})
		return parseUser(await resp.json())
	}
	
	async getUserPlaylists(userId: string, maxPages?: number): Promise<SpotifyPlaylist[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/users/${userId}/playlists`, maxPages)).map(parsePlaylist)
	}

	async getUser(userId: string, maxPages?: number): Promise<SpotifyUser> {
		const [userMetadata, userPlaylists] = await Promise.all([
			this.getUserMetadata(userId),
			this.getUserPlaylists(userId, maxPages)
		])
		return {
			...userMetadata,
			playlists: userPlaylists
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

	async getPlaylistTracks(albumId: string, maxPages?: number): Promise<SpotifyPlaylistTrack[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/playlists/${albumId}/tracks`, maxPages)).map(parsePlaylistTrack)
	}

	async getPlaylist(albumId: string, maxPages?: number): Promise<SpotifyPlaylist> {
		const [playlistMetadata, playlistTracks] = await Promise.all([
			this.getPlaylistMetadata(albumId),
			this.getPlaylistTracks(albumId, maxPages)
		])
		return {
			...playlistMetadata,
			tracks: playlistTracks
		}
	}

	async getAlbumMetadata(albumId: string): Promise<SpotifyAlbum> {
		let resp = await this.fetchWithAuth('get', `https://api.spotify.com/v1/albums/${albumId}`, {
			'Accept': 'application/json'
		})
		return parseAlbum(await resp.json())
	}

	async getAlbumTracks(albumId: string, maxPages?: number): Promise<SpotifyTrack[]> {
		return (await this.loopNext(`https://api.spotify.com/v1/albums/${albumId}/tracks`, maxPages)).map(parseTrack)
	}

	async getAlbum(albumId: string, maxPages?: number): Promise<SpotifyAlbum> {
		const [albumMetadata, albumTracks] = await Promise.all([
			this.getAlbumMetadata(albumId),
			this.getAlbumTracks(albumId, maxPages)
		])
		return {
			...albumMetadata,
			tracks: albumTracks
		}
	}

	getAudioKey(fileId: string, gid: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			if (!this.session) return reject('Not logged in')
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
		let trackMetadata4 = <Metadata4>await (await this.fetchWithAuth('get', `/metadata/4/track/${base62toHex(trackId)}`, {
			'Accept': 'application/json'
		})).json()
		if (!trackMetadata4.file && trackMetadata4.alternative) trackMetadata4 = trackMetadata4.alternative
		if (!trackMetadata4||!trackMetadata4.file) throw new Error('Could not get file')
		const resp = await this.fetchWithAuth(
			'get',
			`/storage-resolve/files/audio/interactive/${selectFile(trackMetadata4.file, 'vorbis', maxQuality??this.maxQuality).file_id}?alt=json`, {
			"Accept": 'application/json'
		})
		const data = <RawSpotifyFileResponse>await resp.json()
		const key = await this.getAudioKey(data.fileid, trackMetadata4.gid)
		const cdnUrl = data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = <Response>await timeout(fetch(cdnUrl))
		if (!cdnResp.body) throw new Error('Could not get stream')

		return {
			sizeBytes: parseInt(cdnResp.headers.get('content-length')??'0')-0xA7,
			stream: audioDecrypt(cdnResp.body, key),
		}
	}

	async getEpisodeStream(episodeId: string, maxQuality?: QualityOption): Promise<LibrespotStream> {
		const trackMetadata4 = <Metadata4>await (await this.fetchWithAuth('get', `/metadata/4/episode/${base62toHex(episodeId)}`, {
			'Accept': 'application/json'
		})).json()
		if (!trackMetadata4.audio) throw new Error('Could not get file')
		const resp = await this.fetchWithAuth(
			'get',
			`/storage-resolve/files/audio/interactive/${selectFile(trackMetadata4.audio, 'vorbis', maxQuality??this.maxQuality).file_id}?alt=json`, {
			"Accept": 'application/json'
		})
		const data = <RawSpotifyFileResponse>await resp.json()
		const key = await this.getAudioKey(data.fileid, trackMetadata4.gid)
		const cdnUrl = data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = <Response>await timeout(fetch(cdnUrl))
		if (!cdnResp.body) throw new Error('Could not get stream')

		return {
			sizeBytes: parseInt(cdnResp.headers.get('content-length')??'0')-0xA7,
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

	getByUri(spotifyUri: string, max?: QualityOption|number): Promise<LibrespotStreamAndMetadata|SpotifyUser|SpotifyArtist|SpotifyAlbum|SpotifyPlaylist|SpotifyPodcast> {
		let uriParts = spotifyUri.split(':')
		if (uriParts[0]!='spotify') throw new Error('Invalid Spotify URI')
		switch (uriParts[1]) {
			case 'user': return this.getUser(uriParts[2], max)
			case 'artist': return this.getArtist(uriParts[2], max)
			case 'track': return this.getTrack(uriParts[2], <QualityOption>max)
			case 'episode': return this.getEpisode(uriParts[2], <QualityOption>max)
			case 'album': return this.getAlbum(uriParts[2], max)
			case 'playlist': return this.getPlaylist(uriParts[2], max)
			case 'show': return this.getPodcastMetadata(uriParts[2])
			default: throw new Error(`Unknown spotify URI ${spotifyUri}`)
		}
	}

	getByUrl(spotifyUrl: string, maxQuality?: QualityOption) {
		let urlObj = new URL(spotifyUrl)
		let parts = urlObj.pathname.slice(1).split('/')
		if (parts.length > 2) throw new Error('Unknown Spotify URL')
		return this.getByUri(`spotify:${parts[0]}:${parts[1]}`, maxQuality)
	}
}