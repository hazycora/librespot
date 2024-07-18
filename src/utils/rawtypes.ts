import type { ExternalIds, SpotifyThumbnail } from './types.js'

export type SpotifyTypes =
	| 'artist'
	| 'album'
	| 'track'
	| 'playlist'
	| 'show'
	| 'episode'

export interface PagedResponse<T> {
	total?: number
	items: T[]
	next: string | null
}

export interface RawSpotifyFile {
	format: string
	file_id: string
}

export interface RawSpotifyFileResponse {
	gid: string
	fileid: string
	cdnurl: string[]
}

export interface Metadata4 {
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

export interface RawExternalUrls {
	spotify: string
}

export interface RawSpotifyObject {
	id: string
	uri: string
	external_urls: RawExternalUrls
}

export interface RawSpotifyArtist extends RawSpotifyObject {
	name: string
	followers?: {
		total: number
	}
	genres?: string[]
	images?: SpotifyThumbnail[]
}

export interface RawSpotifyUser extends RawSpotifyObject {
	display_name: string | undefined
	name: string
	followers?: {
		total: number
	}
	genres?: string[]
	images?: SpotifyThumbnail[]
}

export interface RawSpotifyTrack extends RawSpotifyObject {
	album: RawSpotifyAlbum
	name: string
	disc_number: number
	track_number: number
	duration_ms: number
	explicit: boolean
	is_local: boolean
	artists: RawSpotifyArtist[]
	external_ids?: ExternalIds
}

export interface RawSpotifyLyrics {
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

export interface RawSpotifyColorLyrics {
	lyrics: RawSpotifyLyrics
	colors: {
		background: number
		text: number
		highlightText: number
	}
	hasVocalRemoval: boolean
}

export interface RawSpotifyAlbum extends RawSpotifyObject {
	name: string
	album_type: string
	artists: RawSpotifyArtist[]
	available_markets: string[]
	release_date: string
	total_tracks: number
	images: SpotifyThumbnail[]
	label?: string
	tracks?: PagedResponse<RawSpotifyTrack>
	external_ids?: ExternalIds
}

export interface RawSpotifyPlaylistTrack {
	track: RawSpotifyTrack
	added_at: string
	added_by: RawSpotifyUser
}

export interface RawSpotifyPlaylist extends RawSpotifyObject {
	owner: RawSpotifyUser
	name: string
	description: string
	collaborative: boolean
	public: boolean
	tracks: PagedResponse<RawSpotifyPlaylistTrack>
	images: SpotifyThumbnail[]
}

export interface RawSpotifyPodcast extends RawSpotifyObject {
	name: string
	description: string
	html_description: string
	explicit: boolean
	languages: string[]
	media_type: string
	images: SpotifyThumbnail[]
	publisher: string
	episodes: PagedResponse<RawSpotifyEpisode>
	total_episodes: number
}

export interface RawSpotifyEpisode extends RawSpotifyObject {
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

export interface RawSpotifyDevice {
	id: string
	is_active: boolean
	is_private_session: boolean
	is_restricted: boolean
	name: string
	type: string
	volume_percent: number
}

export interface RawSpotifyPlaybackState {
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
