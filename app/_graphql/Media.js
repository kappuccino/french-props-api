import {genFailedMutation, getMedia} from './_helper.js'
import * as apiMedia from '../media/media.js'

// --

const Media = `
  type Media {
    _id: String
    domain: String
    url: String
    webp: String
    avif: String
    name: String
    status: String
    type: String
    mime: String
    properties: [KeyValue]
    meta: [KeyValue]
    
    titleFR: String
    titleEN: String
		captionFR: String
		captionEN: String
    
    isPrivate: Boolean
    isPublic: Boolean
    height: Int
    width: Int
    ratio: Float
    
    source: String
    _source: String
  }
`

const MediaSearch = `
  type MediaSearch {
    total: Int,
    limit: Int,
    skip: Int,
    data: [Media]
  }
`

const KeyValue = `
  type KeyValue {
    _id: String
    key: String
    value: String
  }
`

const KeyValueInput = `
  input kv {
    key: String
    value: String
    operator: String
  }
`

const MediaLocale = `
  type MediaLocale {
   	_id: String
		language: String
		caption: String
		description: String
		link: String
  }
`

const MediaMutation = `
  type MediaMutation{
    success: Boolean
    message: String
		stack: [String]
    media: Media
  }
`

// --

function isPrivate(medium){
	if(!medium) return null
	return apiMedia.isPrivate(medium)
}

function isPublic(medium){
	if(!medium) return null
	return apiMedia.isPublic(medium)
}

function getPropertyValue(media, key){
	const properties = media.properties || []
	if(!properties || !properties.length) return null

	const property = properties.find(p => p.key === key)
	if(!property || !property.value) return null

	return String(property.value)
}

function getSource(medium){
	if(!medium) return null
	const meta = (medium.meta || []).find(p => p.key === 'source')
	return meta ? meta.value : null
}

function getSourceId(medium){
	if(!medium) return null
	const meta = (medium.meta || []).find(p => p.key === '_source')
	return meta ? meta.value : null
}


/*
A consever
function getMetaValue(media, key){
	const meta = media.meta || []
	if(!meta || !meta.length) return null

	const property = meta.find(p => p.key === key)
	if(!property || !property.value) return null

	return String(property.value)
}*/


// --

export default {
	TypeDefs: [
		Media,
		MediaSearch,
		KeyValue,
		KeyValueInput,

		MediaMutation
	],

	Query: `
		#searchMedia(sort:String, limit:Int, skip:Int, meta:[kv], properties:[kv], _id:String): MediaSearch
    getMediaById(_id:String! height:Int width:Int): Media
    getMediaByIds(_ids:[String]!): [Media]
  `,

	QueryResolvers: {
		/*searchMedia: (obj, args) => apiMedia.search(args),*/
		getMediaById: (obj, args) => getMedia(args._id, args),
		getMediaByIds: (obj, args) => apiMedia.getByIds(args._ids, args),
	},

	Resolvers: {
		Media: {
			domain: () => process.env.API_URL,
			isPrivate: obj => isPrivate(obj),
			isPublic: obj => isPublic(obj),

			height: obj => obj.height ? obj.height : getPropertyValue(obj, 'height'),
			width: obj => obj.width ? obj.width : getPropertyValue(obj, 'width'),
			ratio: obj => {
				let width = obj.width
				if(!width) width = getPropertyValue(obj, 'width')

				let height = obj.height
				if(!height) height = getPropertyValue(obj, 'height')

				return width > 0 && height > 0 ? width / height : null
			},

			source: obj => getSource(obj),
			_source: obj => getSourceId(obj),
		}
	},

	//

	Mutation: `
		rotateMedia(_id:String!, reverse:Boolean): MediaMutation
		updateMedia(_id:String!, data:JSONObject!): MediaMutation
	`,

	MutationResolvers: {
		rotateMedia: async (obj, {_id, reverse=false}, context) => {
			try {
				const media = await apiMedia.rotate(_id, reverse)
				return {success: true, media}
			} catch(err) {
				return genFailedMutation(err, context)
			}
		},

		updateMedia: async (obj, {_id, data}, context) => {
			try {
				const media = await apiMedia.update(_id, data)
				return {success: true, media}
			} catch(err) {
				return genFailedMutation(err, context)
			}
		},
	}
}
