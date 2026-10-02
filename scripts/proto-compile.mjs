import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const pbjs = process.platform === 'win32' ? 'pbjs.cmd' : 'pbjs'
const pbts = process.platform === 'win32' ? 'pbts.cmd' : 'pbts'

try {
  mkdirSync('src/messages', { recursive: true })

  execFileSync(pbjs, [
    '-t', 'static-module',
    '-w', 'es6',
    '-o', 'src/messages/compiled.js',
    'src/messages/auth_request.proto',
    'src/messages/personal_messenger.proto',
  ], { stdio: 'inherit' })

  execFileSync(pbts, [
    '-o', 'src/messages/compiled.d.ts',
    'src/messages/compiled.js',
  ], { stdio: 'inherit' })
} catch (error) {
  console.error('\nFailed to compile protobuf files. Run `npm install` first.\n')
  process.exit(error.status ?? 1)
}
