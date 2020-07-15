import { App } from '@smartthings/core-sdk'
import { SelectingAPICommand } from '@smartthings/cli-lib'
import { openStrongmanAppView } from '../../lib/strongman'


export default class AppInstallCommand extends SelectingAPICommand<App> {
	static description = 'install an instance of the app'

	static flags = SelectingAPICommand.flags

	static args = [{
		name: 'id',
		description: 'the app id',
	}]

	primaryKeyName = 'appId'
	sortKeyName = 'displayName'
	acceptIndexId = true

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(AppInstallCommand)
		await super.setup(args, argv, flags)

		this.processNormally(
			args.id,
			() => this.client.apps.list(),
			async (id) => {
				if (this.token) {
					openStrongmanAppView(this.profileName, this.token, id)
				} else {
					throw new Error('Unable to launch installer window due to missing token')
				}
			},
			'Launching the app installer window',
		)
	}
}
