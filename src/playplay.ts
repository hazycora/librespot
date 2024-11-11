import Librespot from './index.js'
import PlayPlayLicenseRequest from './messages/PlayPlayLicenseRequest.js'
import PlayPlayLicenseResponse from './messages/PlayPlayLicenseResponse.js'

export interface Unplayplay {
	deobfuscateKey(fileId: Buffer, obfuscatedKey: Buffer): Buffer,
	token: Uint8Array,
}

export default class PlayPlayClient {
	init = false
	licenseRequest: PlayPlayLicenseRequest = new PlayPlayLicenseRequest()
	licenseResponse: PlayPlayLicenseResponse = new PlayPlayLicenseResponse()

    #librespot: Librespot
	#unplayplay?: Unplayplay

	constructor(librespot: Librespot, unplayplay?: Unplayplay) {
		this.#librespot = librespot
		this.#unplayplay = unplayplay
	}

	async getAudioKey(fileId: string, contentType: number) {
		if (!this.#unplayplay) {
			throw new Error('Playplay decryptor not specified, cannot decrypt')
		}

		const params = {
            version: 2,
            token: this.#unplayplay.token,
            interactivity: 1,
            content_type: contentType,
        }

        const response = await this.call(fileId, params)
        const key = this.#unplayplay.deobfuscateKey(Buffer.from(fileId, 'hex'), response.obfuscatedKey)
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
            'spotify-app-version': '8.9.86.551',
			'app-platform': 'Android',
			'user-agent': 'Spotify/8.9.86.551 Android/34 (sdk_gphone64_x86_64)',
            'content-type': 'text/plain'
		} })
		this.licenseResponse.from(Buffer.from(await resp.arrayBuffer()))
		return this.licenseResponse.payload
	}
}
