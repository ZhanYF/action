export enum Kind {
  arm64,
  x86_64
}

export class Architecture {
  public readonly kind: Kind

  constructor(kind: Kind) {
    this.kind = kind
  }

  toString(): string {
    for (const [key, value] of fromString) {
      if (value === this.kind) return key
    }

    throw Error(
      `Unreachable: missing Architecture.${this.kind} in 'fromString'`
    )
  }
}

export const fromString: ReadonlyMap<string, Kind> = (() => {
  const map = new Map<string, Kind>()
  map.set('arm64', Kind.arm64)
  map.set('x86-64', Kind.x86_64)
  return map
})()

export function toKind(value: string): Kind | undefined {
  return fromString.get(value.toLowerCase())
}
