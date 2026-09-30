const origin=(process.env.APP_ORIGIN||'').replace(/\/$/,'')
if(!origin.startsWith('https://'))throw new Error('APP_ORIGIN must be an HTTPS origin')

async function json(path,{attempts=1}={}){
 let lastStatus=0
 for(let attempt=1;attempt<=attempts;attempt++){
  const response=await fetch(origin+path,{redirect:'manual',headers:{'cache-control':'no-cache'}})
  lastStatus=response.status
  if(response.ok)return response.json()
  if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,2_000))
 }
 throw new Error(`${path} returned ${lastStatus}`)
}

const home=await fetch(origin+'/',{redirect:'manual'})
if(!home.ok)throw new Error(`/ returned ${home.status}`)
const session=await json('/api/auth/get-session')
if(session!==null)throw new Error('Signed-out session probe returned a session')
// A new Worker version can take a few seconds to reach every edge after deploy.
const config=await json('/api/auth-config',{attempts:15})
if(typeof config.emailVerification!=='boolean'||typeof config.turnstileSiteKey!=='string')throw new Error('Auth configuration probe returned an unexpected shape')
console.log(JSON.stringify({home:home.status,session:'signed-out',emailVerification:config.emailVerification,turnstile:Boolean(config.turnstileSiteKey)}))
