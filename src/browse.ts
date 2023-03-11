import {
	parseAlbum,
	parseArtist,
	parseEpisode,
	parsePlaylist,
	parsePodcast,
	parseTrack,
	uriToBasics
} from './utils/parse.js'
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
		let data = <{ message: string; playlists: PagedResponse }>(
			await (
				await this.#librespot.fetchWithAuth(
					`https://api.spotify.com/v1/browse/featured-playlists`
				)
			).json()
		)
		return {
			message: data.message,
			playlists: data.playlists.items.map(parsePlaylist)
		}
	}

	async home(timezone?: string): Promise<{
		message: string
		sections: SpotifySection[]
	}> {
		let searchParams = new URLSearchParams({
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
		let resp = await (
			await this.#librespot.fetchWithAuth(
				`https://api-partner.spotify.com/pathfinder/v1/query?${searchParams.toString()}`,
				{
					headers: {
						'app-platform': 'WebPlayer'
					}
				}
			)
		).json()
		return {
			message: resp.data.home.greeting.text,
			sections: resp.data.home.sectionContainer.sections.items
				.map((e: any): SpotifySection => {
					let dat: SpotifySection = {
						type: e.data.__typename,
						items: <SpotifySectionItem[]>e.sectionItems.items
							.map((e: any): SpotifySectionItem | null => {
								let obj = e.content.data
								switch (obj?.__typename) {
									case 'Playlist': {
										return <SpotifyPlaylist>{
											name: obj.name,
											description: obj.description,
											coverArtwork: obj.images.items[0]?.sources ?? [],
											owner: obj.ownerV2.data.name,
											...uriToBasics(obj.uri)
										}
									}
									case 'Album': {
										return <SpotifyAlbum>{
											name: obj.name,
											coverArtwork: obj.coverArt.sources,
											artists: obj.artists.items.map(
												(e: any): SpotifyArtist => {
													return {
														name: e.profile.name,
														...uriToBasics(e.uri)
													}
												}
											),
											...uriToBasics(obj.uri)
										}
									}
									case 'Podcast': {
										return <SpotifyPodcast>{
											name: obj.name,
											coverArtwork: obj.coverArt.sources,
											publisher: obj.publisher.name,
											mediaType: obj.mediaType,
											...uriToBasics(obj.uri)
										}
									}
									case 'Episode': {
										return <SpotifyEpisode>{
											podcast: {
												name: obj.podcastV2.data.name,
												coverArtwork: obj.podcastV2.data.coverArt.sources,
												publisher: obj.podcastV2.data.publisher.name,
												mediaType: obj.mediaType,
												...uriToBasics(obj.podcastV2.data.uri)
											},
											name: obj.name,
											description: obj.description,
											coverArtwork: obj.coverArt.sources,
											durationMs: obj.duration.totalMilliseconds,
											releaseDate: new Date(obj.releaseDate.isoString),
											...uriToBasics(obj.uri)
										}
									}
									case 'Artist': {
										return <SpotifyArtist>{
											name: obj.profile.name,
											avatar: obj.visuals.avatarImage.sources,
											...uriToBasics(obj.uri)
										}
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
							.filter((e: {} | null) => e != null)
					}
					if (e.data.title?.text) dat.title = e.data.title.text
					return dat
				})
				.filter((e: { items: [] }) => e.items.length > 0)
		}
	}
}
