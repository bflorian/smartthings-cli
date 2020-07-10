import path from 'path'
import proc from 'child_process'


let child

export function openStrongman(profile: string, locationId: string, appId: string, installedAppId: string): void {
	const platform = process.platform
	let program = ''
	let args: string[] = []
	if (platform === 'darwin') {
		program = 'open'
		args = [applicationPath('SmartAppInstaller.app'), '--args', '.', profile, locationId, appId, installedAppId]
	} else if (platform === 'win32') {
		program = 'start'
		args = [applicationPath('SmartAppInstaller.exe'), profile, locationId, appId, installedAppId]
	} else {
		program = 'open'
		args = [applicationPath('SmartAppInstaller'), '--args', '.', profile, locationId, appId, installedAppId]
	}
	// eslint-disable-next-line no-console
	console.log(`${program} ${args.join(' ')}`)
	child = proc.execFile(program, args)
	child.on('close', function (code: number) {
		// eslint-disable-next-line no-process-exit
		process.exit(code)
	})
}

export function openStrongmanAppView(profile: string, appId: string): void {
	openStrongman(profile, '', appId, '')
}

export function openStrongmanLocationView(profile: string, locationId: string): void {
	openStrongman(profile, locationId, '', '	')
}

function applicationPath(executable: string): string {
	return process.env.SMARTTHINGS_SMARTAPP_INSTALLER ||
		path.join(path.dirname(process.execPath), executable)
}
