import path from 'path'
import fs from 'fs'
// @ts-ignore
import openLocal from './open'
import open from 'open'


export function openStrongman(profile: string, token: string, locationId: string, appId: string, installedAppId: string): void {
	const platform = process.platform
	if (platform === 'darwin') {
		openLocal(applicationPath('SmartAppInstaller.app'), {args: ['.', profile, token, locationId, appId, installedAppId]})
	} else if (platform === 'win32') {
		openLocal(applicationPath('SmartAppInstaller.exe'), {args: ['.', profile, token, locationId, appId, installedAppId]})
		//open(applicationPath('SmartAppInstaller.exe'), {app: [applicationPath('SmartAppInstaller.exe'), profile, token, locationId, appId, installedAppId]})
	} else {
		openLocal(applicationPath('SmartAppInstaller'), {args: ['.', profile, token, locationId, appId, installedAppId]})
	}
}

export function openStrongmanAppView(profile: string, token: string, appId: string): void {
	openStrongman(profile, token, '', appId, '')
}

export function openStrongmanLocationView(profile: string, token: string, locationId: string): void {
	openStrongman(profile, token, locationId, '', '	')
}

function applicationPath(executable: string): string {
	const result = process.env.SMARTTHINGS_SMARTAPP_INSTALLER ||
		path.join(path.dirname(process.execPath), 'SmartAppInstaller', executable)

	if (!fs.existsSync(result)) {
		if (process.env.SMARTTHINGS_SMARTAPP_INSTALLER) {
			throw new Error(`$SMARTTHINGS_SMARTAPP_INSTALLER set but installer not found at "${result}". Set the SMARTTHINGS_SMARTAPP_INSTALLER environment variable to the path of the installer.`)
		} else {
			throw new Error(`Installer not found. Copy the installer to the same directory as the CLI executable (${path.dirname(process.execPath)})`)
		}
	}
	return result
}
