import { env } from '../config/env'
import { createApiClient } from './client'

export { ApiError } from './client'
export const api = createApiClient(env.apiBaseUrl)
