import {
	parseAlbum,
	parseArtist,
	parseEpisode,
	parsePlaylist,
	parsePodcast,
	parseTrack
} from './utils/parse.js'
import {
	SpotifyAlbum,
	SpotifyArtist,
	SpotifyTrack,
	SpotifyPlaylist,
	SpotifyPodcast,
	SpotifyEpisode
} from './utils/types.js'
import {
	SpotifyTypes,
	PagedResponse,
	RawSpotifyTrack,
	RawSpotifyAlbum,
	RawSpotifyPlaylist,
	RawSpotifyPodcast,
	RawSpotifyEpisode,
	RawSpotifyArtist
} from './utils/rawtypes.js'
import Librespot from './index.js'

type SpotifySectionItem =
	| SpotifyPlaylist
	| SpotifyAlbum
	| SpotifyArtist
	| SpotifyPodcast
	| SpotifyEpisode

interface SpotifySection {
	type: string
	title?: string
	items: SpotifySectionItem[]
}

interface SpotifySearch {
	artists?: SpotifyArtist[]
	albums?: SpotifyAlbum[]
	tracks?: SpotifyTrack[]
	playlists?: SpotifyPlaylist[]
	podcasts?: SpotifyPodcast[]
	episodes?: SpotifyEpisode[]
}

export default class LibrespotBrowse {
	#librespot: Librespot

	constructor(librespot: Librespot) {
		this.#librespot = librespot
	}

	async search(query: string, types?: SpotifyTypes[]): Promise<SpotifySearch> {
		types = types ?? ['artist', 'album', 'track', 'playlist', 'show', 'episode']
		interface RawSpotifySearch {
			artists?: PagedResponse<RawSpotifyArtist>
			albums?: PagedResponse<RawSpotifyAlbum>
			tracks?: PagedResponse<RawSpotifyTrack>
			playlists?: PagedResponse<RawSpotifyPlaylist>
			shows?: PagedResponse<RawSpotifyPodcast>
			episodes?: PagedResponse<RawSpotifyEpisode>
		}
		const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
			query
		)}&type=${encodeURIComponent(types.join(','))}`
		const resp = await this.#librespot.fetchWithAuth(url, {
			headers: {
				Accept: 'application/json'
			}
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

	async featuredPlaylists() {
		const data = <
			{ message: string; playlists: PagedResponse<RawSpotifyPlaylist> }
		>await (
			await this.#librespot.fetchWithAuth(
				`https://api.spotify.com/v1/browse/featured-playlists`
			)
		).json()
		return {
			message: data.message,
			playlists: data.playlists.items.map(parsePlaylist)
		}
	}

	async home(timezone?: string): Promise<{
		message: string
		sections: SpotifySection[]
	}> {
		const searchParams = new URLSearchParams({
			operationName: 'home',
			variables: JSON.stringify({
				timeZone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
			}),
			extensions: JSON.stringify({
				persistedQuery: {
					version: 1,
					sha256Hash:
						'63c412a34a2071adfd99b804ea2fe1d8e9c5fd7d248e29ca54cc97a7ca06b561'
				}
			})
		})
		const homeResp = await this.#librespot.fetchWithAuth(
			`https://api-partner.spotify.com/pathfinder/v1/query?${searchParams.toString()}`,
			{
				headers: {
					'app-platform': 'WebPlayer'
				}
			}
		)
		if (!homeResp.ok) {
			throw new Error(
				`Error ${homeResp.status} fetching home page: ${await homeResp.text()}`
			)
		}
		const resp = <
			{
				data: {
					home: {
						greeting: { text: string }
						sectionContainer: {
							sections: {
								items: {
									data: {
										__typename: string
										title?: { text: string }
									}
									sectionItems: {
										items: {
											content: {
												data: (
													| RawSpotifyTrack
													| RawSpotifyAlbum
													| RawSpotifyPlaylist
													| RawSpotifyPodcast
													| RawSpotifyEpisode
												) & {
													__typename:
														| 'Playlist'
														| 'Album'
														| 'Podcast'
														| 'Episode'
														| 'Artist'
														| 'Audiobook'
														| 'GenericError'
												}
											}
										}[]
									}
								}[]
							}
						}
					}
				}
			}
		>await homeResp.json()
		return {
			message: resp.data.home.greeting.text,
			sections: resp.data.home.sectionContainer.sections.items
				.map((e): SpotifySection => {
					const dat: SpotifySection = {
						type: e.data.__typename,
						items: <SpotifySectionItem[]>e.sectionItems.items
							.map((e): SpotifySectionItem | null => {
								const obj = e.content.data
								switch (obj?.__typename) {
									case 'Playlist': {
										return parsePlaylist(<RawSpotifyPlaylist>obj)
									}
									case 'Album': {
										return parseAlbum(<RawSpotifyAlbum>obj)
									}
									case 'Podcast': {
										return parsePodcast(<RawSpotifyPodcast>obj)
									}
									case 'Episode': {
										return parseEpisode(<RawSpotifyEpisode>obj)
									}
									case 'Artist': {
										return parseArtist(<RawSpotifyArtist>obj)
									}
									case 'Audiobook': {
										return null
									}
									case 'GenericError': {
										return null
									}
									case undefined: {
										return null
									}
									default: {
										console.error(
											'unknown type in homepage',
											obj?.__typename,
											obj
										)
										break
									}
								}
								return null
							})
							.filter((e: unknown) => e != null)
					}
					if (e.data.title?.text) dat.title = e.data.title.text
					return dat
				})
				.filter(e => e.items.length > 0)
		}
	}
}
