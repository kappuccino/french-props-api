import mongoose from 'mongoose'

import {collation, modelAutoRemove} from '../db-tools.js'

const Properties = mongoose.Schema({
	key: {type: String, autoRemove: true},
	value: {type: mongoose.Schema.Types.Mixed, autoRemove: true}
})

const Meta = mongoose.Schema({
	key: {type: String, autoRemove: true},
	value: {type: mongoose.Schema.Types.Mixed, autoRemove: true}
})

const Media = mongoose.Schema({
	name: {type: String, autoRemove: true},
	status: {type: String, autoRemove: true},
	url: {type: String, autoRemove: true},
	properties: {type: [Properties], autoRemove: true},
	meta: {type: [Meta], autoRemove: true},
	type: {type: String, autoRemove: true},
	mime: {type: String, autoRemove: true},

	titleFR: {type: String, autoRemove: true},
	titleEN: {type: String, autoRemove: true},
	captionFR: {type: String, autoRemove: true},
	captionEN: {type: String, autoRemove: true},

	created: Date,
	updated: Date
}, {
	collection: 'media',
	collation
})

Meta.pre('save', function (next) {
	modelAutoRemove.call(this)
	next()
})

Properties.pre('save', function (next) {
	modelAutoRemove.call(this)
	next()
})

Media.pre('save', function (next) {
	this.updated = new Date()
	if (this.isNew && !this.created) this.created = new Date()

	modelAutoRemove.call(this)

	next()
})

mongoose.model('Media', Media)
