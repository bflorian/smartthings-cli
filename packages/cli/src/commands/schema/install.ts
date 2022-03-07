import open from 'open'

import { APICommand, selectFromList } from '@smartthings/cli-lib'


export default class SchemaInstallCommand extends APICommand {
	static description = 'Install a schema C2C connector'

	static flags = APICommand.flags

	static args = [
		{
			name: 'id',
			description: 'schema app id',
		},
		{
			name: 'locationId',
			description: 'the location id',
		},
	]

	primaryKeyName = 'endpointAppId'
	sortKeyName = 'appName'
	nestedPrimaryKeyName = 'locationId'
	listTableFieldDefinitions = ['appName', 'endpointAppId', 'hostingType']

	async run(): Promise<void> {
		const { args, argv, flags } = await this.parse(SchemaInstallCommand)
		await super.setup(args, argv, flags)

		const config = {
			primaryKeyName: 'endpointAppId',
			sortKeyName: 'appName',
		}

		const id = await selectFromList(this, config, args.id,
			async () => await this.client.schema.list(),
			'Select a schema app to install.')

		const locationConfig = {
			primaryKeyName: 'locationId',
			sortKeyName: 'name',
		}

		const locationId = await selectFromList(this, locationConfig, args.locationId,
			async () => await this.client.locations.list(),
			'Select a location for the install.')

		this.log(`Getting page for app "${id}"`)
		const page = await this.client.schema.getPage(id, locationId)
		this.log(JSON.stringify(page))
		if ('oAuthLink' in page) {
			if (page.oAuthLink) {
				await open(page.oAuthLink)
				this.log('Opening installation page in browser')
			} else {
				throw new Error('oAuthLink not found')
			}
		} else {
			throw new Error('Schema connector is already installed in this location')
		}
	}
}
