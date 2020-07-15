import { InstalledApp, Status} from '@smartthings/core-sdk'
import { SelectingAPICommand} from '@smartthings/cli-lib'
import { openStrongman } from '../../lib/strongman'


export default class InstalledAppInstallCommand extends SelectingAPICommand<InstalledApp> {
	static description = 'display app installer window'

	static flags = SelectingAPICommand.flags

	static args = [{
		name: 'id',
		description: 'the app id',
		required: true,
	}]

	primaryKeyName = 'installedAppId'
	sortKeyName =  'displayName'

	protected buildTableOutput(data: Status): string {
		return data.status
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(InstalledAppInstallCommand)
		await super.setup(args, argv, flags)

		this.processNormally(
			args.id,
			() => this.client.installedApps.list(),
			async (id) => {
				const isa = await this.client.installedApps.get(id)
				if (isa.locationId && this.token) {
					openStrongman(this.profileName, this.token, isa.locationId, isa.appId, isa.installedAppId)
				} else {
					throw new Error('Unable to open installer window due to missing location ID or token')
				}
			},
			'Launching app installer window',
		)
	}
}
