export function parseArtist(e: any): SpotifyArtist {
	return {
		name: e.name,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}

export function parseSpotifyTrack(e: any): SpotifyTrack {
	return {
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
}

export function parseSpotifyAlbum(e: any): SpotifyAlbum {
	return {
		albumType: e.album_type,
		artists: e.artists.map(parseArtist),
		name: e.name,
		releaseDate: e.release_date,
		tracks: e.tracks.items.map(parseSpotifyTrack),
		totalTracks: e.total_tracks,
		coverArtwork: e.images,
		label: e.label,
		id: e.id,
		uri: e.uri,
		externalUrl: e.external_urls.spotify
	}
}