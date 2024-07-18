export type QualityOption = 0 | 1 | 2

export interface HandshakeOptions {
	product?: number
	productFlags?: number[]
	platform?: number
}
export interface LibrespotSessionOptions {
	deviceId: string
	address?: string
	port?: number
	handshakeOptions?: HandshakeOptions
}
export interface SpotifyObject {
	id: string
	uri: string
	externalUrl: string
}
export interface ExternalIds {
	isrc?: string
	ean?: string
	upc?: string
}
export interface SpotifyThumbnail {
	height: number | null
	width: number | null
	url: string
}
export interface SpotifyAlbum extends SpotifyObject {
	albumType: string
	name: string
	artists: SpotifyArtist[]
	releaseDate: Date
	tracks?: SpotifyTrack[]
	totalTracks: number
	coverArtwork: SpotifyThumbnail[]
	label?: string
	externalIds: ExternalIds
	availableMarkets: string[]
}
export interface SpotifyArtist extends SpotifyObject {
	name: string
	avatar?: SpotifyThumbnail[]
	genres?: string[]
	followerCount?: number
	albums?: SpotifyAlbum[]
}
export interface SpotifyUser extends SpotifyObject {
	name?: string
	followerCount?: number
	avatar?: SpotifyThumbnail[]
	playlists?: SpotifyPlaylist[]
}
export interface SpotifyTrack extends SpotifyObject {
	album?: SpotifyAlbum
	artists?: SpotifyArtist[]
	discNumber?: number
	trackNumber: number
	durationMs: number
	explicit: boolean
	isLocal: boolean
	name: string
	externalIds: ExternalIds
	isrc?: string
}
export interface SpotifyPlaylistTrack extends SpotifyTrack {
	addedAt: Date
	addedBy: SpotifyUser
}
export interface SpotifyPlaylist extends SpotifyObject {
	collaborative?: boolean
	onProfile?: boolean
	description: string
	coverArtwork: SpotifyThumbnail[]
	name: string
	owner: SpotifyUser
	tracks?: SpotifyPlaylistTrack[]
	totalTracks?: number
}
export interface SpotifyPodcast extends SpotifyObject {
	name: string
	description?: string
	htmlDescription?: string
	explicit?: boolean
	languages?: string[]
	mediaType: string
	coverArtwork: SpotifyThumbnail[]
	publisher: string
	episodes?: SpotifyEpisode[]
	totalEpisodes?: number
}
export interface SpotifyEpisode extends SpotifyObject {
	podcast?: SpotifyPodcast
	description: string
	htmlDescription?: string
	durationMs: number
	explicit?: boolean
	name: string
	isPlayable?: boolean
	isPaywalled?: boolean
	releaseDate?: Date
	coverArtwork: SpotifyThumbnail[]
	language?: string
	languages?: string[]
}

export interface SpotifyLyrics {
	syncType: string
	lines: {
		startTimeMs: string
		words: string
		syllables: unknown[]
		endTimeMs: string
	}[]
	provider: string
	providerDisplayName: string
	language: string
	isRtlLanguage: boolean
}

export interface SpotifyColorLyrics {
	lyrics: SpotifyLyrics
	colors: {
		background: string
		text: string
		highlightText: string
	}
	hasVocalRemoval: boolean
}
