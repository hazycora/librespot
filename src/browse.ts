import {
	parseAlbum,
	parseArtist,
	parseEpisode,
	parsePlaylist,
	parsePodcast,
	parseTrack
} from './utils/parse.js'
import Librespot from './index.js'

export default class LibrespotBrowse {
	#librespot: Librespot

	constructor(librespot: Librespot) {
		this.#librespot = librespot
	}

	async search(query: string, types?: SpotifyTypes[]): Promise<SpotifySearch> {
		types = types ?? ['artist', 'album', 'track', 'playlist', 'show', 'episode']
		interface RawSpotifySearch {
			artists?: PagedResponse
			albums?: PagedResponse
			tracks?: PagedResponse
			playlists?: PagedResponse
			shows?: PagedResponse
			episodes?: PagedResponse
		}
		let url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
			query
		)}&type=${encodeURIComponent(types.join(','))}`
		const resp = await this.#librespot.fetchWithAuth('get', url, {
			Accept: 'application/json'
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
}
