type TransactionalMessage = {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendTransactionalEmail(env: Env, message: TransactionalMessage) {
  if (!env.EMAIL || !env.EMAIL_FROM) throw new Error('Email Sending is not configured')
  await env.EMAIL.send({ from: env.EMAIL_FROM, ...message })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]!)
}

export function passwordResetEmail(name: string, url: string) {
  const safeName=escapeHtml(name || 'there'),safeUrl=escapeHtml(url)
  return {
    subject: 'Reset your WikiHowNaija password',
    text: `Hello ${name || 'there'},\n\nUse this link to choose a new WikiHowNaija password:\n${url}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Use the button below to choose a new WikiHowNaija password.</p><p><a href="${safeUrl}">Reset my password</a></p><p>This link expires in one hour. If you did not request it, you can ignore this email.</p>`,
  }
}

export function verificationEmail(name: string, url: string) {
  const safeName=escapeHtml(name || 'there'),safeUrl=escapeHtml(url)
  return {
    subject: 'Verify your WikiHowNaija email',
    text: `Hello ${name || 'there'},\n\nVerify your email to finish creating your WikiHowNaija account:\n${url}\n\nThis link expires in one hour. If you did not create this account, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Verify your email to finish creating your WikiHowNaija account.</p><p><a href="${safeUrl}">Verify my email</a></p><p>This link expires in one hour. If you did not create this account, you can ignore this email.</p>`,
  }
}

export function reviewDecisionEmail(input: { name: string; title: string; published: boolean; note: string; url: string }) {
  const outcome=input.published?'has been published':'needs changes before it can be published'
  const subjectTitle=input.title.replace(/[\r\n]+/g,' ').trim()
  const safeName=escapeHtml(input.name || 'there'),safeTitle=escapeHtml(input.title),safeUrl=escapeHtml(input.url)
  const note=input.note.trim()
  const noteText=note?`\n\nEditor’s note:\n${note}`:''
  const noteHtml=note?`<h2>Editor’s note</h2><p>${escapeHtml(note).replace(/\n/g,'<br>')}</p>`:''
  return {
    subject: input.published?`Published: ${subjectTitle}`:`Changes requested: ${subjectTitle}`,
    text: `Hello ${input.name || 'there'},\n\nYour guide “${input.title}” ${outcome}.${noteText}\n\nSee your submissions: ${input.url}`,
    html: `<p>Hello ${safeName},</p><p>Your guide <strong>“${safeTitle}”</strong> ${outcome}.</p>${noteHtml}<p><a href="${safeUrl}">See my submissions</a></p>`,
  }
}
