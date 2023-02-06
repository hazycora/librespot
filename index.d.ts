type QualityOption = 0|1|2

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

interface SpotifyAccount {
	name?: string
	id: string
	uri: string
	externalUrl: string
}

interface SpotifyTrack {
	album?: SpotifyAlbum
	artists: SpotifyArtist[]
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

interface SpotifyThumbnail {
	height: number
	width: number
	url: string
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
	addedBy: SpotifyAccount
}

interface SpotifyPlaylist {
	collaborative: boolean
	onProfile: boolean
	description: string
	coverArtwork: SpotifyThumbnail[]
	name: string
	owner: SpotifyAccount
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
	episodes: SpotifyEpisode[]
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