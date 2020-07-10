import { SchemaApp, Status } from '@smartthings/core-sdk'
import { ListingOutputAPICommand } from '@smartthings/cli-lib'
import { openStrongmanAppView } from '../../lib/strongman'


export default class SchemaAppInstallCommand extends ListingOutputAPICommand<Status, SchemaApp> {
	static description = 'install an instance of the schema connector'

	static flags = ListingOutputAPICommand.flags

	static args = [{
		name: 'id',
		description: 'the schema connector id',
	}]

	primaryKeyName = 'endpointAppId'
	sortKeyName = 'appName'

	protected buildTableOutput(data: Status): string {
		return data.status
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(SchemaAppInstallCommand)
		await super.setup(args, argv, flags)

		this.processNormally(
			args.id,
			() => this.client.schema.list(),
			async (id) => {
				if (this.token) {
					openStrongmanAppView(this.profileName, id)
					return {status: 'Launching ST schema installer window'}
				}
				return {status: 'Unable to open installer window due to missing token'}
			},
		)
	}
}
