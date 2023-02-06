type QualityOption = 0|1|2

type SpotifyTypes = 'artist'|'album'|'track'|'playlist'|'show'|'episode'

interface HandshakeOptions {
	product?: number
	productFlags?: number[]
	platform?: number
}

interface LibrespotSessionOptions {
	deviceId: string
	address?: string
	port?: number
	handshakeOptions?: HandshakeOptions
}

interface LibrespotOptions {
	clientId?: string
	deviceId?: string
	scopes?: string[]
	sessionOptions?: LibrespotSessionOptions
}

interface LibrespotCredentials {
	username: string
	password: string
}

interface LibrespotStream {
	sizeBytes: number
	stream: any
}

interface LibrespotStreamAndMetadata extends LibrespotStream {
	metadata: SpotifyTrack | SpotifyEpisode
}

interface SpotifyThumbnail {
	height: number|null
	width: number|null
	url: string
}

interface SpotifyArtist {
	name: string
	avatar?: SpotifyThumbnail[]
	genres?: string[]
	followerCount?: number
	albums?: SpotifyAlbum[]
	id: string
	uri: string
	externalUrl: string
}

interface SpotifyUser {
	name?: string
	followerCount?: number
	avatar?: SpotifyThumbnail[]
	playlists?: SpotifyPlaylist[]
	id: string
	uri: string
	externalUrl: string
}

interface SpotifySearch {
	artists: SpotifyArtist[]
	albums: SpotifyAlbum[]
	tracks: SpotifyTrack[]
	playlists: SpotifyPlaylist[]
	podcasts: SpotifyPodcast[]
	episodes: SpotifyEpisode[]
}

interface SpotifyTrack {
	album?: SpotifyAlbum
	artists?: SpotifyArtist[]
	discNumber?: number
	trackNumber: number
	durationMs: number
	explicit: boolean
	isLocal: boolean
	name: string
	id: string
	uri: string
	externalUrl: string
}

interface SpotifyAlbum {
	albumType: string
	name: string
	artists: SpotifyArtist[]
	releaseDate: Date
	tracks?: SpotifyTrack[]
	totalTracks: number
	coverArtwork: SpotifyThumbnail[]
	label?: string
	id: string
	uri: string
	externalUrl: string
}

interface SpotifyPlaylistTrack extends SpotifyTrack {
	addedAt: Date
	addedBy: SpotifyUser
}

interface SpotifyPlaylist {
	collaborative: boolean
	onProfile: boolean
	description: string
	coverArtwork: SpotifyThumbnail[]
	name: string
	owner: SpotifyUser
	tracks?: SpotifyPlaylistTrack[]
	totalTracks: number
	id: string
	uri: string
	externalUrl: string
}

interface SpotifyPodcast {
	name: string
	description: string
	htmlDescription: string
	explicit: boolean
	languages: string[]
	mediaType: string
	coverArtwork: SpotifyThumbnail[]
	publisher: string
	episodes?: SpotifyEpisode[]
	totalEpisodes: number
	id: string
	uri: string
	externalUrl: string
}

interface SpotifyEpisode {
	description: string
	htmlDescription: string
	durationMs: number
	explicit: boolean
	name: string
	isPlayable: boolean
	isPaywalled: boolean
	releaseDate: Date
	coverArtwork: SpotifyThumbnail[]
	language: string
	languages: string[]
	id: string
	uri: string
	externalUrl: string
}