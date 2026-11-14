import type { H3Event } from 'h3'

export async function verifyTurnstile(event: H3Event, env: Env, token: unknown) {
 const hostnames=(env.TURNSTILE_HOSTNAMES||'').split(',').map(value=>value.trim()).filter(Boolean)
 if(!env.TURNSTILE_SECRET||!env.TURNSTILE_SITE_KEY||!hostnames.length) return
 const body=new URLSearchParams({secret:env.TURNSTILE_SECRET,response:typeof token==='string'?token:''})
 const ip=getRequestHeader(event,'cf-connecting-ip');if(ip)body.set('remoteip',ip)
 const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body}).then(r=>r.json() as Promise<{success:boolean;action?:string;hostname?:string}>).catch(()=>null)
 if(!result?.success||result.action!=='newsletter'||!hostnames.includes(result.hostname||'')) throw createError({statusCode:400,statusMessage:'Security check failed. Try again.'})
}

export function newToken() {
 return [...crypto.getRandomValues(new Uint8Array(24))].map(b=>b.toString(16).padStart(2,'0')).join('')
}
