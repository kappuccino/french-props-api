export const collation = {
	locale: 'fr',
	strength: 1,
	caseLevel: false,
	numericOrdering: true
}

export function modelAutoRemove(){

	const entries = Object.entries(this._doc)
	if(!entries) return

	for(let [field, value] of entries){
		const schema = this.schema.path(field)

		if(!schema || !schema.options.autoRemove) continue

		let remove = false

		if(typeof value === 'string'){
			if(value.length === 0) remove = true
		}

		if(Array.isArray(value)){
			if(!value.length) remove = true
		}

		if(value === null) remove = true

		// Remove the field
		if(remove) this.set(field, undefined);
	}

}

// Build a plain copy of a document, keeping only the schema fields that are
// not marked as _snapshot: false (used when freezing contact/company data into a document)
export function modelSnapshot(schema, doc){

	if(!doc) return doc

	const snapshot = {}

	for(let [field, value] of Object.entries(doc)){
		if(field === '__v') continue

		const path = schema.path(field)
		if(!path) continue

		// For array fields the flag is carried by the item options, not by the path itself
		const flag = path.options?._snapshot ?? path.options?.type?.[0]?._snapshot
		if(flag === false) continue

		snapshot[field] = value
	}

	return snapshot
}
