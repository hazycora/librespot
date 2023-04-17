import {
	SpotifyAlbum,
	SpotifyUser,
	SpotifyArtist,
	SpotifyTrack,
	SpotifyPlaylist,
	SpotifyPlaylistTrack,
	SpotifyPodcast,
	SpotifyEpisode
} from './types.js'

export function parseUser(e: any): SpotifyUser {
	let user: SpotifyUser = {
		name: e.display_name,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
	if (e.followers) user.followerCount = e.followers.total
	if (e.images) user.avatar = e.images
	return user
}

export function parseArtist(e: any): SpotifyArtist {
	let artist: SpotifyArtist = {
		name: e.name,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
	if (e.followers) artist.followerCount = e.followers.total
	if (e.genres) artist.genres = e.genres
	if (e.images) artist.avatar = e.images
	return artist
}

export function parseTrack(e: any): SpotifyTrack {
	let track: SpotifyTrack = {
		discNumber: e.disc_number,
		trackNumber: e.track_number,
		durationMs: e.duration_ms,
		explicit: e.explicit,
		id: e.id,
		uri: e.uri,
		isLocal: e.is_local,
		name: e.name,
		externalUrl: e.external_urls.spotify
	}
	if (e.artists) track.artists = e.artists.map(parseArtist)
	if (e.album) track.album = parseAlbum(e.album)
	return track
}

function colorNumberToHex(number: number) {
	return '#' + (16777216 + number).toString(16).padStart(6, '0')
}

function parseLyrics(e: any): SpotifyLyrics {
	return {
		syncType: e.syncType,
		lines: e.lines,
		provider: e.provider,
		providerDisplayName: e.providerDisplayName,
		language: e.language,
		isRtlLanguage: e.isRtlLanguage
	}
}

export function parseTrackColorLyrics(e: any): SpotifyColorLyrics {
	return {
		lyrics: parseLyrics(e.lyrics),
		colors: {
			background: colorNumberToHex(e.colors.background),
			text: colorNumberToHex(e.colors.text),
			highlightText: colorNumberToHex(e.colors.highlightText)
		},
		hasVocalRemoval: e.hasVocalRemoval
	}
}

export function parseAlbum(e: any): SpotifyAlbum {
	let album: SpotifyAlbum = {
		albumType: e.album_type,
		artists: e.artists.map(parseArtist),
		name: e.name,
		releaseDate: new Date(e.release_date),
		totalTracks: e.total_tracks,
		coverArtwork: e.images,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
	if (e.label) album.label = e.label
	if (e.tracks) album.tracks = e.tracks?.items.map(parseTrack)
	return album
}

export function parsePlaylistTrack(e: any): SpotifyPlaylistTrack {
	return {
		...parseTrack(e.track),
		addedAt: new Date(e.added_at),
		addedBy: parseUser(e.added_by)
	}
}

export function parsePlaylist(e: any): SpotifyPlaylist {
	return {
		owner: parseUser(e.owner),
		name: e.name,
		description: e.description,
		collaborative: e.collaborative,
		onProfile: e.public,
		tracks: e.tracks.items?.map(parsePlaylistTrack),
		totalTracks: e.tracks.total,
		coverArtwork: e.images,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}

export function parseEpisode(e: any): SpotifyEpisode {
	return {
		name: e.name,
		description: e.description,
		htmlDescription: e.html_description,
		explicit: e.explicit,
		language: e.language,
		languages: e.languages,
		coverArtwork: e.images,
		durationMs: e.duration_ms,
		isPlayable: e.is_playable,
		isPaywalled: e.is_paywall_content,
		releaseDate: new Date(e.release_date),
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}

export function parsePodcast(e: any): SpotifyPodcast {
	return {
		name: e.name,
		description: e.description,
		htmlDescription: e.html_description,
		explicit: e.explicit,
		languages: e.languages,
		mediaType: e.media_type,
		coverArtwork: e.images,
		publisher: e.publisher,
		episodes: e.episodes?.items.map(parseEpisode),
		totalEpisodes: e.total_episodes,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}

export function uriToBasics(uri: string) {
	return {
		uri: uri,
		id: uri.split(':')[2],
		externalUrl: `https://open.spotify.com/${encodeURIComponent(
			uri.split(':')[1]
		)}/${encodeURIComponent(uri.split(':')[2])}`
	}
}
