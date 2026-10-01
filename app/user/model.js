import {randomBytes, scryptSync} from 'crypto'
import mongoose from 'mongoose'
import {nanoid} from 'nanoid'

import {collation, modelAutoRemove} from '../db-tools.js'

const UserCredential = new mongoose.Schema({
	credentialID: {type: String, required: true},
	publicKey: {type: Buffer, required: true},
	counter: {type: Number, required: true, default: 0},
	name: {type: String, trim: true},

	createdAt: {type: Date},
	lastUsedAt: {type: Date},
})

const User = new mongoose.Schema({
	login: {type: String, autoRemove: true},
	password: {type: String, autoRemove: true},
	needChange: {type: Boolean, default: false},
	change: {type: mongoose.Schema.ObjectId, autoRemove: true}, // No ref
	role: {type: String, autoRemove: true},
	permissions: {type: [String], autoRemove: true},
	firstName: {type: String, autoRemove: true},
	lastName: {type: String, autoRemove: true},
	phone: {type: String, autoRemove: true},
	auth: {type: String, autoRemove: true},
	tfa: {type: String, autoRemove: true},
	reset: {type: mongoose.Schema.ObjectId, autoRemove: true}, // No ref
	recovery: {type: [String], autoRemove: true},
	hidden: {type: Boolean, autoRemove: true},

	_picture: {type: mongoose.Schema.ObjectId, ref: 'Media'},

	credentials: [{type: UserCredential}],

	tokenVersion: {type: Number, default: 1},
	created: Date,
	updated: Date
}, {
	collection: 'user',
	collation
})

User.pre('save', function(next){
	const modified = this.modifiedPaths() || []

	if(modified.includes('password')){
		const salt = randomBytes(16).toString('hex')
		const pass = scryptSync(this.get('password'), salt, 64).toString('hex')
		this.password = `${salt}:${pass}`
	}

	if(modified.includes('tfa') && this.get('tfa')){
		this.recovery = Array.from({length: 10}, () => randomBytes(4).toString('hex'))
	}

	next()
})

User.pre('save', function createAuth(next){
	if(!this.auth) this.auth = nanoid(36)

	next()
})

User.pre('save', function fixDates(next){
	this.updated = new Date()
	if(this.isNew && !this.created) this.created = new Date()
	modelAutoRemove.call(this)

	next()
})

mongoose.model('User', User)
