import mongoose from 'mongoose'

import {collation} from '../db-tools.js'

const MailQueue = mongoose.Schema({
	date: Date,
	error: {type: String, autoRemove: true},
	raw: {type: mongoose.Schema.Types.Mixed, autoRemove: true},
}, {
	collection: 'mail-queue',
	collation
})

MailQueue.pre('save', function(next){
	if(this.isNew && !this.created) this.date = new Date()
	next()
})

mongoose.model('MailQueue', MailQueue)
