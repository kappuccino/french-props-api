import mongoose from 'mongoose'

const Settings = mongoose.model('Settings')

export async function getBySlug(slug){
	return Settings.findOne({slug}).lean()
}

export async function getDefault(){
	return getBySlug('default')
}

export async function update(slug, data){
	let $settings = await Settings.findOne({slug})
	if(!$settings) $settings = new Settings({slug})

	Object
		.entries(data)
		.forEach(([key, value]) => $settings.set(key, value))

	await $settings.save()

	return getBySlug(slug)
}
