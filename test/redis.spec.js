import 'dotenv/config.js'
import {expect, test} from 'vitest'

import redis, {set} from '../app/redis.js'

test('Should create an object in Redis', async () => {

	const res = await set('test', 'jest')
	expect(res).toBe('OK')
	redis.quit()

}, 1000)
