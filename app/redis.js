import Redis from 'ioredis'

export const isObject = (value) => value !== null && typeof value === 'object'

const redis = new Redis(process.env.REDIS, {
	maxRetriesPerRequest: null
})

export default redis

export async function set(key, value, ttl=null){
	const theValue = isObject(value) ? JSON.stringify(value) : value

	if(ttl > 0) return redis.set(key, theValue, "EX", ttl)
	return redis.set(key, theValue)
}

export async function get(key){
	let value = await redis.get(key)
	if(value === null) return null

	try{
		value = JSON.parse(value)
	} catch(e){
		return value // raw value
	}

	return value
}

export async function getRaw(key){
	return redis.get(key)
}

export async function del(key) {
	return redis.del(key)
}

export async function keys(key){
	return redis.keys(key)
}

export async function smembers(key){
	return redis.smembers(key)
}

export async function sadd(key, value){
	return redis.sadd(key, value)
}

export async function srem(key, value){
	return redis.srem(key, value)
}


// ?????????????????????????????????????????????????????????

export async function setex(){
}

export async function mget(){
}

export async function getBuffer(){
}

