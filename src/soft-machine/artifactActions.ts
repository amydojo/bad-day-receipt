import type { ArtifactActionResult, ArtifactExport } from '../export/exportTypes'

export interface ArtifactPlatform {
  share?: (data: ShareData) => Promise<void>
  canShareFiles?: (files: File[]) => boolean
  writeClipboard?: (text: string) => Promise<void>
  download: (artifact: ArtifactExport) => void
}

export function createBrowserArtifactPlatform(): ArtifactPlatform {
  return {
    share: typeof navigator !== 'undefined' && navigator.share
      ? (data) => navigator.share(data)
      : undefined,
    canShareFiles: typeof navigator !== 'undefined' && navigator.canShare
      ? (files) => navigator.canShare({ files })
      : undefined,
    writeClipboard: typeof navigator !== 'undefined' && navigator.clipboard
      ? (text) => navigator.clipboard.writeText(text)
      : undefined,
    download: (artifact) => {
      const url = URL.createObjectURL(artifact.file)
      const anchor = document.createElement('a')
      anchor.download = artifact.filename
      anchor.href = url
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    },
  }
}

export async function shareArtifact(
  artifact: ArtifactExport,
  platform: ArtifactPlatform,
): Promise<ArtifactActionResult> {
  try {
    if (platform.share && platform.canShareFiles?.([artifact.file])) {
      await platform.share({
        title: 'Bad Day Receipt',
        text: artifact.shareText,
        files: [artifact.file],
      })
      return { status: 'shared' }
    }

    if (platform.share) {
      await platform.share({
        title: 'Bad Day Receipt',
        text: artifact.shareText,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      })
      return { status: 'shared' }
    }

    platform.download(artifact)
    return { status: 'saved' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'canceled' }
    }
    return { status: 'failed', code: 'SHARE_FAILED' }
  }
}

export function saveArtifact(
  artifact: ArtifactExport,
  platform: ArtifactPlatform,
): ArtifactActionResult {
  try {
    platform.download(artifact)
    return { status: 'saved' }
  } catch {
    return { status: 'failed', code: 'EXPORT_FAILED' }
  }
}

export async function copyArtifactText(
  text: string,
  platform: ArtifactPlatform,
): Promise<ArtifactActionResult> {
  try {
    if (!platform.writeClipboard) return { status: 'failed', code: 'COPY_FAILED' }
    await platform.writeClipboard(text)
    return { status: 'copied' }
  } catch {
    return { status: 'failed', code: 'COPY_FAILED' }
  }
}
