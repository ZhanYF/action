import * as fs from 'fs'
import * as vm from './vm'

export abstract class Vm extends vm.Vm {
  private qemuPath: fs.PathLike

  constructor(qemuPath: fs.PathLike) {
    super()
    this.qemuPath = qemuPath
  }

  protected async /*override*/ getIpAddress(): Promise<string> {
    return "10.0.2.15"
  }

  /*override*/ get command(): string[] {
    // prettier-ignore
    return [
      this.qemuPath.toString(),
    ]
  }
}

export class NetBsd extends Vm {
  get command(): string[] {
    // prettier-ignore
    return super.command.concat(
      ""
    )
  }

  protected async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }
}