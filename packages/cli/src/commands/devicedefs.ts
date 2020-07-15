import { DeviceProfile, DeviceProfileRequest, PresentationDeviceConfigEntry } from '@smartthings/core-sdk'

import {APICommand, ListingOutputAPICommand, TableFieldDefinition} from '@smartthings/cli-lib'

import { flags } from '@oclif/command'


export interface DevicePresentationDefinition {
	dashboard?: {
		states: PresentationDeviceConfigEntry[]
		actions: PresentationDeviceConfigEntry[]
	}
	detailView?: PresentationDeviceConfigEntry[]
	automation?: {
		conditions: PresentationDeviceConfigEntry[]
		actions: PresentationDeviceConfigEntry[]
	}
}

export interface DeviceDefinition extends DeviceProfile {
	presentation?: DevicePresentationDefinition
}

export interface DeviceDefinitionRequest extends DeviceProfileRequest {
	presentation?: DevicePresentationDefinition
}

function entryValues(entries: PresentationDeviceConfigEntry[]): string {
	return entries.map(entry => `${entry.component}/${entry.capability}`).join('\n')
}

export function buildTableOutput(this: APICommand, data: DeviceDefinition): string {
	const table = this.tableGenerator.newOutputTable()
	table.push(['Name', data.name])
	for (const comp of data.components) {
		table.push([`${comp.id} component`,  comp.capabilities ? comp.capabilities.map(it => it.id).join('\n') : ''])
	}
	table.push(['Id', data.id])
	table.push(['Device Type', data.metadata?.deviceType ?? ''])
	table.push(['OCF Device Type', data.metadata?.ocfDeviceType ?? ''])
	table.push(['mnmn', data.metadata?.mnmn ?? ''])
	table.push(['vid', data.metadata?.vid ?? ''])
	table.push(['Status', data.status])
	if (data.presentation) {
		if (data.presentation.dashboard) {
			if (data.presentation.dashboard.states) {
				table.push(['Dashboard states', entryValues(data.presentation.dashboard.states)])
			}
			if (data.presentation.dashboard.actions) {
				table.push(['Dashboard actions', entryValues(data.presentation.dashboard.actions)])
			}
		}
		if (data.presentation.detailView) {
			table.push(['Detail view', entryValues(data.presentation.detailView)])
		}
		if (data.presentation.automation) {
			if (data.presentation.automation.conditions) {
				table.push(['Automation conditions', entryValues(data.presentation.automation.conditions)])
			}
			if (data.presentation.automation.actions) {
				table.push(['Automation actions', entryValues(data.presentation.automation.actions)])
			}
		}
	}
	return table.toString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prunePresentation(presentation: { [key: string]: any }): void {
	delete presentation.mnmn
	delete presentation.vid
	delete presentation.type
	if (presentation.dpInfo === null) {
		delete presentation.dpInfo
	}
}

function prunePresentationEntries(entries?: PresentationDeviceConfigEntry[]): void {
	if (entries) {
		for (const entry of entries) {
			if (entry.version === 1) {
				delete entry.version
			}
			if (entry.values && entry.values.length === 0) {
				delete entry.values
			}
			if (!entry.visibleCondition) {
				delete entry.visibleCondition
			}
		}
	}
}

export function prunePresentationValues(presentation: DevicePresentationDefinition): DevicePresentationDefinition {
	prunePresentation(presentation)
	prunePresentationEntries(presentation.dashboard?.states)
	prunePresentationEntries(presentation.dashboard?.actions)
	prunePresentationEntries(presentation.detailView)
	prunePresentationEntries(presentation.automation?.conditions)
	prunePresentationEntries(presentation.automation?.actions)
	return presentation
}

function augmentPresentationEntries(entries?: PresentationDeviceConfigEntry[]): void {
	if (entries) {
		for (const entry of entries) {
			if (!entry.version) {
				entry.version = 1
			}
		}
	}
}

export function augmentPresentationValues(presentation: DevicePresentationDefinition): DevicePresentationDefinition {
	augmentPresentationEntries(presentation.dashboard?.states)
	augmentPresentationEntries(presentation.dashboard?.actions)
	augmentPresentationEntries(presentation.detailView)
	augmentPresentationEntries(presentation.automation?.conditions)
	augmentPresentationEntries(presentation.automation?.actions)
	return presentation
}

export default class DeviceDefsList extends ListingOutputAPICommand<DeviceDefinition, DeviceProfile> {
	static description = 'list all device definitions available in a user account or retrieve a single definition'

	static flags = {
		...ListingOutputAPICommand.flags,
		verbose: flags.boolean({
			description: 'include vid and mnmn in list output',
			char: 'v',
		}),
	}

	static args = [{
		name: 'id',
		description: 'device definition to retrieve; UUID or the number from list',
	}]

	primaryKeyName = 'id'
	sortKeyName = 'name'


	protected listTableFieldDefinitions: TableFieldDefinition<DeviceProfile>[] = ['name', 'status', 'id']

	protected buildTableOutput = buildTableOutput

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DeviceDefsList)
		await super.setup(args, argv, flags)

		if (this.flags.verbose) {
			this.listTableFieldDefinitions.push({ label: 'vid', value: (item) => item.metadata ? item.metadata.vid : '' })
			this.listTableFieldDefinitions.push({ label: 'mnmn', value: (item) => item.metadata ? item.metadata.mnmn : '' })
		}

		this.processNormally(
			args.id,
			() => { return this.client.deviceProfiles.list() },
			async (id) => {
				const profile = await this.client.deviceProfiles.get(id)
				if (profile.metadata) {
					try {
						const presentation = await this.client.presentation.get(profile.metadata.vid)
						prunePresentationValues(presentation)
						return {...profile, presentation}
					} catch (error) {
						return profile
					}
				} else {
					return profile
				}
			},
		)
	}
}
