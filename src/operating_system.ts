import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as xhyve from './xhyve_vm'
import * as qemu from './qemu_vm'

export enum Kind {
  freeBsd,
  netBsd,
  openBsd
}

const stringToKind: ReadonlyMap<string, Kind> = (() => {
  const map = new Map<string, Kind>()
  map.set('freebsd', Kind.freeBsd)
  map.set('netbsd', Kind.netBsd)
  map.set('openbsd', Kind.openBsd)
  return map
})()

export function toKind(value: string): Kind | undefined {
  return stringToKind.get(value.toLowerCase())
}

export abstract class OperatingSystem {
  protected readonly architecture: architecture.Architecture
  protected readonly xhyveResourceUrl =
    'https://github.com/cross-platform-actions/resources/releases/download/v0.0.1/resources.tar'

  private readonly baseUrl = 'https://github.com/cross-platform-actions'
  private readonly releaseVersion = 'v0.0.1'
  private readonly name: string
  private readonly version: string

  constructor(
    name: string,
    architecture: architecture.Architecture,
    version: string
  ) {
    this.name = name
    this.version = version
    this.architecture = architecture
  }

  static create(
    kind: Kind,
    architectureKind: architecture.Kind,
    version: string
  ): OperatingSystem {
    let architecture = new architecture.Architecture(architectureKind)

    switch (kind) {
      case Kind.freeBsd:
        return new FreeBsd(architecture, version)
      case Kind.netBsd:
        return new NetBsd(architecture, version)
      case Kind.openBsd:
        return new OpenBsd(architecture, version)
    }
  }

  abstract get resourceUrl(): string

  get virtualMachineImageUrl(): string {
    return [
      this.baseUrl,
      `${this.name}-builder`,
      'releases',
      'download',
      this.releaseVersion,
      this.imageName
    ].join('/')
  }

  abstract createVirtualMachine(
    xhyvePath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm

  async prepareDisk(
    /* eslint-disable @typescript-eslint/no-unused-vars */
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
    /* eslint-enable */
  ): Promise<void> {
    throw Error('Not implemented')
  }

  private get imageName(): string {
    const encodedVersion = encodeURIComponent(this.version)
    const archString = this.architecture.toString()
    return `${this.name}-${encodedVersion}-${archString}.qcow2`
  }
}

class FreeBsd extends OperatingSystem {
  constructor(architecture: architecture.Architecture, version: string) {
    super('freebsd', architecture, version)
  }

  get resourceUrl(): string {
    return this.xhyveResourceUrl
  }

  async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  createVirtualMachine(
    hypervisorPath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm {
    core.debug('Creating FreeBSD VM')
    return new xhyve.FreeBsd(hypervisorPath, options)
  }
}

class NetBsd extends OperatingSystem {
  constructor(architecture: architecture.Architecture, version: string) {
    super('netbsd', architecture, version)
  }

  get resourceUrl(): string {
    throw Error('Not implemented')
  }

  async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  createVirtualMachine(
    hypervisorPath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm {
    core.debug('Creating NetBSD VM')
    throw Error('Not implemented')
    // return new qemu.NetBsd(hypervisorPath, options)
  }
}

class OpenBsd extends OperatingSystem {
  constructor(architecture: architecture.Architecture, version: string) {
    super('openbsd', architecture, version)
  }

  get resourceUrl(): string {
    return this.xhyveResourceUrl
  }

  async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  createVirtualMachine(
    hypervisorPath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm {
    core.debug('Creating OpenBSD VM')
    return new xhyve.OpenBsd(hypervisorPath, options)
  }
}

async function convertToRawDisk(
  diskImage: fs.PathLike,
  targetDiskName: fs.PathLike,
  resourcesDirectory: fs.PathLike
): Promise<void> {
  core.debug('Converting qcow2 image to raw')
  const resDir = resourcesDirectory.toString()
  await exec.exec(path.join(resDir, 'qemu-img'), [
    'convert',
    '-f',
    'qcow2',
    '-O',
    'raw',
    diskImage.toString(),
    path.join(resDir, targetDiskName.toString())
  ])
}
