const origin=(process.env.APP_ORIGIN||'').replace(/\/$/,'')
if(!origin.startsWith('https://'))throw new Error('APP_ORIGIN must be an HTTPS origin')

async function json(path){
 const response=await fetch(origin+path,{redirect:'manual'})
 if(!response.ok)throw new Error(`${path} returned ${response.status}`)
 return response.json()
}

const home=await fetch(origin+'/',{redirect:'manual'})
if(!home.ok)throw new Error(`/ returned ${home.status}`)
const session=await json('/api/auth/get-session')
if(session!==null)throw new Error('Signed-out session probe returned a session')
const config=await json('/api/auth-config')
if(typeof config.emailVerification!=='boolean'||typeof config.turnstileSiteKey!=='string')throw new Error('Auth configuration probe returned an unexpected shape')
console.log(JSON.stringify({home:home.status,session:'signed-out',emailVerification:config.emailVerification,turnstile:Boolean(config.turnstileSiteKey)}))
