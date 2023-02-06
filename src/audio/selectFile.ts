const NORMAL = 0
const HIGH = 1
const VERY_HIGH = 2

const types = {
	vorbis: {
		'OGG_VORBIS_96': NORMAL,
		'OGG_VORBIS_160': HIGH,
		'OGG_VORBIS_320': VERY_HIGH
	},
	mp3: {
		'MP3_96': NORMAL,
		'MP3_160': HIGH,
		'MP3_160_ENC': HIGH,
		'MP3_320': VERY_HIGH,
		'MP3_256': VERY_HIGH
	},
	aac: {
		'AAC_24_NORM': NORMAL,
		'AAC_24': HIGH,
		'AAC_48': VERY_HIGH
	}
}

interface spotifyFile {
	format: string,
	file_id: string
}

export default function (files: spotifyFile[], type: 'vorbis' | 'mp3' | 'aac', maxQuality?: 0 | 1 | 2): spotifyFile {
	maxQuality = maxQuality??1
	let filesOfType = files.filter((e: {
		file_id: string, format: string
	}) => {
		if (!Object.keys(types[type]).includes(e.format)) return false
		if (types[type][e.format] > maxQuality) return false
		return true
	})
	let sorted = filesOfType.sort((a, b): number => {
		return types[type][b.format]-types[type][a.format]
	})
	console.log(sorted)
	return sorted[0]
}