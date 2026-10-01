import express from 'express'
import crypto from 'crypto'
import formidable from 'formidable'

import {resizeImage, imageSize, isPrivate} from '../../libs/media/media.js'
import * as storageAPI from '../../libs/storage/storage.js'
import * as cacheAPI from '../../libs/storage/cache.js'
import * as mediaAPI from './media.js'

import {requireKnownUser, success, catchErrors, notFound} from '../request.js'
import path from 'path'
import {readFile, unlink} from 'fs/promises'
import {mongoIdToFolder, tempDir} from '../tools.js'

const router = express.Router()
export default router

// Upload a media
router.post('/media/upload',
	requireKnownUser,
	catchErrors(async function uploadMedia(req, res, next){

		const form = formidable({
			uploadDir: tempDir(),
			keepExtensions: true
		})

		const uploadOnly = req.query?.uploadOnly === 'true'

		form.parse(req, async function(err, fields, files){
			if(err) return next(err)

			// No upload
			if(!files.file?.length) return next(new Error('missing file'))
			const file = files.file[0]

			// Upload only (no media created in DB, for mails attachments)
			if(uploadOnly) return success(file, req, res, next)

			// MIME
			const [type, second] = (file.mimetype || '').split('/')

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

			const medium = {
				name: file.originalFilename,
				type: type,
				mime: second,
				url: path.basename(file.filepath),
				meta
			}

			try {
				const mediaDB = await mediaAPI.create(medium)
				const data = await mediaAPI.generatingFlow(mediaDB, file.filepath)
				success(data, req, res, next)

			} catch( err){
				next(err)
			} finally {
				// The file now lives in the storage, the uploaded copy is useless
				await unlink(file.filepath).catch(() => null)
			}

		})

	}))

// Serve a media
router.get('/media/:_id/:name',
	catchErrors(async function displayMedia(req, res){

		let medium
		try {
			medium = await mediaAPI.getById(req.params._id, false)
		} catch (e) {
			console.error(`Media ${req.params._id} not found`)
			return exit(res, e, 404)
		}

		// Not allowed
		if(isPrivate(medium) && !req.user?._id) return exit(res, null, 403)

		if(storageAPI.isLocalStrategy()){
			try{
				let localPath = storageAPI.getPath(medium)
				if(!localPath) return exit(res, 'Locale file not found', 404)
				return res.sendFile(localPath)
			} catch(e){
				return exit(res, e, 404)
			}
		}else{
			try {
				let content = await storageAPI.getBytes(medium)
				if(!content) return exit(res, 'Remote file not found', 404)
				res.writeHead(200, {'Content-Type': `${medium.type}/${medium.mime}`})
				res.end(content)
			} catch(e) {
				return exit(res, e, 404)
			}
		}

	}))

// Serve a media thumbnail
router.get('/media/:_id/thumbnail/:mode/:value/:name',
	catchErrors(async function mediaThumbnail(req, res){

		const extension = path.extname(req.params.name)
		const isWebp = extension === '.webp' || req.query.webp === '1'
		const isAvif = extension === '.avif' || req.query.avif === '1'

		const mode = req.params.mode || 'width'
		let value = parseInt(req.params.value) || 800
		const cacheKey = `${mongoIdToFolder(req.params._id, true)}/${mode}-${value}${extension}`
		const cacheTTL = process.env.NODE_ENV === 'production' ? 86400 : 3600
		const eTag = genEtag(cacheKey)
		const useCache = true

		res.set('etag', eTag)
		res.set('Cache-control', `public, max-age=${cacheTTL}`)

		// Cached in the browser
		if(useCache && req.headers['if-none-match'] === eTag){
			res.writeHead(304)
			return res.end()
		}

		let medium
		try {
			medium = await mediaAPI.getById(req.params._id, false)
		} catch (e) {
			console.error(`Media ${req.params._id} not found`)
			return exit(res, e, 404)
		}

		// Not allowed
		if(isPrivate(medium) && !req.user?._id) return exit(res, null, 403)

		// CHECK CACHE
		let thumb = useCache ? await cacheAPI.read(cacheKey) : false
		if(!thumb){

			let srcBuffer
			if(storageAPI.isLocalStrategy()){
				try {
					let localPath = storageAPI.getPath(medium)
					if(!localPath) return exit(res, 'Locale file not found', 404)
					srcBuffer = await readFile(localPath)
				} catch(e) {
					return exit(res, e, 404)
				}
			}else{
				try {
					srcBuffer = await storageAPI.getBytes(medium)
					if(!srcBuffer) return exit(res, 'Remote file not found', 404)
				} catch(e) {
					return exit(res, e, 404)
				}
			}

			// Generate thumbnail
			try {
				// Protect for too large images
				const origin = await imageSize(srcBuffer)

				if(mode === 'width' && value > origin.width){
					value = origin.width
				}else
				if(mode === 'height' && value > origin.height){
					value = origin.height
				}else
				if(value > 2500){
					value = 2500
				}

				if(isAvif){
					thumb = await resizeImage(srcBuffer, {[mode]: value}, 'avif')
				}else
				if(isWebp){
					thumb = await resizeImage(srcBuffer, {[mode]: value}, 'webp')
				}else{
					thumb = await resizeImage(srcBuffer, {[mode]: value}, extension)
				}
			} catch(e) {
				return exit(res, e, 404)
			}

			// CACHE
			if(useCache && thumb) await cacheAPI.write(cacheKey, thumb)
		}

		let mimeType = `${medium.type}/${medium.mime}`
		if(isWebp) mimeType = 'image/webp'
		if(isAvif) mimeType = 'image/avif'

		// Read and push to response
		res.writeHead(200, {'Content-Type': mimeType})

		try{
			res.end(thumb)
		} catch (e) {
			return exit(res, e, 404)
		}

	}))

// ——

function exit(res, err, code=404){
	if(err) console.error(err)

	res.status(code)
	return res.send()
}

function genEtag(input){
	return crypto.createHash('sha1').update(input).digest('base64')
}
