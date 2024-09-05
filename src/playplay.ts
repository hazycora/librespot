import deobfuscateKey from 'unplayplay'
import Librespot from './index.js'
import PlayPlayLicenseRequest from './messages/PlayPlayLicenseRequest.js'
import PlayPlayLicenseResponse from './messages/PlayPlayLicenseResponse.js'

const PLAYPLAY_TOKEN = Buffer.from('01e132cae527bd21620e822f58514932', 'hex')

export default class PlayPlayClient {
	init = false
	licenseRequest: PlayPlayLicenseResponse = new PlayPlayLicenseResponse()
	licenseResponse: PlayPlayLicenseResponse = new PlayPlayLicenseResponse()

    #librespot: Librespot

	constructor(librespot: Librespot) {
		this.#librespot = librespot
	}

	async getAudioKey(fileId: string, contentType: number) {
		const params = {
            version: 2,
            token: PLAYPLAY_TOKEN,
            interactivity: 1,
            content_type: contentType,
        }

        const response = await this.call(fileId, params)
        const key = deobfuscateKey(Buffer.from(fileId, 'hex'), response.obfuscatedKey)
        return key
	}

	async call(fileId: string, params: object) {
		if (!this.init) {
			this.licenseRequest = await new PlayPlayLicenseRequest().init()
			this.licenseResponse = await new PlayPlayLicenseResponse().init()
			this.init = true
		}

		this.licenseRequest.from(params)
		const encodedRequest = this.licenseRequest.encode()

        const url = `/playplay/v1/key/${fileId}`
		const resp = await this.#librespot.fetchWithAuth(url, { method: 'POST', body: encodedRequest, headers: {
			'accept-language': 'en-US',
            'spotify-app-version': '8.9.66.543',
			'app-platform': 'Android',
			'user-agent': 'Spotify/8.9.66.543 Android/34 (sdk_gphone64_x86_64)',
            'content-type': 'text/plain'
		} })
		this.licenseResponse.from(Buffer.from(await resp.arrayBuffer()))
		return this.licenseResponse.payload
	}
}
