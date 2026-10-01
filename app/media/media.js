import mongoose from 'mongoose'
import path from 'path'
import mime from 'mime'

import {mongoIdToFolder, tempFileName} from '../tools.js'
import * as storage from '../../libs/storage/storage.js'
import * as cache from '../../libs/storage/cache.js'
import * as media from '../../libs/media/media.js'
import fs from 'fs/promises'

const Media = mongoose.model('Media')

//--

export async function getById(_id, fix=true){
	if(!_id) throw new Error('no _id')
	const doc = await Media.findOne({_id}).lean()
	return fix ? fixUrl(doc) : doc
}

export async function getByIds(_ids){
	if(!_ids || !_ids.length) throw new Error('no _ids or empty')
	return Media.find({_id: {$in: _ids}}).lean().then(fixUrl)
}

export async function create(data){

	if(data.meta && data.meta.length){
		try {
			data.meta = data.meta.map(m => {
				const {key, value} = m
				if(key.substr(0, 1) === '_') m.value = new mongoose.Types.ObjectId(value)
				return m
			})
		} catch (e){
			// do nothing
		}
	}

	if(!data.meta) delete data.meta

	const $media = new Media(data)
	await $media.save()

	return getById($media.get('_id'))
}

export async function update(_id, data){

	const $media = await Media.findOne({_id})
	if(!$media) return null

	Object
		.entries(data)
		.forEach(([key, value]) => $media.set(key, value))

	await $media.save()

	return getById(_id)
}

export async function generatingFlow(medium, file){


	if(media.isImage(medium)){

		const rotation = await media.getImageRotation(file)
		if(rotation) await media.rotateImage(file, rotation)

		if(!media.isWebImage(file)){
			file = await media.convertToJpg(file)

			await Media.findOneAndUpdate(
				{_id: medium._id},
				{url: path.basename(file)},
				{useFindAndModify: false}
			)
		}

	}

	// Upload the source file
	const base = prompt(medium) + '/' + mongoIdToFolder(medium._id)
	const mediaIsPrivate = isPrivate(medium)
	await storage.save(file, base + '/' + path.basename(file), mediaIsPrivate)

	// Gathering some properties
	const props = await media.properties(medium, file)

	// Update the media with Meta + Thumbnails
	await Media.findOneAndUpdate(
		{_id: medium._id},
		{properties: props}
	)

	// Must be after the file is stored and the db is updated
	/*if(isVideo(medium)){
		await taskVideoPoster(medium._id.toString())
	}*/

	return getById(medium._id)
}

export async function upload(filePath, fileName, fields={}){

	// MIME
	const [type, second] = mime.getType(fileName).split('/')

	// META
	let meta = []
	if(fields.meta){
		try {
			meta = JSON.parse(fields.meta)
			if(!meta.length) meta = []
		} catch (e){
			meta = []
		}
	}
	if(fields.metaRAW){
		meta = fields.metaRAW
	}

	const medium = {
		name: fileName,
		type: type,
		mime: second,
		url: path.basename(filePath),
		meta
	}

	const mediaDB = await create(medium)

	return generatingFlow(mediaDB, filePath)
}

export async function rotate(_id, reverse=false){

	const theMedia = await getById(_id, false)
	if(!theMedia) throw new Error('media not found')

	// Create new File with a rotation (clean the temp file asap)
	const tempFile = await storage.copyTemp(theMedia)
	const newFile = tempFileName(tempFile)
	await media.rotate(tempFile, newFile, reverse ? -90 : 90)
	await fs.unlink(tempFile)

	// Save the new file
	const fragment = prompt(theMedia) + '/' + mongoIdToFolder(_id)
	await storage.save(newFile, fragment + '/' + path.basename(newFile))

	// Remove the previous file
	await storage.remove(fragment + '/' + theMedia.url)
	await update(theMedia._id, {
		url: path.basename(newFile)
	})

	// Update the properties + remove the temp file (newFile)
	await generatingFlow(theMedia, newFile);

	// Remove the cache for the media
	await cache.clear(theMedia._id)

	// Clean temp file
	await fs.unlink(newFile)

	return getById(_id)
}



//-- Helper

