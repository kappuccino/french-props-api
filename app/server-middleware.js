import {verify, decode, sessionTTL} from './jwt.js'
import {getById as getUserById, createJWT} from './user/user.js'
import {setSessionCookie, SESSION_COOKIE} from './session.js'

export async function userFromToken(token){
	const decoded = await verify(token)
	if(!decoded?._user) return null

	const user = await getUserById(decoded._user)
	if(user?.auth !== decoded.auth) return null

	// Token versionning validation
	if(user.tokenVersion > 0 && decoded.version !== user.tokenVersion) return null

	return user
}

//--

export async function authQuery(req, res, next){

	// Already
	if(req.user?._id) return next()

	const token = req.query.jwt
	if(!token) return next()

	const user = await userFromToken(token)
	if(user){
		req.user = user
		req.self = 'user'
	}

	next()
}

export async function authHeader(req, res, next){

	// Already
	if(req.user?._id) return next()

	let token = req.headers['authorization']
	if(!token || !token?.startsWith('Bearer ')) return next()

	token = token.slice(7, token.length)

	const user = await userFromToken(token)
	if(user){
		req.user = user
		req.self = 'user'
	}

	next()
}

// Re-issue the session cookie once half of its lifetime has elapsed, so an
// active user never gets logged out. Long-lived tokens (service accounts) are
// left alone: they are not session tokens.
async function refreshSession(res, token, user){
	const {iat, exp} = decode(token) || {}
	if(!iat || !exp) return

	const ttl = sessionTTL()
	if(exp - iat > ttl) return

	const now = Math.floor(Date.now() / 1000)
	if(exp - now > ttl / 2) return

	setSessionCookie(res, await createJWT(user))
}

export async function authCookie(req, res, next){

	// Already
	if(req.user?._id) return next()

	let token = req.cookies[SESSION_COOKIE]
	if(!token) return next()

	const user = await userFromToken(token)
	if(user){
		req.user = user
		req.self = 'user'
		await refreshSession(res, token, user)
	}

	next()
}
