import { authFor } from '../../utils/auth'
export default defineEventHandler(event => authFor(event).handler(toWebRequest(event)))
