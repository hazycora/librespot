export function parseSpotifyTrack(e: any): SpotifyTrack {
	return {
		artists: e.artists.map((e: {
			name: string, id: string, uri: string, external_urls: { spotify: string }
		}) => {
			return {
				name: e.name,
				id: e.id,
				uri: e.uri,
				externalUrl: e.external_urls.spotify
			}
		}),
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