/**
 * Preconfigured setup targets are static, source-defined lists — not
 * authorable in the UI. Each currently carries the single option that exists.
 */
export interface SetupPreconfig {
  id: string
  label: string
  environments: readonly {
    id: string
    label: string
    accounts: readonly { id: string; label: string }[]
  }[]
}

export const setupPreconfigs: readonly SetupPreconfig[] = [
  {
    id: 'crms',
    label: 'CRMS',
    environments: [
      {
        id: 'std',
        label: 'std',
        accounts: [{ id: 'admin', label: 'admin' }]
      }
    ]
  }
]
