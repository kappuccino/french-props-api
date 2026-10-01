import {verify} from './jwt.js'
import {getById as getUserById} from './user/user.js'

export function requireKnownUser(req, res, next){
	if(req.user?.auth) return next()
	notAuthorized(req, res, next)
}

export async function getAuthFromTokenQuery(req, res, next){
	if(req.session.auth) return next()

	const token = req.query.token
	if(!token) return next()

	const decoded = await verify(token)
	if(!decoded) return next()

	const user = await getUserById(decoded._user)
	if(!user) return next()

	if(user.auth !== decoded.auth) return next()
	req.session.auth = user.auth
	next()
}

/**
 * Réponse de l'API pour une requête ou tout s'est bien passé
 *
 * @param data
 * @param req
 * @param res
 */
export function success(data, req, res){
	res.json(data);
}

/**
 * Réponse de l'API en cas d'echec
 *
 * @param err
 * @param req
 * @param res
 * @param next
 *
 * @returns {*}
 */
export function fail(err, req, res, next){
	if(err) err.status = 400
	return next(err)
}

/**
 Catch Errors Handler

 With async/await, you need some way to catch errors
 Instead of using try{} catch(e) {} in each controller, we wrap the function in
 catchErrors(), catch any errors they throw, and pass it along to our express middleware with next()
 */
export function catchErrors(fn){
	return function (req, res, next) {
		return fn(req, res, next).catch(next);
	}
}

/**
 Not Found Error Handler
 If we hit a route that is not found, we mark it as 404 and pass it along to the next error handler to display
 */
export function notFound(req, res, next){
	const err = new Error('Not Found')
	err.status = 404
	next(err)
}

export function notAuthorized(req, res, next){
	const err = new Error('Not Authorized')
	err.status = 401
	next(err)
}

/**
 Development Error Hanlder

 In development, we show good error messages so if we hit a syntax error or any other previously un-handled error, we can show good info on what happened
 */
export function developmentErrors(err, req, res, next){

	console.log('-- 🔥 Error')
	console.log(err.stack)

	if(err.status) res.status(err.status)

	res.json({
		error: err.message,
		status: err.status,
		stack: err.stack || ''
	})
}

/**
 Production Error Handler

 No stacktraces are leaked to user
 */
export function productionErrors(err, req, res, next){
	//res.status(err.status || 500);

	if(err.status) res.status(err.status)

	res.json({
		error: err.message
	})
}

