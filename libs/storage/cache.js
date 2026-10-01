import {dirname} from 'path'
import {readFile, readdir, writeFile, mkdir, unlink} from 'fs/promises'

import {mongoIdToFolder, tempDir} from '../../app/tools.js'

export async function read(file){
	let raw

	try{
		const path = filePath(file)
		raw = await readFile(path)
	} catch(err){
		return null
	}

	return raw
}

export async function write(file, data){

	const path = filePath(file)
	const dir = dirname(path)

	try{
		await mkdir(dir, {recursive: true})
		await writeFile(path, data)
	} catch(err){
		return false
	}

	return true
}

export async function clear(_id){
	const dir = filePath(mongoIdToFolder(_id, true))

	try{
		let files = await readdir(dir)
		files = files.map(file => dir + '/' + file)
		if(files?.length) await Promise.all(files.map(file => unlink(file)))
	} catch(e){
		// silent
	}

}

function filePath(file){
	return tempDir() + '/cache/' + file
}