export function prompt(medium){
	return isPublic(medium) ? 'asset' : 'private'
}

export function fixUrl(item){
	if(!item) return

	if(Array.isArray(item)) return item.map(fullUrl)
	return fullUrl(item)

	function fullUrl(el){
		const _id = el._id
		const url = el.url

		el.url = prepend(_id, url)
		el.webp = prepend(_id, url, '.webp')
		el.avif = prepend(_id, url, '.avif')

		return el
	}

	function prepend(_id, url, forceExt=null){
		if(!url) return null

		let fullUrl = `${process.env.API_URL}/media/${item._id}/${encodeURI(url)}`
		if(forceExt){
			const ext = path.extname(url)
			if(ext !== forceExt) fullUrl = fullUrl.replace(ext, forceExt)
		}

		return fullUrl
	}

}

export function genAwsUrl(media, filename){
	const base = prompt(media) + '/' + mongoIdToFolder(media._id)
	return `https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_S3_BUCKET}/${base}/${filename}`
}

export function genAwsKey(media, filename){
	const base = prompt(media) + '/' + mongoIdToFolder(media._id)
	return `${base}/${filename}`
}

export function isPrivate(medium){
	if(!medium) return false
	const meta = medium.meta || []
	return meta.some(m => m.key === 'private' && m.value === true)
}

export function isPublic(medium){
	return !isPrivate(medium)
}


//-- Private

function searchParams(query, opt){

	//console.log('-- 🍕 media search Params')
	//console.log(JSON.stringify(opt, null, 2))

	/*if(opt.search && opt.search.length){
		const pattern = escapeRegex(opt.search)
		query.where('name').regex(new RegExp(pattern, 'i'))
	}*/

	let properties = opt.properties
	if(properties){
		if(Array.isArray(properties)){
			properties = properties.reduce((acc, next) => {
				acc[next.key] = next.value
				return acc
			}, {})
		}

		if(Object.keys(properties).length){
			for (let [key, value] of Object.entries(properties)) {
				value = searchParamValue(key, value)
				query.elemMatch('properties', {key, value})
			}
		}
	}

	let meta = opt.meta
	if(meta){
		if(Array.isArray(meta)){
			meta = meta.reduce((acc, next) => {
				acc[next.key] = next.value
				return acc
			}, {})
		}

		if(Object.keys(meta).length) {
			for (let [key, value] of Object.entries(meta)){
				value = searchParamValue(key, value)
				query.elemMatch('meta', {key, value})
			}
		}
	}

	return Promise.resolve({query})
}

function browseParams(query, opt){

	//console.log('-- 🍕 browseParams media search Params')
	//console.log(JSON.stringify(opt, null, 2))

	/*if(opt.search && opt.search.length){
		const pattern = escapeRegex(opt.search)
		query.where('name').regex(new RegExp(pattern, 'i'))
	}*/

	let profiles = opt.profiles
	if(profiles && profiles.length){
		query.elemMatch('meta', {
			key: '_owner',
			value: {
				$in: profiles.map(_id => new mongoose.Types.ObjectId(_id))
			}
		})
	}

	/*let properties = opt.properties
	if(properties){
		if(Array.isArray(properties)){
			properties = properties.reduce((acc, next) => {
				acc[next.key] = next.value
				return acc
			}, {})
		}

		if(Object.keys(properties).length){
			for (let [key, value] of Object.entries(properties)) {
				value = searchParamValue(key, value)
				query.elemMatch('properties', {key, value})
			}
		}
	}

	let meta = opt.meta
	if(meta){
		if(Array.isArray(meta)){
			meta = meta.reduce((acc, next) => {
				acc[next.key] = next.value
				return acc
			}, {})
		}

		if(Object.keys(meta).length) {
			for (let [key, value] of Object.entries(meta)){
				value = searchParamValue(key, value)
				query.elemMatch('meta', {key, value})
			}
		}
	}*/

	return Promise.resolve({query})
}

function searchParamValue(key, value){

	if(key.substr(0, 1) === '_'){
		return new mongoose.Types.ObjectId(value)
	}

	if(['height', 'width'].indexOf(key) > -1){
		return parseInt(value)
	}

	return value
}
