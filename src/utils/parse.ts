export function parseAccount(e: any): SpotifyAccount {
	return {
		name: e.display_name,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}

export function parseArtist(e: any): SpotifyArtist {
	return {
		name: e.name,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}

export function parseTrack(e: any): SpotifyTrack {
	let track: SpotifyTrack = {
		artists: e.artists.map(parseArtist),
		discNumber: e.disc_number,
		trackNumber: e.track_number,
		durationMs: e.duration_ms,
		explicit: e.explicit,
		id: e.id,
		uri: e.uri,
		isLocal: e.is_local,
		name: e.name,
		externalUrl: e.external_urls.spotify,
	}
	if (e.album) track.album = parseAlbum(e.album)
	return track
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
		addedBy: parseAccount(e.added_by)
	}
}

export function parsePlaylist(e: any): SpotifyPlaylist {
	return {
		owner: parseAccount(e.owner),
		name: e.name,
		description: e.description,
		collaborative: e.collaborative,
		onProfile: e.public,
		tracks: e.tracks.items.map(parsePlaylistTrack),
		totalTracks: e.tracks.total,
		coverArtwork: e.images,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}