import { describe, expect, it, vi } from 'vitest'
import type { ArtifactExport } from '../export/exportTypes'
import { createArtifactFilename } from '../export/renderReceiptExport'
import {
  copyArtifactText,
  saveArtifact,
  shareArtifact,
  type ArtifactPlatform,
} from './artifactActions'

function artifact(): ArtifactExport {
  return {
    file: new File(['receipt'], 'receipt.png', { type: 'image/png' }),
    filename: 'receipt.png',
    mimeType: 'image/png',
    width: 1080,
    height: 1350,
    shareText: 'Today cost me $38.72.',
    format: 'share',
  }
}

describe('artifact actions', () => {
  it('creates deterministic local-date filenames', () => {
    const date = new Date(2026, 6, 13, 12)
    expect(createArtifactFilename('full', date)).toBe('bad-day-receipt-2026-07-13.png')
    expect(createArtifactFilename('share', date)).toBe('bad-day-receipt-share-2026-07-13.png')
    expect(createArtifactFilename('story', date)).toBe('bad-day-receipt-story-2026-07-13.png')
  })

  it('prefers native file sharing when supported', async () => {
    const share = vi.fn(async () => undefined)
    const platform: ArtifactPlatform = {
      share,
      canShareFiles: () => true,
      download: vi.fn(),
    }
    expect(await shareArtifact(artifact(), platform)).toEqual({ status: 'shared' })
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: expect.any(Array) }))
  })

  it('falls back to download when native sharing is unavailable', async () => {
    const download = vi.fn()
    const platform: ArtifactPlatform = { download }
    expect(await shareArtifact(artifact(), platform)).toEqual({ status: 'saved' })
    expect(download).toHaveBeenCalledOnce()
  })

  it('treats native share cancellation as neutral', async () => {
    const platform: ArtifactPlatform = {
      share: async () => { throw new DOMException('Canceled', 'AbortError') },
      canShareFiles: () => true,
      download: vi.fn(),
    }
    expect(await shareArtifact(artifact(), platform)).toEqual({ status: 'canceled' })
  })

  it('reports save and copy results without exposing content', async () => {
    const platform: ArtifactPlatform = {
      download: vi.fn(),
      writeClipboard: vi.fn(async () => undefined),
    }
    expect(saveArtifact(artifact(), platform)).toEqual({ status: 'saved' })
    expect(await copyArtifactText('private receipt', platform)).toEqual({ status: 'copied' })
  })
})
