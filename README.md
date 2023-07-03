# librespot-js

A work-in-progress FOSS Spotify library in JavaScript inspired by [librespot](https://github.com/librespot-org/librespot/).
This library deliberately only works with Spotify Premium accounts, requests to change or "fix" this will be ignored.

## Installation

```
npm i librespot
```

## Usage

```js
import Librespot from 'librespot'

const spotify = new Librespot()

await spotify.login('username', 'password')
```

See examples in docs/examples.

## License

librespot-js is under the MIT license.

librespot-js derives from [spotify-zeroconf](https://github.com/elbywan/spotify-zeroconf), also under the MIT license.
