import {GraphQLScalarType, Kind} from 'graphql'

import dayjs from '../dayjs.js'

export const dateScalar = new GraphQLScalarType({
	name: 'Date',
	description: 'Date custom scalar type',

	/**
	 * The serialize method converts the scalar's back-end representation to a JSON-compatible format so Apollo Server
	 * can include it in an operation response.
	 * */
	serialize(value){
		if(!value) return null
		return dayjs.utc(value).format('YYYY-MM-DD HH:mm:ss.SSSZ')
	},

	/**
	 * The parseValue method converts the scalar's JSON value to its back-end representation before it's
	 * added to a resolver's args.
	 * */
	parseValue(value){
		return new Date(value) // Convert incoming integer to Date
	},

	/**
	 * When an incoming query string includes the scalar as a hard-coded argument value, that value is part of the query
	 * document's abstract syntax tree (AST). Apollo Server calls the parseLiteral method to convert the value's AST
	 * representation to the scalar's back-end representation
	 */
	parseLiteral(ast){
		return new Date(ast.value)
	}
})
