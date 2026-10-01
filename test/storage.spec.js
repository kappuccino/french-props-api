import 'dotenv/config.js'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {expect, test} from 'vitest'

import '../app/db.js' // needed as dependency
import {save, list, remove, removeFolder} from '../libs/storage/storage.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

test('Should save a file', async () => {
	const local = __dirname + '/test-upload-s3.txt'
	const remote = '--test--/test-upload-s3.txt'
	const res = await save(local, remote)

	expect(res).toBe(remote)
}, 1000)

test('Should read a list of files', async () => {
	const files = await list('--test--')

	expect(files.length).toBeGreaterThan(0)
}, 1000)

test('Should remove a file', async () => {
	const remote = '--test--/test-upload-s3.txt'

	const res = remove(remote)

	expect(res).toBeTruthy()
}, 1000)

test('Should remove a folder and 2 files', async () => {
	const local = __dirname+'/test-upload-s3.txt'

	await save(local, '--test--/test-upload-s3-a.txt')
	await save(local, '--test--/test-upload-s3-b.txt')

	const res = removeFolder('--test--')

	expect(res).toBeTruthy()
}, 1000)
