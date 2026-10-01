import * as mailQueueApi from '../mail-queue/mail-queue.js'

// --

const MailQueue = `
  type MailQueue {
    _id: String
    error: String
    raw: JSONObject
    date: Date
  }
`

const MailQueueAggregate = `
  type MailQueueAggregate {
    total: Int
    limit: Int
    skip: Int
    data: [MailQueue]
  }
`

const MailQueueAggregateParams = `
	input MailQueueAggregateParams {
    limit: Int
    skip: Int
    sort: JSONObject
  }
`

const MailQueueMutation = `
  type MailQueueMutation{
    success: Boolean
    message: String
		stack: [String]
    mailQueue: MailQueue
  }
`
// --

export default {
	TypeDefs: [
		MailQueue,
		MailQueueAggregate,
		MailQueueAggregateParams,

		MailQueueMutation
	],
	//--

	Query: `
    aggregateMailQueue(params: MailQueueAggregateParams): MailQueueAggregate
	`,

	QueryResolvers: {
		aggregateMailQueue: (obj, args) => mailQueueApi.aggregate(args)
	},

	//--

	Resolvers: {
	},

	//--

	Mutation: `
		resendMailQueue(_id: String!): GenericMutation
		removeMailQueue(_id: String!): GenericMutation
	`,

	MutationResolvers: {
		resendMailQueue: async (obj, {_id}) => {
			const success = await mailQueueApi.resend(_id)
			return {success}
		},

		removeMailQueue: async (obj, {_id}) => {
			const success = await mailQueueApi.remove(_id)
			return {success}
		}
	}
}
