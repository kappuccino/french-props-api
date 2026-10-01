import * as configApi from '../config/config.js'

const Config = `
  type Config {
    id: String
		name: String
  }
`

// --

export default {
	TypeDefs: [
		Config
	],

	// --

	Query: `
		getConfig: JSONObject
	`,

	QueryResolvers: {
		getConfig: () => configApi.getConfig()
	},

	// --

	Resolvers: {
		Config: {
		}
	},

	// --

	Mutation: ``,

	MutationResolvers: {},
}
