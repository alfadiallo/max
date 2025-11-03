/**
 * Sonix API Client
 * 
 * Handles authentication and API calls to Sonix transcription service
 * API Documentation: https://sonix.ai/docs/api
 */

const SONIX_API_BASE = 'https://api.sonix.ai/v1'

export interface SonixMedia {
  id: string
  name: string
  duration: number // seconds
  language: string
  video: boolean
  created_at: number // Unix timestamp
  public_url: string
  custom_data?: Record<string, any>
  status: 'preparing' | 'transcribing' | 'completed' | 'blocked' | 'failed'
}

export interface SonixSegment {
  id: number
  start: number // seconds (decimal)
  end: number   // seconds (decimal)
  text: string
  words?: Array<{
    word: string
    start: number
    end: number
  }>
}

export interface SonixTranscript {
  segments: SonixSegment[]
  full_text?: string
}

export interface SonixAPIResponse<T> {
  data?: T
  error?: {
    code: number
    message: string
  }
}

class SonixClient {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Sonix API key is required')
    }
    this.apiKey = apiKey
  }

  /**
   * List all media files in Sonix account
   */
  async listMediaFiles(options?: {
    page?: number
    status?: 'completed' | 'transcribing' | 'aligning' | 'failed'
    folder_id?: string
    search?: string
  }): Promise<{ media: SonixMedia[]; total_pages?: number; page?: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.folder_id) params.append('folder_id', options.folder_id)
    if (options?.search) params.append('search', options.search)

    const url = `${SONIX_API_BASE}/media${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      let errorMessage = `Sonix API error: ${response.status} ${response.statusText}`
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          errorMessage = error.message || error.error || errorMessage
        } else {
          const text = await response.text()
          if (text) errorMessage = text.substring(0, 200)
        }
      } catch {
        // Ignore parse errors, use default message
      }
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Sonix API returned non-JSON response (${contentType}): ${text.substring(0, 200)}`)
    }

    try {
      return await response.json()
    } catch (parseError: any) {
      throw new Error(`Failed to parse Sonix API response: ${parseError.message}`)
    }
  }

  /**
   * Get transcript JSON for a media file
   */
  async getTranscript(mediaId: string): Promise<SonixTranscript> {
    const url = `${SONIX_API_BASE}/media/${mediaId}/transcript.json`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (response.status === 409) {
      throw new Error('Media file is still being transcribed. Please try again later.')
    }

    if (response.status === 404) {
      throw new Error('Media file not found or transcription not available')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Sonix API error: ${response.status} - ${error.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Get media file details
   */
  async getMedia(mediaId: string): Promise<SonixMedia> {
    const url = `${SONIX_API_BASE}/media/${mediaId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Sonix API error: ${response.status} - ${error.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Submit new media for transcription
   */
  async submitMedia(options: {
    file: File | Buffer
    name?: string
    language?: string
    folder_id?: string
    custom_data?: Record<string, any>
  }): Promise<SonixMedia> {
    const formData = new FormData()
    
    if (options.file instanceof File) {
      formData.append('file', options.file)
    } else {
      // For Buffer, convert to Uint8Array and create a Blob
      const uint8Array = Buffer.isBuffer(options.file) 
        ? new Uint8Array(options.file) 
        : new Uint8Array(options.file)
      const blob = new Blob([uint8Array], { type: 'application/octet-stream' })
      formData.append('file', blob, options.name || 'audio.mp4')
    }

    if (options.name) formData.append('name', options.name)
    if (options.language) formData.append('language', options.language)
    if (options.folder_id) formData.append('folder_id', options.folder_id)
    if (options.custom_data) {
      formData.append('custom_data', JSON.stringify(options.custom_data))
    }

    const url = `${SONIX_API_BASE}/media`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Sonix API error: ${response.status} - ${error.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Check if transcription is completed
   */
  async isTranscriptionComplete(mediaId: string): Promise<boolean> {
    try {
      const media = await this.getMedia(mediaId)
      return media.status === 'completed'
    } catch (error) {
      console.error('Error checking transcription status:', error)
      return false
    }
  }

  /**
   * Poll transcription status until completed
   * Returns media when completed, throws if failed or timeout
   */
  async waitForTranscription(
    mediaId: string,
    options?: {
      maxWaitTime?: number // milliseconds
      pollInterval?: number // milliseconds
    }
  ): Promise<SonixMedia> {
    const maxWaitTime = options?.maxWaitTime || 30 * 60 * 1000 // 30 minutes default
    const pollInterval = options?.pollInterval || 10000 // 10 seconds default
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const media = await this.getMedia(mediaId)

      if (media.status === 'completed') {
        return media
      }

      if (media.status === 'failed' || media.status === 'blocked') {
        throw new Error(`Transcription ${media.status}: ${media.name}`)
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Transcription timeout: ${mediaId} did not complete within ${maxWaitTime}ms`)
  }
}

/**
 * Create a Sonix client instance using API key from environment
 */
export function createSonixClient(): SonixClient {
  const apiKey = process.env.SONIX_API_KEY
  if (!apiKey) {
    throw new Error('SONIX_API_KEY environment variable is not set')
  }
  return new SonixClient(apiKey)
}

/**
 * Create a Sonix client instance with provided API key
 */
export function createSonixClientWithKey(apiKey: string): SonixClient {
  return new SonixClient(apiKey)
}

export default SonixClient
