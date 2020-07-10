import { InstalledApp, Status} from '@smartthings/core-sdk'
import { ListingOutputAPICommand} from '@smartthings/cli-lib'
import { openStrongman } from '../../lib/strongman'


export default class InstalledAppInstallCommand extends ListingOutputAPICommand<Status, InstalledApp> {
	static description = 'display app installer window'

	static flags = ListingOutputAPICommand.flags

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
				if (isa.locationId && this.profileName) {
					openStrongman(this.profileName, isa.locationId, isa.appId, isa.installedAppId)
					return {status: 'Launching installer window'}
				}
				return {status: 'Unable to open installer window due to missing location ID or profile'}
			},
		)
	}
}
