type QualityOption = 0 | 1 | 2

type SpotifyTypes =
	| 'artist'
	| 'album'
	| 'track'
	| 'playlist'
	| 'show'
	| 'episode'

interface PagedResponse {
	items: any[]
	next: string | null
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
	album?: {
		gid: string
		name: string
		cover_group: {
			image: RawSpotifyFile[]
		}
	}
	file?: RawSpotifyFile[]
	audio?: RawSpotifyFile[]
	alternative?: Metadata4
	has_lyrics?: boolean
}

interface RawExternalUrls {
	spotify: string
}

interface RawSpotifyObject {
	id: string
	uri: string
	external_urls: RawExternalUrls
}

interface SpotifyThumbnail {
	height: number | null
	width: number | null
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

interface RawSpotifyUser extends RawSpotifyObject {
	name: string
	followers?: {
		total: number
	}
	genres?: string[]
	images?: SpotifyThumbnail[]
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

interface RawSpotifyLyrics {
	syncType: string
	lines: {
		startTimeMs: string
		words: string
		syllables: unknown[]
		endTimeMs: string
	}[]
	provider: string
	providerLyricsId: string
	providerDisplayName: string
	syncLyricsUri: string
	isDenseTypeface: boolean
	alternatives: unknown[]
	language: string
	isRtlLanguage: boolean
	fullscreenAction: string
}

interface RawSpotifyColorLyrics {
	lyrics: RawSpotifyLyrics
	colors: {
		background: number
		text: number
		highlightText: number
	}
	hasVocalRemoval: boolean
}

interface SpotifyLyrics {
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

interface SpotifyColorLyrics {
	lyrics: SpotifyLyrics
	colors: {
		background: string
		text: string
		highlightText: string
	}
	hasVocalRemoval: boolean
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

interface RawSpotifyPlaylistTrack extends RawSpotifyTrack {
	added_at: string
	added_by: RawSpotifyUser
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

interface RawSpotifyDevice {
	id: string
	is_active: boolean
	is_private_session: boolean
	is_restricted: boolean
	name: string
	type: string
	volume_percent: number
}

interface RawSpotifyPlaybackState {
	device: RawSpotifyDevice
	shuffle_state: boolean
	repeat_state: string
	timestamp: number
	context: {
		external_urls: RawExternalUrls
		href: string
		type: string
		uri: string
	} | null
	progress_ms: number
	item: RawSpotifyTrack | null
	currently_playing_type: string
	actions: {
		disallows: {
			interrupting_playback?: boolean
			pausing?: boolean
			resuming?: boolean
			seeking?: boolean
			skipping_next?: boolean
			skipping_prev?: boolean
			toggling_repeat_context?: boolean
			toggling_shuffle?: boolean
			toggling_repeat_track?: boolean
			transferring_playback?: boolean
		}
	}
	is_playing: boolean
}
