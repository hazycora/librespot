import fetch, { Response } from 'node-fetch'
import audioDecrypt from './audio/decrypt.js'
import selectFile from './audio/selectFile.js'
import timeout from './utils/timeout.js'
import Librespot from './index.js'
import base62toHex from './utils/base62tohex.js'
import {
	parseAlbum,
	parseArtist,
	parseEpisode,
	parsePlaylist,
	parsePlaylistTrack,
	parsePodcast,
	parseTrack,
	parseTrackColorLyrics,
	parseUser
} from './utils/parse.js'
import {
	SpotifyArtist,
	SpotifyTrack,
	SpotifyEpisode,
	SpotifyAlbum,
	SpotifyUser,
	SpotifyPlaylist,
	SpotifyPodcast,
	SpotifyPlaylistTrack,
	QualityOption
} from './utils/types.js'
import { Metadata4, RawSpotifyFileResponse } from './utils/rawtypes.js'

interface LibrespotStream {
	sizeBytes: number
	stream: NodeJS.ReadableStream
	hasLyrics?: boolean
}

interface LibrespotStreamAndMetadata extends LibrespotStream {
	metadata: SpotifyTrack | SpotifyEpisode
}

export default class LibrespotGet {
	#librespot: Librespot

	constructor(librespot: Librespot) {
		this.#librespot = librespot
	}

	async artistMetadata(artistId: string): Promise<SpotifyArtist> {
		const resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/artists/${artistId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parseArtist(await resp.json())
	}

	async artistAlbums(
		artistId: string,
		maxPages?: number
	): Promise<SpotifyAlbum[]> {
		return (
			await this.#librespot.loopNext(
				`https://api.spotify.com/v1/artists/${artistId}/albums`,
				maxPages
			)
		).map(parseAlbum)
	}

	async artist(episodeId: string, maxPages?: number): Promise<SpotifyArtist> {
		const [artistMetadata, artistAlbums] = await Promise.all([
			this.artistMetadata(episodeId),
			this.artistAlbums(episodeId, maxPages)
		])
		return {
			...artistMetadata,
			albums: artistAlbums
		}
	}

	async userMetadata(userId: string): Promise<SpotifyUser> {
		const resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/users/${userId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parseUser(await resp.json())
	}

	async userPlaylists(
		userId: string,
		maxPages?: number
	): Promise<SpotifyPlaylist[]> {
		return (
			await this.#librespot.loopNext(
				`https://api.spotify.com/v1/users/${userId}/playlists`,
				maxPages
			)
		).map(parsePlaylist)
	}

	async user(userId: string, maxPages?: number): Promise<SpotifyUser> {
		const [userMetadata, userPlaylists] = await Promise.all([
			this.userMetadata(userId),
			this.userPlaylists(userId, maxPages)
		])
		return {
			...userMetadata,
			playlists: userPlaylists
		}
	}

