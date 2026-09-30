import { devLoginAllowed } from '../utils/dev-login'
export default defineEventHandler(event => ({enabled:devLoginAllowed(event)}))
