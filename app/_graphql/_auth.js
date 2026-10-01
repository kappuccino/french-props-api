import {allowed, unauthorized} from './_helper.js'

const authPlugin = {
	async requestDidStart() {
		return {
			// Ce hook s'exécute une seule fois, avant l'exécution des resolvers.
			async didResolveOperation(context) {

				// Liste des opérations publiques qui ne nécessitent pas d'authentification.
				const bypass = [
					'login',
					'loginOption',
					'loginVerify',
					'prepareReset',
					'resetPassword',
					'changePassword',
					'getUserFromJWT',
					'getUserFromMagic',
					'checkTFA',
					'recoverTFA',
					'magicLink',
					'getConfig',
					'getPublicSettings',
					'openSession',
					'closeSession',
				]

				// En développement, on autorise ceraines requêtes
				if(process.env.NODE_ENV !== 'production'){
					bypass.push('__schema') // Important pour les outils qui demande le schéma
				}

				// On analyse les champs demandés pour voir s'ils sont tous dans la liste bypass.
				const isBypassed = context.document.definitions
					.find(def => def.kind === 'OperationDefinition')
					.selectionSet.selections
					.every(selection => bypass.includes(selection.name.value))

				// Si l'opération n'est pas dans la liste bypass et que l'utilisateur n'est pas autorisé...
				if (!isBypassed && !allowed(context.contextValue)) {
					// ...on bloque la requête immédiatement.
					unauthorized()
				}
			}
		}
	}
}

export default authPlugin
