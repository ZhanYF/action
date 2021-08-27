import * as fs from 'fs'
import * as vm from './vm'

export abstract class Vm extends vm.Vm {
  private qemuPath: fs.PathLike
  protected configuration: Configuration

  constructor(qemuPath: fs.PathLike, configuration: Configuration) {
    super()
    this.qemuPath = qemuPath
    this.configuration = configuration
  }

  protected async /*override*/ getIpAddress(): Promise<string> {
    return "10.0.2.15"
  }

  /*override*/ get command(): string[] {
    // prettier-ignore
    return [
      this.qemuPath.toString(),
      '-machine', `type=${this.configuration.machineType},accel=${this.configuration.accelerator}`,
      '-cpu', this.configuration.cpu,
      '-smp', `-cpus=${this.configuration.cpuCount},sockets=${this.configuration.cpuCount}`,
      '-m', this.configuration.memory,
      
      '-device', 'virtio-scsi-pci',
      '-device', 'scsi-hd,drive=drive0,bootindex=0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=writeback,discard=ignore,format=qcow2`,

      '-device', 'virtio-net,netdev=user.0',
      '-netdev', `user,id=user.0,hostfwd=tcp::${this.configuration.sssHostPort}-:22`,

      '-display', 'none',
      '-monitor', 'none',
      
      '-boot', 'strict=off'
    ]
  }
}

export class NetBsd extends Vm {
  constructor(qemuPath: fs.PathLike, configuration: Configuration) {
    super(qemuPath, configuration)
  }

  protected async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }
}

export enum Accelerator {
  hvf,
  tcg
}

export interface Configuration {
  cpu: string
  memory: string
  diskImage: fs.PathLike
  cpuCount: number
  sssHostPort: number
  accelerator: Accelerator,
  machineType: string
}