import jwt from 'jsonwebtoken'

// Lifetime of a session token (seconds), renewed silently while in use
export function sessionTTL(){
	return parseInt(process.env.JWT_TTL, 10) || 24 * 60 * 60
}

export function decode(token){
	return jwt.decode(token)
}

export function sign(data, options = {}){

	if('expiresIn' in options && !options.expiresIn) delete options.expiresIn

	const params = {
		expiresIn: sessionTTL(),
		...options,
		algorithm: 'HS256',
		//allowInsecureKeySizes: true
	}

	return jwt.sign(data, process.env.JWT_SALT, params)
}

export function verify(token, options = {}){
	return new Promise(resolve => {
		jwt.verify(
			token,
			process.env.JWT_SALT,
			{...options, algorithms: 'HS256'},
			(err, decoded) => {
				if(err) return resolve(false)
				resolve(decoded)
			}
		)
	})
}
