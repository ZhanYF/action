import * as core from '@actions/core'
import * as fs from 'fs'
import {wait} from './wait'
import {execWithOutput} from './utility'
import * as vm from './vm'

export interface Options {
  memory: string
  uuid: string
  diskImage: fs.PathLike
  resourcesDiskImage: fs.PathLike
  cpuCount: number
  userboot: fs.PathLike
  firmware: fs.PathLike
}

export abstract class Vm extends vm.Vm {
  macAddress!: string

  protected options: Options
  private xhyvePath: fs.PathLike

  constructor(xhyvePath: fs.PathLike, options: Options) {
    super()
    this.xhyvePath = xhyvePath
    this.options = options
  }

  /*override*/ async init(): Promise<void> {
    super.init()
    this.macAddress = await this.getMacAddress()
  }

  protected async /*override*/ getIpAddress(): Promise<string> {
    return getIpAddressFromArp(this.macAddress)
  }

  async getMacAddress(): Promise<string> {
    core.debug('Getting MAC address')
    this.macAddress = (
      await execWithOutput('sudo', this.command.concat('-M'), {silent: true})
    )
      .trim()
      .slice(5)
    core.debug(`Found MAC address: '${this.macAddress}'`)
    return this.macAddress
  }

  /*override*/ get command(): string[] {
    // prettier-ignore
    return [
        this.xhyvePath.toString(),
        '-U', this.options.uuid,
        '-A',
        '-H',
        '-m', this.options.memory,
        '-c', this.options.cpuCount.toString(),
        '-s', '0:0,hostbridge',
        '-s', `2:0,${this.networkDevice}`,
        '-s', `4:0,virtio-blk,${this.options.diskImage}`,
        '-s', `4:1,virtio-blk,${this.options.resourcesDiskImage}`,
        '-s', '31,lpc',
        '-l', 'com1,stdio'
      ]
  }

  protected abstract get networkDevice(): string
}

export function extractIpAddress(
  arpOutput: string,
  macAddress: string
): string | undefined {
  core.debug('Extracing IP address')
  const matchResult = arpOutput
    .split('\n')
    .find(e => e.includes(macAddress))
    ?.match(/\((.+)\)/)

  const ipAddress = matchResult ? matchResult[1] : undefined

  if (ipAddress !== undefined) core.info(`Found IP address: '${ipAddress}'`)

  return ipAddress
}

export class FreeBsd extends Vm {
  get command(): string[] {
    // prettier-ignore
    return super.command.concat(
      '-f', `fbsd,${this.options.userboot},${this.options.diskImage},`
    )
  }

  protected async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -p now')
  }

  protected get networkDevice(): string {
    return 'virtio-net'
  }
}

export class OpenBsd extends Vm {
  get command(): string[] {
    // prettier-ignore
    return super.command.concat(
      '-l', `bootrom,${this.options.firmware}`,
      '-w'
    )
  }

  protected async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }

  protected get networkDevice(): string {
    return 'e1000'
  }
}

async function getIpAddressFromArp(macAddress: string): Promise<string> {
  core.info(`Getting IP address for MAC address: ${macAddress}`)
  for (let i = 0; i < 500; i++) {
    core.info('Waiting for IP to become available...')
    const arpOutput = await execWithOutput('arp', ['-a', '-n'], {silent: true})
    const ipAddress = extractIpAddress(arpOutput, macAddress)

    if (ipAddress !== undefined) return ipAddress

    await wait(1_000)
  }

  throw Error(`Failed to get IP address for MAC address: ${macAddress}`)
}
