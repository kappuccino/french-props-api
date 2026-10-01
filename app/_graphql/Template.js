import {genFailedMutation} from './_helper.js'
import * as templateApi from '../template/template.js'

// --

const Template = `
  type Template {
    _id: String
		slug: String
		name: String
		
		title: String
		content: String
	
	  created: Date
    updated: Date
  }
`

const TemplateMutation = `
  type TemplateMutation{
    success: Boolean
    message: String
		stack: [String]
    template: Template
  }
`

// --

export default {
	TypeDefs: [
		Template,

		TemplateMutation
	],

	//--

	Query: `
    getAllTemplates: [Template]
    getTemplateById(_id: String!): Template
    getTemplateBySlug(slug: String!): Template
	`,

	QueryResolvers: {
		getAllTemplates: () => templateApi.getAll(),
		getTemplateById: (obj, {_id}) => templateApi.getById(_id),
		getTemplateBySlug: (obj, {slug}) => templateApi.getBySlug(slug),
	},

	Resolvers: {
		Template: {
		}
	},

	//--

	Mutation: `
		updateTemplate(_id:String! data:JSONObject!): TemplateMutation
		testTemplate(_id:String!): TemplateMutation
	`,

	MutationResolvers: {
		updateTemplate: async (obj, {_id, data}, context) => {
			try {
				const template = await templateApi.update(_id, data)
				return {success: true, template}
			} catch(err) {
				return genFailedMutation(err, context)
			}
		},

		testTemplate: async (obj, {_id}, context) => {
			try {
				await templateApi.test(_id, context.user)
				return {success: true}
			} catch(err) {
				return genFailedMutation(err, context)
			}
		},
	}
}
