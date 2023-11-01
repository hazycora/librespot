import fs from 'fs'
import Librespot from 'librespot'

const spotify = new Librespot()

await spotify.login("username", "password")

const track = await spotify.get.track('1p80LdxRV74UKvL8gnD7ky')

await fs.promises.writeFile('example.ogg', track.stream)

await spotify.disconnect()