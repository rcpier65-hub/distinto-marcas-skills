import { strict as assert } from 'node:assert'
// @ts-expect-error Node executes this regression test directly with transform-types.
import { MediaSession } from '../app/oficina/_media-session.ts'
class Track extends EventTarget {
  readyState = 'live'; stopped = false
  constructor(public kind: string) { super() }
  stop() { this.stopped = true; this.readyState = 'ended' }
}
const stream = (t: Track) => ({ getTracks: () => [t] }) as unknown as MediaStream
const changes: Array<[string, MediaStreamTrack | null]> = []
const requests: MediaStreamConstraints[] = []
const tracks: Track[] = []
const media = new MediaSession(async c => {
  requests.push(c); const t = new Track(c.audio ? 'audio' : 'video'); tracks.push(t); return stream(t)
}, (k, t) => changes.push([k, t]))
assert.equal(requests.length, 0)
await media.toggle('video')
assert.equal(requests[0].audio, false, 'Camera must not capture audio')
await media.toggle('audio')
assert.equal(tracks[0].stopped, false, 'Mic must preserve camera')
await media.toggle('audio')
assert.equal(tracks[1].stopped, true, 'Mute must release microphone hardware')
assert.equal(changes.at(-1)?.[1], null)
tracks[0].dispatchEvent(new Event('ended'))
assert.equal(changes.at(-1)?.[1], null, 'OS ending capture resets button')
let resolve!: (s: MediaStream) => void
let count = 0
const delayed = new MediaSession(() => { count++; return new Promise(r => { resolve = r }) }, () => {})
const first = delayed.toggle('audio')
await delayed.toggle('audio')
assert.equal(count, 1, 'Double click cannot issue two permission requests')
delayed.close()
const late = new Track('audio'); resolve(stream(late)); await first
assert.equal(late.stopped, true, 'Leaving during permission dialog must stop late capture')
let tries = 0
const denied = new MediaSession(async () => { tries++; throw new Error('denied') }, () => {})
await assert.rejects(denied.toggle('audio')); await assert.rejects(denied.toggle('audio'))
assert.equal(tries, 2)
media.close()
console.log('PASS: independent devices, real mute, ended track, duplicate requests, leave race, permission retry')
