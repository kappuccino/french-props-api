import mongoose from 'mongoose'

import {sendMail, sanitizeAggregate} from '../tools.js'

const MailQueue = mongoose.model('MailQueue')


//——— Public

export async function getById(_id){
	return MailQueue.findOne({_id}).lean()
}

export async function aggregate(vars){

	const match = await makeMatch(vars.params)

	let agg = [
		{$match: match}
	]

	agg = sanitizeAggregate(agg, vars?.params || {})

	let [data, total] = await Promise.all([
		MailQueue.aggregate(agg),
		MailQueue.countDocuments(match)
	])

	return {
		skip: vars?.params?.skip,
		limit: vars?.params?.limit,
		total,
		data
	}

}

export async function create(data){
	delete data._id

	const $mailQueue = new MailQueue(data)
	await $mailQueue.save()

	return getById($mailQueue.get('_id'))
}

export async function resend(_id){

	const mail = await getById(_id)
	if(!mail._id){
		return {
			success: false,
			message: 'Mail not found'
		}
	}

	let success = false
	try {
		await sendMail(mail.raw)
		success = true
	} catch(e){
		// Error while sendin the email
	}

	await remove(mail._id)

	return success
}

export async function remove(_id){
	await MailQueue.deleteOne({_id})

	return true
}


// —— Private

async function makeMatch(vars){
	const query = new mongoose.Query()

	return query._conditions
}
