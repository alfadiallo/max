/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  // Configure API route timeouts for transcription (requires Vercel Pro)
  // Note: Free tier has 10s limit, Pro has 60s, Enterprise can be up to 300s
}

module.exports = nextConfig

