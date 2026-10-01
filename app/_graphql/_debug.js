import express from 'express'
import {gql} from 'graphql-tag'

function exposeQuery(req, res, next){
	const q = gql`${req.body.query}`

	let trace = []
	;(q.definitions || []).forEach(definition => {
		if(definition.operation !== 'query') return
		trace.push(definition.operation)

		const selections = definition.selectionSet?.selections || []
		if(!selections.length) return

		selections.forEach(selection => {
			if(selection.kind !== 'Field') return
			trace.push(selection.name.value)
		})

	})

	console.log('>', trace.join(' '))
	console.log('> variables', JSON.stringify(req.body.variables || {}))

	next()
}

export default function(app){
	const router = express.Router(app)
	router.post('/', exposeQuery)
	app.use('/graphql', router)
}
