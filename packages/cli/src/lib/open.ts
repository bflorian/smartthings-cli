import {promisify} from 'util'
import path from 'path'
import childProcess from 'child_process'
import {ChildProcess} from 'child_process'
import fs from 'fs'
import url from 'url'
// @ts-ignore
import isWsl from 'is-wsl'
import isDocker from 'is-docker'


const pAccess = promisify(fs.access)
const pExecFile = promisify(childProcess.execFile)

// Path to included `xdg-open`.
const localXdgOpenPath = path.join(__dirname, 'xdg-open')

// Convert a path from WSL format to Windows format:
// `/mnt/c/Program Files/Example/MyApp.exe` → `C:\Program Files\Example\MyApp.exe`
const wslToWindowsPath = async (path: string): Promise<string> => {
	const {stdout} = await pExecFile('wslpath', ['-w', path])
	return stdout.trim()
}


export interface Options {
	wait?: boolean
	args?: string[]
	background?: boolean
	url?: boolean
}

export interface ChildProcessOptions {
	windowsVerbatimArguments?: boolean
	stdio?: string
	detached?: boolean
}

export default async function open(target: string, options: Options): Promise<ChildProcess>  {

	options = {
		wait: false,
		background: false,
		url: false,
		...options,
	}

	let command
	const appArguments = options.args || []
	const cliArguments = []
	const childProcessOptions: ChildProcessOptions = {}

	// Encodes the target as if it were an URL. Especially useful to get
	// double-quotes through the “double-quotes on Windows caveat”, but it
	// can be used on any platform.
	if (options.url) {
		target = new url.URL(target).href

		if (isWsl) {
			target = target.replace(/&/g, '^&')
		}
	}

	if (process.platform === 'darwin') {
		command = 'open'

		if (options.wait) {
			cliArguments.push('--wait-apps')
		}

		if (options.background) {
			cliArguments.push('--background')
		}
	} else if (process.platform === 'win32' || (isWsl && !isDocker())) {
		command = 'cmd' + (isWsl ? '.exe' : '')
		cliArguments.push('/s', '/c', 'start', '""', '/b')

		if (!isWsl) {
			// Always quoting target allows for URLs/paths to have spaces and unmarked characters, as `cmd.exe` will
			// interpret them as plain text to be forwarded as one unique argument. Enabling `windowsVerbatimArguments`
			// disables Node.js's default quotes and escapes handling (https://git.io/fjdem).
			// References:
			// - Issues #17, #44, #55, #77, #101, #115
			// - Pull requests: #74, #98
			//
			// As a result, all double-quotes are stripped from the `target` and do not get to your desired destination.
			target = `"${target}"`
			childProcessOptions.windowsVerbatimArguments = true
		}

		if (options.wait) {
			cliArguments.push('/wait')
		}

		if (appArguments.length > 0) {
			cliArguments.push(...appArguments)
		}
	} else {
		// When bundled by Webpack, there's no actual package file path and no local `xdg-open`.
		const isBundled = !__dirname || __dirname === '/'

		// Check if local `xdg-open` exists and is executable.
		let exeLocalXdgOpen = false
		try {
			await pAccess(localXdgOpenPath, fs.constants.X_OK)
			exeLocalXdgOpen = true
			// eslint-disable-next-line no-empty
		} catch (_) {}

		// @ts-ignore
		const useSystemXdgOpen = process.versions.electron ||
			process.platform === 'android' || isBundled || !exeLocalXdgOpen
		command = useSystemXdgOpen ? 'xdg-open' : localXdgOpenPath

		if (appArguments.length > 0) {
			cliArguments.push(...appArguments)
		}

		if (!options.wait) {
			// `xdg-open` will block the process unless stdio is ignored
			// and it's detached from the parent even if it's unref'd.
			childProcessOptions.stdio = 'ignore'
			childProcessOptions.detached = true
		}
	}

	cliArguments.push(target)

	if (process.platform === 'darwin' && appArguments.length > 0) {
		cliArguments.push('--args', ...appArguments)
	}

	// @ts-ignore
	const subprocess = childProcess.spawn(command, cliArguments, childProcessOptions)

	if (options.wait) {
		return new Promise((resolve, reject) => {
			// @ts-ignore
			subprocess.once('error', reject)

			// @ts-ignore
			subprocess.once('close', exitCode => {
				if (exitCode > 0) {
					reject(new Error(`Exited with code ${exitCode}`))
					return
				}

				resolve(subprocess)
			})
		})
	}

	// @ts-ignore
	subprocess.unref()

	return subprocess
}
