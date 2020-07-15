import { SmartThingsClient, PresentationDeviceConfigCreate, DeviceProfileRequest} from '@smartthings/core-sdk'
import { InputOutputAPICommand } from '@smartthings/cli-lib'
import {cleanupRequest} from '../deviceprofiles/create'
import { buildTableOutput, prunePresentationValues, augmentPresentationValues, DeviceDefinition, DeviceDefinitionRequest } from '../devicedefs'


const capabilityBlacklist = ['healthCheck', 'execute']

export async function generateDefaultConfig(client: SmartThingsClient, deviceProfileId: string,  deviceProfile: DeviceProfileRequest | DeviceDefinitionRequest): Promise<PresentationDeviceConfigCreate> {
	// Generate the default config
	const deviceConfig = await client.presentation.generate(deviceProfileId)

	// Edit the dashboard entries to include only the first capability in the profile
	if (deviceProfile.components && deviceConfig.dashboard) {
		const firstComponent = deviceProfile.components[0]
		if (firstComponent.capabilities && firstComponent.capabilities.length > 0) {
			const firstCapability = firstComponent.capabilities[0]
			const capability = await client.capabilities.get(firstCapability.id, firstCapability.version || 1)

			if (capability.attributes && Object.keys(capability.attributes).length > 0) {
				deviceConfig.dashboard.states = deviceConfig.dashboard.states.filter(it =>
					it.component === firstComponent.id && it.capability === firstCapability.id)
			} else {
				deviceConfig.dashboard.states = []
			}

			if (capability.commands && Object.keys(capability.commands).length > 0) {
				deviceConfig.dashboard.actions = deviceConfig.dashboard.actions.filter(it =>
					it.component === firstComponent.id && it.capability === firstCapability.id)
			} else {
				deviceConfig.dashboard.actions = []
			}
		}
	}

	// Filter capabilities with no UI
	if (deviceConfig.detailView) {
		deviceConfig.detailView = deviceConfig.detailView.filter(it => !(capabilityBlacklist.includes(it.capability)))
	}

	// Filter automation entries
	if (deviceConfig.automation) {

		// Filter out conditions for capabilities that don't have attributes
		if (deviceConfig.automation.conditions) {
			const capabilities = await Promise.all(deviceConfig.automation.conditions.map(it => {
				return client.capabilities.get(it.capability, it.version || 1)
			}))
			deviceConfig.automation.conditions = deviceConfig.automation.conditions.filter((_v, index) => {
				const capability = capabilities[index]
				return capability.attributes && Object.keys(capability.attributes).length > 0 && !(capabilityBlacklist.includes(capability.id || ''))
			})
		}

		// Filter out automation actions for capabilities that don't have commands
		if (deviceConfig.automation.actions) {
			const capabilities = await Promise.all(deviceConfig.automation.actions.map(it => {
				return client.capabilities.get(it.capability, it.version || 1)
			}))
			deviceConfig.automation.actions = deviceConfig.automation.actions.filter((_v, index) => {
				const capability = capabilities[index]
				return capability.commands && Object.keys(capability.commands).length > 0 && !(capabilityBlacklist.includes(capability.id || ''))
			})
		}
	}

	return deviceConfig
}

export default class DeviceDefCreateCommand extends InputOutputAPICommand<DeviceDefinitionRequest, DeviceDefinition> {
	static description = 'create a new device profile'

	static flags = InputOutputAPICommand.flags

	protected buildTableOutput = buildTableOutput

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DeviceDefCreateCommand)
		await super.setup(args, argv, flags)

		this.processNormally(async (data) => {
			let profile
			let deviceConfig
			if (data.presentation) {
				// Create the config
				// eslint-disable-next-line no-console
				console.log(`Creating config from ${JSON.stringify(augmentPresentationValues(data.presentation), null, 2)}`)
				deviceConfig = await this.client.presentation.create(augmentPresentationValues(data.presentation))

				// Set the vid and mnmn from the config
				if (!data.metadata) {
					data.metadata = {}
				}
				data.metadata.vid = deviceConfig.vid
				data.metadata.mnmn = deviceConfig.mnmn
				delete data.presentation

				// eslint-disable-next-line no-console
				console.log(`Updating profile from ${JSON.stringify(cleanupRequest(data), null, 2)}`)
				profile = await this.client.deviceProfiles.create(cleanupRequest(data))
			} else {
				// Create the profile
				profile = await this.client.deviceProfiles.create(cleanupRequest(data))

				// Generate the default config
				const deviceConfigData = await generateDefaultConfig(this.client, profile.id, profile)

				// Create the config using the default
				deviceConfig = await this.client.presentation.create(deviceConfigData)

				// Update the profile to use the vid from the config
				const profileId = profile.id
				cleanupRequest(profile)
				delete profile.name
				if (!profile.metadata) {
					profile.metadata = {}
				}
				profile.metadata.vid = deviceConfig.vid
				profile.metadata.mnmn = deviceConfig.mnmn
				profile = await this.client.deviceProfiles.update(profileId, profile)
			}
			return {...profile, presentation: prunePresentationValues(deviceConfig)}
		})
	}
}
