import {promisify} from 'util'
import fs from 'fs'
import {rename, unlink, stat, readdir} from 'fs/promises'

import path, {dirname} from 'path'
import {spawn} from 'child_process'
import {pipeline} from 'stream/promises'
import ky from 'ky'
import sharp from 'sharp'
import {nanoid} from 'nanoid'
import ffmpeg from 'fluent-ffmpeg'

import {tempFile} from '../../app/tools.js'


export function isImage(medium) {
	return medium.type === 'image'
}

export function isWebImage(file){
	const ext = path.extname(file).toLowerCase()
	return !!['.jpeg', '.jpg', '.gif', '.png'].includes(ext)
}

export function isPdf(medium) {
	return medium.type === 'application' && medium.mime === 'pdf'
}

export function isVideo(medium) {
	return medium.type === 'video'
}

export function isPrivate(medium){
	const meta = medium.meta || []
	return meta.some(m => m.key === 'private' && m.value === true)
}

export function isPublic(medium){
	return !isPrivate(medium)
}

//

export async function resizeImage(src, opt={}, format='jpeg'){

	if(format.includes('.')) format = format.split('.').pop()

	let resize = {}
	if(opt.width) resize.width = opt.width
	if(opt.height) resize.height = opt.height

	let settings = {
		quality: opt.quality || 80
	}

	if(format === 'jpg'){
		settings.chromaSubsampling = '4:4:4'
	}else
	if(format === 'webp'){
		//
	}else
	if(format === 'avif'){
		//
	}

	return sharp(src)
		.resize(resize)
		.withMetadata()
		.toFormat(format, settings)
		.toBuffer()

}

export async function convertToJpg(file){

	const dst = path.dirname(file) + '/' + tempFileName(file, '.jpg', true, false)

	try{
		await sharp(file)
			.jpeg({
				quality: 95,
				chromaSubsampling: '4:4:4'
			})
			.toFile(dst)

		await rename(dst, file)

		return file

	} catch (e) {
		throw e
	}

}

export async function videoRoll(src, tmp) {


	const pattern = nanoid(10)

	const args = [
		'-i', src,
		'-qscale', '0',
		'-f', 'image2',
		'-r', '0.2',
		tmp + '/' + pattern + '-%05d.jpg'
	]

	return new Promise((resolve, reject) => {
		const ffmpeg = spawn('ffmpeg', args)

		ffmpeg.stdout.on('data', data => reject(data))

		ffmpeg.on('close', async () => {
			const files = await generatedFiles(tmp, pattern)
			resolve(files)
		})

	})

}

export async function videoFrame(src, tmp, time){


	const pattern = nanoid(10)
	const dest = tmp + '/' + pattern + '.jpg'

	/*console.log('Generating frame @', time)
	console.log('Pattern', pattern)
	console.log('Destination', dest)*/

	// ffmpeg -i test.mp4 -ss 00:01:14.35 -vframes 1 out2.png
	const args = [
		'-i', src,
		'-qscale', '0',
		'-ss', time,
		'-vframes', '1',
		dest
	]

	return new Promise((resolve, reject) => {
		const ffmpeg = spawn('ffmpeg', args)

		ffmpeg.stdout.on('data', data => reject(data))

		ffmpeg.on('close', async () => {
			//console.log('Done')
			const files = await generatedFiles(tmp, pattern)

			files.length > 0
				? resolve(files[0])
				: reject(new Error('No images found'))
		})

	})

}

export async function rotate(src, dst, direction=90){

	try{
		await sharp(src)
			.rotate(direction)
			.toFile(dst)

		return dst

	} catch (e) {
		throw e
	}

}

//

export function prompt(medium){
	return isPublic(medium) ? 'asset' : 'private'
}

