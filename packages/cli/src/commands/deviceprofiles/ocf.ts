import open from 'open'

import axios from 'axios'

import { DeviceProfile } from '@smartthings/core-sdk'

import {IOFormat, ListingOutputAPICommand} from '@smartthings/cli-lib'


export interface OcfUiMetadata {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[name: string]: any
}

export default class DeviceProfileOCFCommand extends ListingOutputAPICommand<OcfUiMetadata, DeviceProfile> {
	static description = 'delete a device profile'

	static flags = ListingOutputAPICommand.flags

	static args = [{
		name: 'id',
		description: 'Device profile UUID or number in the list',
	}]

	primaryKeyName = 'id'
	sortKeyName = 'name'

	protected buildTableOutput(data: OcfUiMetadata): string {
		return data.message
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(DeviceProfileOCFCommand)
		await super.setup(args, argv, flags)

		this.processNormally(args.id,
			async () => await this.client.deviceProfiles.list(),
			async (id) => {
				const profile = await this.client.deviceProfiles.get(id)

				let base = 'https://uimetadata.samsungiotcloud.com/oic/metadata/presentation'
				if (this.clientIdProvider.baseURL !== 'https://api.smartthings.com') {
					base = 'https://uimetadata-globals-useast1.samsungiots.com/oic/metadata/presentation'
				}

				if (profile.metadata) {
					const url = `${base}?vid=${profile.metadata.vid}&mnmn=${profile.metadata.mnmn}`

					if (this.outputOptions.format === IOFormat.YAML || this.outputOptions.format === IOFormat.JSON) {
						const response = await axios.get(url)
						return response.data
					} else {
						open(url)
						return {message: 'showing UI metadata in browser'}
					}
				}
				return {status: 'error -- profile has no metadata'}
			})
	}
}
