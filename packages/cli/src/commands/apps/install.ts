import { App, Status } from '@smartthings/core-sdk'
import { ListingOutputAPICommand } from '@smartthings/cli-lib'
import { openStrongmanAppView } from '../../lib/strongman'


export default class AppInstallCommand extends ListingOutputAPICommand<Status, App> {
	static description = 'install an instance of the app'

	static flags = ListingOutputAPICommand.flags

	static args = [{
		name: 'id',
		description: 'the app id',
		required: true,
	}]

	primaryKeyName = 'appId'
	sortKeyName = 'displayName'

	protected buildTableOutput(data: Status): string {
		return data.status
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(AppInstallCommand)
		await super.setup(args, argv, flags)

		this.processNormally(
			args.id,
			() => this.client.apps.list(),
			async (id) => {
				if (this.token) {
					openStrongmanAppView(this.profileName, id)
					return {status: 'Launching installer window'}
				}
				return {status: 'Unable to open installer window due to missing location ID or profile'}
			},
		)
	}
}