export async function properties(medium, file){

	const props = [
		await fileWeight(file)
	]

	if(isImage(medium)){
		props.push(imageSize(file))
	}else
		if(isVideo(medium)){
			props.push(videoInfo(file))
		}else{
			props.push(false)
		}

	const [weight, sizeInfo] = await Promise.all(props)

	const meta = [
		{key: 'size', value: weight}
	]

	if(sizeInfo){
		if(sizeInfo.height) meta.push({key: 'height', value: sizeInfo.height})
		if(sizeInfo.width) meta.push({key: 'width', value: sizeInfo.width})
		if(sizeInfo.codec) meta.push({key: 'codec', value: sizeInfo.codec})
		if(sizeInfo.duration) meta.push({key: 'duration', value: sizeInfo.duration})
	}

	return meta
}

export async function fileWeight(file) {

	try {
		const stats = await stat(file)
		return stats.size
	} catch (err) {
		throw err
	}

}

export async function imageSize(file) {

	try {
		const meta = await sharp(file).metadata()

		return {
			width: meta.width,
			height: meta.height
		}

	} catch(err){
		throw err
	}

}

export async function videoInfo(file) {

	try {
		const ffprobe = promisify(ffmpeg.ffprobe)
		const meta = await ffprobe(file)

		const videoSteams = meta.streams
			.filter(stream => (stream.codec_long_name || '')
				.toLowerCase()
				.includes('mpeg'))

		const out = {}
		if (videoSteams.length) {
			out.height = videoSteams[0].height
			out.width = videoSteams[0].width
			out.codec = videoSteams[0].codec_name
			out.duration = (meta.format && meta.format.duration) ? meta.format.duration : null
		}

		return out

	} catch (e) {
		throw e
	}

}

export async function rotateImage(file, degres){
	try{
		const dst = dirname(file) + '/' + tempFile(file)

		await sharp(file)
			.rotate(degres)
			.toFile(dst)

		await unlink(file)
		await rename(dst, file)

	} catch(err){
		throw err
	}

}

export async function getImageRotation(file) {

	const OrientationCode = {
		original: 1,
		deg90: 6,
		deg180: 3,
		deg270: 8,
		flipped: 2,
		deg90Flipped: 5,
		deg180Flipped: 4,
		deg270Flipped: 7,
		unknown: -1,
	}

	const orientationInfoMap = {
		[OrientationCode.original]: {rotation: 0, flipped: false},
		[OrientationCode.deg90]: {rotation: 90, flipped: false},
		[OrientationCode.deg180]: {rotation: 180, flipped: false},
		[OrientationCode.deg270]: {rotation: 270, flipped: false},
		[OrientationCode.flipped]: {rotation: 0, flipped: true},
		[OrientationCode.deg90Flipped]: {rotation: 90, flipped: true},
		[OrientationCode.deg180Flipped]: {rotation: 180, flipped: true},
		[OrientationCode.deg270Flipped]: {rotation: 270, flipped: true}
	}

	const meta = await sharp(file).metadata()

	return orientationInfoMap[meta.orientation]?.rotation || 0

}

//

export async function clean(file){

	return new Promise((resolve, reject) => {
		fs.unlink(file, err => {
			if(err) return reject(err)
			resolve(file)
		})
	})

}

export async function download(url, dst){

	return pipeline(
		ky.stream(url),
		fs.createWriteStream(dst)
	)

}

//

export async function generatedFiles(dir, pattern){
	try{
		const files = await readdir(dir)

		return files
			.filter(f => f.includes(pattern))
			.map(f => dir + '/' + f)

	} catch (e) {
		throw e
	}
}

//

export function mediaSize(medium){
	const props = medium.properties || []

	const height = props.reduce((acc, next) => {
		if(next.key === 'height') return next.value
		return acc
	}, null)

	const width = props.reduce((acc, next) => {
		if(next.key === 'width') return next.value
		return acc
	}, null)

	return {height, width}
}

export function createThumbnailUrl(media, mode, value){
	return `${process.env.API_URL}/media/${media._id}/thumbnail/${mode}/${value}/${encodeURI(media.name)}`
}
