import {parse as parseCookies} from 'cookie'

import {SESSION_COOKIE} from './session.js'

let io_
let socketUserMap = new Map() // List of users (socket -> publicUser)

// Imported at runtime, from init(): server-middleware.js and media/media.js
// resolve mongoose models at load time.
let userFromToken
let getMediaById

// ——

function log(name, ...rest){
	console.log('[⚡]', name) //, ...rest)
}


// —— USER

// Only expose non-sensitive identity fields: getById returns the full user
// document (password, auth, tfa…), which must never be broadcast nor kept
// around. socketUserMap therefore holds this trimmed shape only.
function publicUser(user){
	if(!user?._id) return null
	return {_id: user._id, firstName: user.firstName, lastName: user.lastName, picture: null}
}

// The avatar is resolved once at connection time (Thumbnail needs the media
// document, the user only holds its id). Done after publicUser so the identity
// is available synchronously.
async function resolvePicture(socketID, _picture){
	if(!_picture) return

	const picture = await getMediaById(_picture)
	const user = socketUserMap.get(socketID)
	if(!user) return // disconnected in the meantime

	socketUserMap.set(socketID, {...user, picture})
}

function disconnect(io, client){
	socketUserMap.delete(client.id)
	broadcastUsers(io)
}

export function getUserFromSocket(socketID){
	return socketUserMap.get(socketID)
}

function broadcastUsers(io){
	let users = new Map()

	for(let [, user] of socketUserMap.entries()){
		if(!user) continue

		const _user = user?._id?.toString()
		if(!users.has(_user)) users.set(_user, user)
	}

	io.emit('updateUsers', Array.from(users.values()))
}


// ——

export default async function init(io) {
	io_ = io

	;({userFromToken} = await import('./server-middleware.js'))
	;({getById: getMediaById} = await import('./media/media.js'))

	// Handshake auth: socket identity is derived from the verified JWT (session
	// cookie, or an explicit token for non-browser clients), never from a
	// client-supplied payload. Missing/invalid token → connection refused.
	io.use(async (socket, next) => {
		try {
			const cookies = parseCookies(socket.handshake.headers.cookie || '')
			const token = socket.handshake.auth?.token || cookies[SESSION_COOKIE]
			const user = await userFromToken(token)
			if(!user) return next(new Error('unauthorized'))

			socket.data.user = user
			next()
		} catch(err){
			next(new Error('unauthorized'))
		}
	})

	io.on('connection', client => {
		socketUserMap.set(client.id, publicUser(client.data.user))
		broadcastUsers(io)

		resolvePicture(client.id, client.data.user?._picture)
			.then(() => broadcastUsers(io))
			.catch(e => log('connection() resolvePicture', e))

		//log('Client is connected with ID:', client.id)

		client.on('disconnect', () => disconnect(io, client))
	})

}

export function broadcast(name, ...args){
	log('broadcast', name, ...args)
	io_?.emit(name, ...args)
}
