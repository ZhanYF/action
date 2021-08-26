import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {spawn, ChildProcess} from 'child_process'
import {wait} from './wait'
import {ExecuteOptions} from './utility'

export abstract class Vm {
  ipAddress!: string

  private static readonly user = 'runner'
  protected vmProcess!: ChildProcess

  async init(): Promise<void> {
    core.info('Initializing VM')
  }

  async run(): Promise<void> {
    core.info('Booting VM')
    this.vmProcess = spawn('sudo', this.command, {detached: true})
    this.ipAddress = await this.getIpAddress()
  }

  async wait(timeout: number): Promise<void> {
    for (let index = 0; index < timeout; index++) {
      core.info('Waiting for VM to be ready...')

      const result = await this.execute('true', {
        /*log: false,
          silent: true,*/
        ignoreReturnCode: true
      })

      if (result === 0) {
        core.info('VM is ready')
        return
      }
      await wait(1000)
    }

    throw Error(
      `Waiting for VM to become ready timed out after ${timeout} seconds`
    )
  }

  async stop(): Promise<void> {
    core.info('Shuting down VM')
    await this.shutdown()
  }

  async terminate(): Promise<number> {
    core.info('Terminating VM')
    return await exec.exec(
      'sudo',
      ['kill', '-s', 'TERM', this.vmProcess.pid.toString()],
      {ignoreReturnCode: true}
    )
  }

  protected async shutdown(): Promise<void> {
    throw Error('Not implemented')
  }

  async execute(
    command: string,
    options: ExecuteOptions = {}
  ): Promise<number> {
    const defaultOptions = {log: true}
    options = {...defaultOptions, ...options}
    if (options.log) core.info(`Executing command inside VM: ${command}`)
    const buffer = Buffer.from(command)

    return await exec.exec('ssh', ['-t', `${Vm.user}@${this.ipAddress}`], {
      input: buffer,
      silent: options.silent,
      ignoreReturnCode: options.ignoreReturnCode
    })
  }

  async execute2(args: string[], intput: Buffer): Promise<number> {
    return await exec.exec(
      'ssh',
      ['-t', `${Vm.user}@${this.ipAddress}`].concat(args),
      {input: intput}
    )
  }

  protected async getIpAddress(): Promise<string> {
    throw Error('Not implemented')
  }

  protected abstract get command(): string[]
}
