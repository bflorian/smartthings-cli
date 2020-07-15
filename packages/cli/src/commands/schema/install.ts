import { SchemaApp } from '@smartthings/core-sdk'
import { SelectingAPICommand } from '@smartthings/cli-lib'
import { openStrongmanAppView } from '../../lib/strongman'


export default class SchemaAppInstallCommand extends SelectingAPICommand<SchemaApp> {
	static description = 'install an instance of the schema connector'

	static flags = SelectingAPICommand.flags

	static args = [{
		name: 'id',
		description: 'the schema connector id',
	}]

	primaryKeyName = 'endpointAppId'
	sortKeyName = 'appName'
	acceptIndexId = true

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(SchemaAppInstallCommand)
		await super.setup(args, argv, flags)

		this.processNormally(
			args.id,
			() => this.client.schema.list(),
			async (id) => {
				if (this.token) {
					openStrongmanAppView(this.profileName, this.token, id)
				} else {
					throw new Error('Unable to launch installer window due to missing token')
				}
			},
			'Launching ST schema installer window'
		)
	}
}
