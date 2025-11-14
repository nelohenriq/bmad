import '@testing-library/jest-dom'

// Mock Next.js Request and Response
global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || ''
    this.headers = new Headers(options.headers)
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }
}

global.Headers = class Headers {
  constructor(init = {}) {
    this._headers = new Map(Object.entries(init))
  }

  get(name) {
    return this._headers.get(name.toLowerCase()) || null
  }

  set(name, value) {
    this._headers.set(name.toLowerCase(), value)
  }

  has(name) {
    return this._headers.has(name.toLowerCase())
  }
}

// Mock NextRequest
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Headers(options.headers)
      this.body = options.body
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }
  },
  NextResponse: {
    json: (data, options = {}) => ({
      status: options.status || 200,
      json: async () => data,
    }),
  },
}))
