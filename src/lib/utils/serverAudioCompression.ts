/**
 * Server-side audio compression using FFmpeg
 * Compresses audio files to Opus/OGG format (default) or MP3/M4A format
 * Opus provides superior quality at lower bitrates and is supported by OpenAI Whisper
 */

import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

// Set FFmpeg path if available
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

interface CompressionOptions {
  targetSizeMB?: number // Target file size in MB
  bitrate?: string // Audio bitrate (e.g., '128k', '96k', '64k')
  format?: 'mp3' | 'm4a' | 'opus' // Output format - Opus recommended for best compression
}

// Note: Compression result is just the buffer, no need for separate interface

/**
 * Compress audio file server-side using FFmpeg
 */
export async function compressAudioServer(
  inputBuffer: Buffer | Uint8Array,
  originalFilename: string,
  options: CompressionOptions = {}
): Promise<Buffer> {
  // Ensure we have a Buffer
  const buffer = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer)
  
  const {
    targetSizeMB = 20, // Default: 20MB (under OpenAI's 25MB limit)
    bitrate,
    format = 'opus' // Default to Opus for best compression (supported by Whisper)
  } = options

  // Create temporary directory for processing
  const tempDir = tmpdir()
  const inputExt = originalFilename.split('.').pop() || 'wav'
  const outputExt = format === 'opus' ? 'ogg' : format === 'mp3' ? 'mp3' : 'm4a'
  
  const inputPath = join(tempDir, `input-${Date.now()}.${inputExt}`)
  const outputPath = join(tempDir, `output-${Date.now()}.${outputExt}`)

  try {
    // Write input buffer to temp file
    await writeFile(inputPath, buffer)
    
    const originalSize = buffer.length
    
    // Calculate bitrate if not provided
    // Opus provides better quality at lower bitrates than MP3
    // Recommended Opus bitrates: 64k (very good quality), 96k (excellent), 128k (transparent)
    let targetBitrate = bitrate || '96k' // Default to 96k for Opus (better than 128k MP3)
    
    if (!bitrate && targetSizeMB) {
      // Estimate required bitrate based on target size
      // For Opus: bitrate (kbps) ≈ (targetSizeMB * 8 * 1024) / duration_seconds
      // Opus is more efficient, so we can use lower bitrates than MP3
      if (originalSize > 50 * 1024 * 1024) { // > 50MB
        targetBitrate = '64k' // Opus at 64k = MP3 at ~96k quality
      } else if (originalSize > 100 * 1024 * 1024) { // > 100MB
        targetBitrate = '48k' // Opus at 48k = MP3 at ~80k quality (still very good for speech)
      } else if (originalSize > 200 * 1024 * 1024) { // > 200MB
        targetBitrate = '32k' // Lower bitrate for very large files (good for speech)
      }
    }

    console.log(`Compressing audio: ${(originalSize / 1024 / 1024).toFixed(2)}MB → target bitrate: ${targetBitrate}, format: ${format}`)

    // Compress audio using FFmpeg
    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .audioBitrate(targetBitrate)
        .audioChannels(2) // Keep stereo
        .audioFrequency(48000) // Opus prefers 48kHz, MP3 uses 44.1kHz
      
      // Set codec and format based on format type
      if (format === 'opus') {
        command = command
          .audioCodec('libopus') // Opus codec
          .toFormat('ogg') // OGG container for Opus
      } else if (format === 'mp3') {
        command = command
          .audioCodec('libmp3lame') // MP3 codec
          .audioFrequency(44100) // MP3 standard sample rate
          .toFormat('mp3')
      } else {
        command = command
          .audioCodec('aac') // AAC codec
          .toFormat('m4a')
      }
      
      command
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine)
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log('Compression progress:', progress.percent.toFixed(1) + '%')
          }
        })
        .on('end', () => {
          console.log('Compression completed')
          resolve()
        })
        .on('error', (err: Error) => {
          console.error('FFmpeg error:', err)
          reject(err)
        })
      
      command.save(outputPath)
    })

    // Read compressed file
    const { readFile } = await import('fs/promises')
    const compressedBuffer = await readFile(outputPath)
    
    const compressedSize = compressedBuffer.length
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1)

    console.log(
      `Compression complete: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ` +
      `${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`
    )

    // Clean up temp files
    try {
      await unlink(inputPath)
      await unlink(outputPath)
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError)
    }

    // If still too large, try lower bitrate
    const OPENAI_MAX_SIZE = 25 * 1024 * 1024 // 25MB
    if (compressedSize > OPENAI_MAX_SIZE) {
      console.warn(`Compressed file still too large (${(compressedSize / 1024 / 1024).toFixed(2)}MB), trying lower bitrate...`)
      
      // Try with even lower bitrate (32k minimum for Opus, still good quality for speech)
      if (format === 'opus') {
        // Progressive bitrate reduction for Opus
        if (targetBitrate === '96k') {
          return compressAudioServer(buffer, originalFilename, {
            ...options,
            bitrate: '64k'
          })
        } else if (targetBitrate === '64k') {
          return compressAudioServer(buffer, originalFilename, {
            ...options,
            bitrate: '48k'
          })
        } else if (targetBitrate === '48k') {
          return compressAudioServer(buffer, originalFilename, {
            ...options,
            bitrate: '32k'
          })
        }
        // Already at minimum (32k) - file is too long for compression to help
      } else if (format === 'mp3' && targetBitrate !== '64k') {
        // For MP3, minimum is 64k
        return compressAudioServer(buffer, originalFilename, {
          ...options,
          bitrate: '64k'
        })
      }
    }

    return compressedBuffer

  } catch (error: any) {
    // Clean up temp files on error
    try {
      await unlink(inputPath).catch(() => {})
      await unlink(outputPath).catch(() => {})
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    console.error('Audio compression error:', error)
    throw new Error(`Failed to compress audio: ${error.message}`)
  }
}

/**
 * Check if file needs compression
 */
export function needsCompression(fileSizeBytes: number, maxSizeMB: number = 25): boolean {
  return fileSizeBytes > maxSizeMB * 1024 * 1024
}

