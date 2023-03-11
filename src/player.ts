import Librespot from './index.js'
import { parseTrack, uriToBasics } from './utils/parse.js'

interface RawSpotifyDevice {
	id: string
	is_active: boolean
	is_private_session: boolean
	is_restricted: boolean
	name: string
	type: string
	volume_percent: number
}

interface SpotifyDevice {
	id: string
	isActive: boolean
	isPrivateSession: boolean
	isRestricted: boolean
	name: string
	type: string
	volumePercent: number
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

interface SpotifyPlaybackState {
	device: SpotifyDevice
	shuffleState: boolean
	repeatState: string
	timestamp: number
	context: SpotifyObject | null
	progressMs: number
	item: SpotifyTrack | null
	currentlyPlayingType: string
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
	isPlaying: boolean
}

export default class LibrespotPlayer {
	#librespot: Librespot

	constructor(librespot: Librespot) {
		this.#librespot = librespot
	}

	async getState(): Promise<SpotifyPlaybackState> {
		let response = await await this.#librespot.fetchWithAuth(
			`https://api.spotify.com/v1/me/player`
		)
		if (response.status == 204) throw new Error('Nothing is playing')
		let data = <RawSpotifyPlaybackState>await response.json()
		return {
			device: {
				id: data.device.id,
				isActive: data.device.is_active,
				isPrivateSession: data.device.is_private_session,
				isRestricted: data.device.is_restricted,
				name: data.device.name,
				type: data.device.type,
				volumePercent: data.device.volume_percent
			},
			shuffleState: data.shuffle_state,
			repeatState: data.repeat_state,
			timestamp: data.timestamp,
			context: data.context
				? {
						...uriToBasics(data.context.uri),
						externalUrl: data.context.external_urls.spotify
				  }
				: null,
			progressMs: data.progress_ms,
			item: data.item ? parseTrack(data.item) : null,
			currentlyPlayingType: data.currently_playing_type,
			actions: data.actions,
			isPlaying: data.is_playing
		}
	}
}
