import open from 'open'

import axios from 'axios'

import {APICommand, IOFormat, OutputAPICommand} from '@smartthings/cli-lib'

import { OcfUiMetadata } from '../deviceprofiles/ocf'


export default class PresentationOCFCommand extends OutputAPICommand<OcfUiMetadata> {
	static description = 'show the OCF UI metadata for a vid'

	static flags = OutputAPICommand.flags

	static args = [
		{
			name: 'vid',
			description: 'Presentation id',
			required: true,
		},
		{
			name: 'mnmn',
			description: 'Manufacturer name. Defaults to SmartThingsCommunity',
		},
	]

	primaryKeyName = 'id'
	sortKeyName = 'name'

	protected buildTableOutput(data: OcfUiMetadata): string {
		return data.message
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(PresentationOCFCommand)
		await super.setup(args, argv, flags)

		this.processNormally(async () => {
			let base = 'https://uimetadata.samsungiotcloud.com/oic/metadata/presentation'
			if (this.clientIdProvider.baseURL !== 'https://api.smartthings.com') {
				base = 'https://uimetadata-globals-useast1.samsungiots.com/oic/metadata/presentation'
			}

			const url = `${base}?vid=${args.vid}&mnmn=${args.mnmn || 'SmartThingsCommunity'}`

			if (this.outputOptions.format === IOFormat.YAML || this.outputOptions.format === IOFormat.JSON) {
				const response = await axios.get(url)
				return response.data
			} else {
				open(url)
				return {message: 'showing UI metadata in browser'}
			}
		})
	}
}
