type TransactionalMessage = {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendTransactionalEmail(env: Env, message: TransactionalMessage) {
  if (!env.EMAIL || !env.EMAIL_FROM) throw new Error('Email Sending is not configured')
  await env.EMAIL.send({ from: { email: env.EMAIL_FROM, name: 'Sabipedia' }, ...message })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]!)
}

const serif="Georgia,'Iowan Old Style','Times New Roman',serif"
const p=(html: string)=>`<p style="margin:0 0 16px;font:16px/1.6 ${serif};color:#1a1a1a">${html}</p>`
const muted=(html: string)=>`<p style="margin:0 0 12px;font:14px/1.6 ${serif};color:#626262">${html}</p>`

// One look for every Sabipedia email: table layout and inline styles, because mail clients drop most CSS.
function emailLayout(input: { preheader: string; heading: string; body: string; button?: { label: string; url: string }; after?: string; footer?: string }) {
  const button=input.button?`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:8px;background:#27357E"><a href="${input.button.url}" style="display:inline-block;padding:14px 24px;font:600 16px/1 ${serif};color:#ffffff;text-decoration:none;border-radius:8px">${input.button.label}</a></td></tr></table>${muted(`Button not working? Paste this link into your browser:<br><a href="${input.button.url}" style="color:#27357E;word-break:break-all">${input.button.url}</a>`)}`:''
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${input.heading}</title></head>
<body style="margin:0;padding:0;background:#f4f4f1">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${input.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f1"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 8px 20px"><a href="https://sabipedia.com"><img src="https://sabipedia.com/brand/whn-lockup-1200.png" width="148" alt="Sabipedia" style="display:block;width:148px;height:auto;border:0"></a></td></tr>
<tr><td style="padding:40px 40px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
<h1 style="margin:0 0 20px;font:600 26px/1.25 ${serif};color:#000000">${input.heading}</h1>
${input.body}${button}${input.after||''}
</td></tr>
<tr><td style="padding:20px 8px 0;font:13px/1.6 ${serif};color:#626262">Sabipedia · Practical knowledge for life in Nigeria, checked by Nigerians.${input.footer?`<br>${input.footer}`:''}</td></tr>
</table></td></tr></table></body></html>`
}

export function passwordResetEmail(name: string, url: string) {
  const safeName=escapeHtml(name || 'there'),safeUrl=escapeHtml(url)
  return {
    subject: 'Reset your Sabipedia password',
    text: `Hello ${name || 'there'},\n\nUse this link to choose a new Sabipedia password:\n${url}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
    html: emailLayout({preheader:'Choose a new password. The link expires in one hour.',heading:'Reset your password',body:p(`Hello ${safeName}, use the button below to choose a new Sabipedia password.`),button:{label:'Reset my password',url:safeUrl},after:muted('This link expires in one hour. If you did not ask for it, you can ignore this email.')}),
  }
}

export function verificationEmail(name: string, url: string) {
  const safeName=escapeHtml(name || 'there'),safeUrl=escapeHtml(url)
  return {
    subject: 'Verify your Sabipedia email',
    text: `Hello ${name || 'there'},\n\nVerify your email to finish creating your Sabipedia account:\n${url}\n\nThis link expires in one hour. If you did not create this account, you can ignore this email.`,
    html: emailLayout({preheader:'One click to finish creating your account.',heading:'Verify your email',body:p(`Hello ${safeName}, verify your email to finish creating your Sabipedia account.`),button:{label:'Verify my email',url:safeUrl},after:muted('This link expires in one hour. If you did not create this account, you can ignore this email.')}),
  }
}

export function reviewDecisionEmail(input: { name: string; title: string; published: boolean; note: string; url: string; kind?: string }) {
  const outcome=input.published?'has been published':'needs changes before it can be published'
  const subjectTitle=input.title.replace(/[\r\n]+/g,' ').trim()
  const safeName=escapeHtml(input.name || 'there'),safeTitle=escapeHtml(input.title),safeUrl=escapeHtml(input.url)
  const note=input.note.trim()
  const noteText=note?`\n\nEditor’s note:\n${note}`:''
  const noteHtml=note?`<div style="margin:0 0 24px;padding:16px 20px;background:#f4f4f1;border-radius:8px"><p style="margin:0 0 6px;font:600 14px/1.4 ${serif};color:#626262">Editor’s note</p><p style="margin:0;font:16px/1.6 ${serif};color:#1a1a1a">${escapeHtml(note).replace(/\n/g,'<br>')}</p></div>`:''
  return {
    subject: input.published?`Published: ${subjectTitle}`:`Changes requested: ${subjectTitle}`,
    text: `Hello ${input.name || 'there'},\n\nYour ${input.kind || 'guide'} “${input.title}” ${outcome}.${noteText}\n\nSee your submissions: ${input.url}`,
    html: emailLayout({preheader:`Your ${input.kind || 'guide'} ${outcome}.`,heading:input.published?'Published':'Changes requested',body:p(`Hello ${safeName}, your ${escapeHtml(input.kind || 'guide')} <strong>“${safeTitle}”</strong> ${outcome}.`)+noteHtml,button:{label:'See my submissions',url:safeUrl}}),
  }
}

export function newsletterConfirmEmail(confirmUrl: string, unsubscribeUrl: string) {
  const safeConfirm=escapeHtml(confirmUrl),safeUnsubscribe=escapeHtml(unsubscribeUrl)
  return {
    subject: 'Confirm your Sabipedia subscription',
    text: `Confirm your subscription to get an occasional email when something new goes up on Sabipedia:\n${confirmUrl}\n\nIf you did not ask for this, ignore this email and you will not hear from us.\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: emailLayout({preheader:'One click and you’re on the list.',heading:'Confirm your subscription',body:p('You asked to get an occasional email when something new goes up on Sabipedia.'),button:{label:'Confirm my subscription',url:safeConfirm},after:muted('If you did not ask for this, ignore this email and you will not hear from us.'),footer:`<a href="${safeUnsubscribe}" style="color:#626262">Unsubscribe</a>`}),
  }
}
