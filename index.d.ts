type QualityOption = 0|1|2

type SpotifyTypes = 'artist'|'album'|'track'|'playlist'|'show'|'episode'

interface PagedResponse {
	items: any[]	
	next: string|null
}

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

interface RawSpotifyFile {
	format: string
	file_id: string
}

interface RawSpotifyFileResponse {
	gid: string
	fileid: string
	cdnurl: string[]
}

interface Metadata4 {
	gid: string
	file?: RawSpotifyFile[]
	audio?: RawSpotifyFile[]
	alternative?: Metadata4
}

interface RawExternalUrls {
	spotify: string
}

interface SpotifyObject {
	id: string
	uri: string
	externalUrl: RawExternalUrls
}

interface RawSpotifyObject {
	id: string
	uri: string
	external_urls: RawExternalUrls
}

interface SpotifyThumbnail {
	height: number|null
	width: number|null
	url: string
}

interface RawSpotifyArtist extends RawSpotifyObject {
	name: string
	followers?: {
		total: number
	}
	genres?: string[]
	images?: SpotifyThumbnail[]
}

interface SpotifyArtist extends SpotifyObject {
	name: string
	avatar?: SpotifyThumbnail[]
	genres?: string[]
	followerCount?: number
	albums?: SpotifyAlbum[]
}

interface RawSpotifyUser extends RawSpotifyObject {
	name: string
	followers?: {
		total: number
	}
	genres?: string[]
	images?: SpotifyThumbnail[]
}

interface SpotifyUser extends SpotifyObject {
	name?: string
	followerCount?: number
	avatar?: SpotifyThumbnail[]
	playlists?: SpotifyPlaylist[]
}

interface SpotifySearch {
	artists?: SpotifyArtist[]
	albums?: SpotifyAlbum[]
	tracks?: SpotifyTrack[]
	playlists?: SpotifyPlaylist[]
	podcasts?: SpotifyPodcast[]
	episodes?: SpotifyEpisode[]
}

interface RawSpotifyTrack extends RawSpotifyObject {
	name: string
	disc_number: number
	track_number: number
	duration_ms: number
	explicit: boolean
	is_local: boolean
	artists: RawSpotifyArtist[]
}

interface SpotifyTrack extends SpotifyObject {
	album?: SpotifyAlbum
	artists?: SpotifyArtist[]
	discNumber?: number
	trackNumber: number
	durationMs: number
	explicit: boolean
	isLocal: boolean
	name: string
}

interface RawSpotifyAlbum extends RawSpotifyObject {
	name: string
	album_type: string
	artists: RawSpotifyArtist[]
	release_date: string
	total_tracks: number
	images: SpotifyThumbnail[]
	label?: string
	tracks?: PagedResponse
}

interface SpotifyAlbum extends SpotifyObject {
	albumType: string
	name: string
	artists: SpotifyArtist[]
	releaseDate: Date
	tracks?: SpotifyTrack[]
	totalTracks: number
	coverArtwork: SpotifyThumbnail[]
	label?: string
}

interface RawSpotifyPlaylistTrack extends RawSpotifyTrack {
	added_at: string
	added_by: RawSpotifyUser
}

interface SpotifyPlaylistTrack extends SpotifyTrack {
	addedAt: Date
	addedBy: SpotifyUser
}

interface RawSpotifyPlaylist extends RawSpotifyObject {
	owner: RawSpotifyUser
	name: string
	description: string
	collaborative: boolean
	public: boolean
	tracks: PagedResponse
	images: SpotifyThumbnail[]
}

interface SpotifyPlaylist extends SpotifyObject {
	collaborative: boolean
	onProfile: boolean
	description: string
	coverArtwork: SpotifyThumbnail[]
	name: string
	owner: SpotifyUser
	tracks?: SpotifyPlaylistTrack[]
	totalTracks: number
}

interface RawSpotifyPodcast extends RawSpotifyObject {
	name: string
	description: string
	html_description: string
	explicit: boolean
	languages: string[]
	media_type: string
	images: SpotifyThumbnail[]
	publisher: string
	episodes: RawSpotifyEpisode[]
	total_episodes: number
}

interface SpotifyPodcast extends SpotifyObject {
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
}

interface RawSpotifyEpisode extends RawSpotifyObject {
	name: string
	description: string
	html_description: string
	explicit: boolean
	language: string
	languages: string[]
	images: SpotifyThumbnail[]
	duration_ms: number
	is_playable: boolean
	is_paywall_content: boolean
	release_date: string
}

interface SpotifyEpisode extends SpotifyObject {
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
}