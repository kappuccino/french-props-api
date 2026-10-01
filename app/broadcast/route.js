import express from 'express'

import {success, catchErrors} from '../request.js'
import {broadcast} from '../socket.js'

const router = express.Router()
export default router

router.post('/broadcast',
	catchErrors(async function(req, res, next) {

			try {
				broadcast('broadcast', req.body)
			} catch (err) {
				return next(err)
			}

			success({success: true}, req, res)
		}
	))
