import mongoose from 'mongoose'

import {collation} from '../db-tools.js'

// Help
// Expires : https://stackoverflow.com/questions/64830437/document-not-expiring-in-mongodb-using-mongoose

const Token = new mongoose.Schema({
	id: String,
	data: mongoose.Schema.Types.Mixed,
	expireAt: {
		type: Date,
		expires: 0 // Rebuild the collection if this need to change (see link above)
	},
}, {
	collection: 'token',
	collation
})

mongoose.model('token', Token)