	async podcastMetadata(showId: string): Promise<SpotifyPodcast> {
		const resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/shows/${showId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parsePodcast(await resp.json())
	}

	async episodeMetadata(episodeId: string): Promise<SpotifyEpisode> {
		const resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/episodes/${episodeId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parseEpisode(await resp.json())
	}

	async trackMetadata(trackId: string): Promise<SpotifyTrack> {
		const resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/tracks/${trackId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parseTrack(await resp.json())
	}

	async trackColorLyrics(trackId: string) {
		let trackMetadata4 = <Metadata4>await (
			await this.#librespot.fetchWithAuth(
				`/metadata/4/track/${base62toHex(trackId)}`,
				{
					headers: {
						Accept: 'application/json'
					}
				}
			)
		).json()
		if (!trackMetadata4.has_lyrics) {
			throw new Error('Track does not have lyrics')
		}
		if (!trackMetadata4.album) {
			throw new Error('Track is not part of an album')
		}
		const coverArtworkId =
			trackMetadata4.album.cover_group.image[
				trackMetadata4.album.cover_group.image.length - 1
			].file_id
		let lyrics = await this.#librespot.fetchWithAuth(
			`/color-lyrics/v2/track/${trackId}/image/spotify:image:${encodeURIComponent(
				coverArtworkId
			)}?format=json&vocalRemoval=false&market=from_token`,
			{
				headers: {
					'app-platform': 'WebPlayer'
				}
			}
		)
		return parseTrackColorLyrics(await lyrics.json())
	}

	async playlistMetadata(playlistId: string): Promise<SpotifyPlaylist> {
		let resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/playlists/${playlistId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parsePlaylist(await resp.json())
	}

	async playlistTracks(
		albumId: string,
		maxPages?: number
	): Promise<SpotifyPlaylistTrack[]> {
		return (
			await this.#librespot.loopNext(
				`https://api.spotify.com/v1/playlists/${albumId}/tracks`,
				maxPages
			)
		).map(parsePlaylistTrack)
	}

	async playlist(albumId: string, maxPages?: number): Promise<SpotifyPlaylist> {
		const [playlistMetadata, playlistTracks] = await Promise.all([
			this.playlistMetadata(albumId),
			this.playlistTracks(albumId, maxPages)
		])
		return {
			...playlistMetadata,
			tracks: playlistTracks
		}
	}

	async albumMetadata(albumId: string): Promise<SpotifyAlbum> {
		let resp = await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/albums/${albumId}`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		return parseAlbum(await resp.json())
	}

	async albumTracks(
		albumId: string,
		maxPages?: number
	): Promise<SpotifyTrack[]> {
		return (
			await this.#librespot.loopNext(
				`https://api.spotify.com/v1/albums/${albumId}/tracks`,
				maxPages
			)
		).map(parseTrack)
	}

	async album(albumId: string, maxPages?: number): Promise<SpotifyAlbum> {
		const [albumMetadata, albumTracks] = await Promise.all([
			this.albumMetadata(albumId),
			this.albumTracks(albumId, maxPages)
		])
		return {
			...albumMetadata,
			tracks: albumTracks
		}
	}

	async trackStream(
		trackId: string,
		maxQuality?: QualityOption
	): Promise<LibrespotStream> {
		let trackMetadata4 = <Metadata4>await (
			await this.#librespot.fetchWithAuth(
				`/metadata/4/track/${base62toHex(trackId)}`,
				{
					headers: {
						Accept: 'application/json'
					}
				}
			)
		).json()
		if (!trackMetadata4.file && trackMetadata4.alternative)
			trackMetadata4 = trackMetadata4.alternative
		if (!trackMetadata4 || !trackMetadata4.file)
			throw new Error('Could not get file')
		const resp = await this.#librespot.fetchWithAuth(
			`/storage-resolve/files/audio/interactive/${
				selectFile(
					trackMetadata4.file,
					'vorbis',
					maxQuality ?? this.#librespot.maxQuality
				).file_id
			}?alt=json`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		const data = <RawSpotifyFileResponse>await resp.json()
		const key = await this.#librespot.getAudioKey(
			data.fileid,
			trackMetadata4.gid
		)
		const cdnUrl =
			data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = <Response>await timeout(fetch(cdnUrl))
		if (!cdnResp.body) throw new Error('Could not get stream')

		return {
			hasLyrics: trackMetadata4.has_lyrics,
			sizeBytes: parseInt(cdnResp.headers.get('content-length') ?? '0') - 0xa7,
			stream: audioDecrypt(cdnResp.body, key)
		}
	}

	async episodeStream(
		episodeId: string,
		maxQuality?: QualityOption
	): Promise<LibrespotStream> {
		const trackMetadata4 = <Metadata4>await (
			await this.#librespot.fetchWithAuth(
				`/metadata/4/episode/${base62toHex(episodeId)}`,
				{
					headers: {
						Accept: 'application/json'
					}
				}
			)
		).json()
		if (!trackMetadata4.audio) throw new Error('Could not get file')
		const resp = await this.#librespot.fetchWithAuth(
			`/storage-resolve/files/audio/interactive/${
				selectFile(
					trackMetadata4.audio,
					'vorbis',
					maxQuality ?? this.#librespot.maxQuality
				).file_id
			}?alt=json`,
			{
				headers: {
					Accept: 'application/json'
				}
			}
		)
		const data = <RawSpotifyFileResponse>await resp.json()
		const key = await this.#librespot.getAudioKey(
			data.fileid,
			trackMetadata4.gid
		)
		const cdnUrl =
			data.cdnurl[Math.round(Math.random() * (data.cdnurl.length - 1))]
		const cdnResp = <Response>await timeout(fetch(cdnUrl))
		if (!cdnResp.body) throw new Error('Could not get stream')

		return {
			sizeBytes: parseInt(cdnResp.headers.get('content-length') ?? '0') - 0xa7,
			stream: audioDecrypt(cdnResp.body, key)
		}
	}

	async track(
		trackId: string,
		maxQuality?: QualityOption
	): Promise<LibrespotStreamAndMetadata> {
		const [trackStream, trackMetadata] = await Promise.all([
			this.trackStream(trackId, maxQuality),
			this.trackMetadata(trackId)
		])
		return {
			...trackStream,
			metadata: trackMetadata
		}
	}

	async episode(
		episodeId: string,
		maxQuality?: QualityOption
	): Promise<LibrespotStreamAndMetadata> {
		const [episodeStream, episodeMetadata] = await Promise.all([
			this.episodeStream(episodeId, maxQuality),
			this.episodeMetadata(episodeId)
		])
		return {
			...episodeStream,
			metadata: episodeMetadata
		}
	}

	byUri(
		spotifyUri: string,
		max?: QualityOption | number
	): Promise<
		| LibrespotStreamAndMetadata
		| SpotifyUser
		| SpotifyArtist
		| SpotifyAlbum
		| SpotifyPlaylist
		| SpotifyPodcast
	> {
		let uriParts = spotifyUri.split(':')
		if (uriParts[0] != 'spotify') throw new Error('Invalid Spotify URI')
		switch (uriParts[1]) {
			case 'user':
				return this.user(uriParts[2], max)
			case 'artist':
				return this.artist(uriParts[2], max)
			case 'track':
				return this.track(uriParts[2], <QualityOption>max)
			case 'episode':
				return this.episode(uriParts[2], <QualityOption>max)
			case 'album':
				return this.album(uriParts[2], max)
			case 'playlist':
				return this.playlist(uriParts[2], max)
			case 'show':
				return this.podcastMetadata(uriParts[2])
			default:
				throw new Error(`Unknown spotify URI ${spotifyUri}`)
		}
	}

	byUrl(spotifyUrl: string, maxQuality?: QualityOption) {
		let urlObj = new URL(spotifyUrl)
		let parts = urlObj.pathname.slice(1).split('/')
		if (parts.length > 2) throw new Error('Unknown Spotify URL')
		return this.byUri(`spotify:${parts[0]}:${parts[1]}`, maxQuality)
	}
}
