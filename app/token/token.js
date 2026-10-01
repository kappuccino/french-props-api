import mongoose from 'mongoose'
import {nanoid} from 'nanoid'

import dayjs from '../dayjs.js'

const Token = mongoose.model('token')

export async function generateToken(data, minutes=60, forced=null){

	const id = forced || nanoid(36)

	// If a token exists with the same id, remove it
	const t = await Token.findOne({id}).lean()
	if(t) await removeToken(id)

	const $token = new Token({
		id: id,
		expireAt: dayjs().add(minutes, 'minutes').toDate(),
		data
	})

	await $token.save()

	return id
}

export async function getTokenData(id){
	const token = await Token.findOne({id}).lean()
	return token?.data || null
}

export async function removeToken(id){
	return Token.deleteOne({id})
}
