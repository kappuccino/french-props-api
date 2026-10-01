import 'dotenv/config.js'
import {expect, test} from 'vitest'
import mongoose from 'mongoose'

import {disconnect} from '../app/db.js'

test('Should connect to mongodb', async () => {
	const User = mongoose.model('User')
	const users = await User.find()
	await disconnect()

	expect(users.length).toBeGreaterThanOrEqual(0)

}, 1000)
