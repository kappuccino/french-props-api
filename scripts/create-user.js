// Creates a user, typically the first superadmin of an empty database.
// Usage: npm run create:user -- <login> <password> [role=superadmin] [firstName] [lastName]
import mongoose from 'mongoose'

import '../app/db.js'
import {create} from '../app/user/user.js'
import redis from '../app/redis.js'

const [login, password, role = 'superadmin', firstName, lastName] = process.argv.slice(2)

if(!login || !password){
	console.log('Usage: npm run create:user -- <login> <password> [role=superadmin] [firstName] [lastName]')
	process.exit(1)
}

try {
	const user = await create({login, password, role, firstName, lastName})
	console.log(`${user.login} (${user.role}) created`)
} catch(err){
	console.error(err.message)
	process.exitCode = 1
}

await mongoose.disconnect()
redis.quit()
