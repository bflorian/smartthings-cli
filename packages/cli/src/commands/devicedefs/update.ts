import { SelectingInputOutputAPICommand } from '@smartthings/cli-lib'
import {buildTableOutput, DeviceDefinition, DeviceDefinitionRequest, prunePresentationValues, augmentPresentationValues} from '../devicedefs'
import {generateDefaultConfig} from './create'
import {cleanupRequest} from '../deviceprofiles/update'


export default class CapabilitiesUpdate extends SelectingInputOutputAPICommand<DeviceDefinitionRequest, DeviceDefinition, DeviceDefinition> {
	static description = 'update a device definition'

	static flags = SelectingInputOutputAPICommand.flags

	static args = [{
		name: 'id',
		description: 'device definition to retrieve; UUID or the number from list',
	}]

	primaryKeyName = 'id'
	sortKeyName = 'name'

	protected listTableFieldDefinitions = ['name', 'status', 'id']

	protected buildTableOutput = buildTableOutput

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(CapabilitiesUpdate)
		await super.setup(args, argv, flags)

		this.processNormally(args.id,
			() => { return this.client.deviceProfiles.list() },
			async (id, data) => {
				const profileData = data
				let presentationData = data.presentation
				delete profileData.presentation

				if (presentationData) {
					presentationData = augmentPresentationValues(presentationData)
				} else {
					// eslint-disable-next-line no-console
					//console.log('Generating presentation')
					presentationData = await generateDefaultConfig(this.client, id, profileData)
				}

				// eslint-disable-next-line no-console
				//console.log(`Creating presentation from ${JSON.stringify(presentationData, null, 2)}`)
				const presentation = await this.client.presentation.create(presentationData)
				if (!profileData.metadata) {
					profileData.metadata = {}
				}
				profileData.metadata.vid = presentation.vid
				profileData.metadata.mnmn = presentation.mnmn
				// eslint-disable-next-line no-console
				console.log(`Updating profile from ${JSON.stringify(cleanupRequest(profileData), null, 2)}`)
				const profile = await this.client.deviceProfiles.update(id, cleanupRequest(profileData))

				return {...profile, presentation: prunePresentationValues(presentation)}
			})
	}
}
