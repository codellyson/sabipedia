import type { GuideDetail } from '~~/shared/types'

const width=1280,height=720
const introSeconds=3.5,stepSeconds=5,outroSeconds=3
type VideoBrand={logo:HTMLImageElement;mark:HTMLImageElement;font:string;canvas:string;paper:string;ink:string;text:string;line:string;green:string;orange:string}

async function loadBrand():Promise<VideoBrand> {
 await document.fonts.ready
 const image=async(path:string)=>{
  const asset=new Image()
  asset.src=path
  await asset.decode()
  return asset
 }
 const [logo,mark]=await Promise.all([
  image('/brand/whn-lockup.svg'),
  image('/brand/whn-mark.svg'),
 ])
 // Published videos use the app's light palette regardless of an editor's theme.
 const family=getComputedStyle(document.documentElement).fontFamily
 // Canvas text only uses a web font once it has loaded at that weight.
 await Promise.all([400,700].map(weight=>document.fonts.load(`${weight} 40px ${family}`)))
 return {logo,mark,font:family,canvas:'#f8f6ef',paper:'#fff',ink:'#15201a',text:'#334039',line:'#e3ded2',green:'#17664e',orange:'#d95417'}
}

function font(ctx:CanvasRenderingContext2D,brand:VideoBrand,weight:number,size:number) {
 ctx.font=`${weight} ${size}px ${brand.font}`
}

function highlightSteps(guide:GuideDetail) {
 const count=guide.content.steps.length
 if(count<=8)return guide.content.steps.map((text,index)=>({text,index}))
 const indexes=[...new Set(Array.from({length:8},(_,position)=>Math.round(position*(count-1)/7)))]
 return indexes.map(index=>({text:guide.content.steps[index]!,index}))
}

function excerpt(value:string,limit:number) {
 const text=value.replace(/\s+/g,' ').trim()
 return text.length>limit?text.slice(0,limit).replace(/\s+\S*$/,'')+'…':text
}

function lines(ctx:CanvasRenderingContext2D,value:string,maxWidth:number,maxLines:number) {
 const words=value.split(/\s+/),result:string[]=[]
 let line=''
 for(const word of words) {
  const candidate=line?`${line} ${word}`:word
  if(ctx.measureText(candidate).width<=maxWidth){line=candidate;continue}
  if(line)result.push(line)
  line=word
  if(result.length===maxLines)break
 }
 if(result.length<maxLines&&line)result.push(line)
 if(result.length===maxLines && words.join(' ').length>result.join(' ').length) {
  let last=result[maxLines-1] || ''
  while(last.length && ctx.measureText(last+'…').width>maxWidth) last=last.slice(0,-1)
  result[maxLines-1]=last.replace(/[\s,;:.]+$/,'')+'…'
 }
 return result
}

function drawLines(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number) {
 lines(ctx,value,maxWidth,maxLines).forEach((line,index)=>ctx.fillText(line,x,y+index*lineHeight))
}

function drawImageCover(ctx:CanvasRenderingContext2D,image:HTMLImageElement,x:number,y:number,w:number,h:number) {
 const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight)
 const sw=w/scale,sh=h/scale
 ctx.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,x,y,w,h)
}

function drawFrame(ctx:CanvasRenderingContext2D,guide:GuideDetail,steps:ReturnType<typeof highlightSteps>,images:Map<number,HTMLImageElement>,brand:VideoBrand,elapsed:number,total:number) {
 const stepStart=introSeconds,stepEnd=stepStart+steps.length*stepSeconds
 const slide=elapsed<stepStart?-1:elapsed<stepEnd?Math.min(steps.length-1,Math.floor((elapsed-stepStart)/stepSeconds)):steps.length
 const within=slide<0?elapsed:slide<steps.length?(elapsed-stepStart)%stepSeconds:elapsed-stepEnd
 const duration=slide<0?introSeconds:slide<steps.length?stepSeconds:outroSeconds
 const fade=slide===-1?Math.min(1,(duration-within)/.35):Math.min(1,within/.35,(duration-within)/.35)
 ctx.fillStyle=brand.canvas;ctx.fillRect(0,0,width,height)
 ctx.drawImage(brand.logo,72,42,351,64)
 ctx.fillStyle=brand.line;ctx.fillRect(72,138,width-144,2)
 ctx.fillStyle=brand.line;ctx.fillRect(72,656,width-144,8)
 ctx.fillStyle=brand.green;ctx.fillRect(72,656,(width-144)*Math.min(1,elapsed/total),8)
 ctx.save();ctx.globalAlpha=Math.max(0,fade)
 if(slide===-1) {
  ctx.fillStyle=brand.paper;ctx.beginPath();ctx.roundRect(790,210,390,360,24);ctx.fill()
  ctx.strokeStyle=brand.line;ctx.lineWidth=2;ctx.stroke()
  ctx.drawImage(brand.mark,895,300,180,180)
  ctx.fillStyle=brand.ink;font(ctx,brand,700,66)
  drawLines(ctx,excerpt(guide.content.title,130),72,260,660,76,4)
  ctx.fillStyle=brand.text;font(ctx,brand,400,28)
  drawLines(ctx,excerpt(guide.content.summary,180),72,520,630,38,3)
 } else if(slide===steps.length) {
  ctx.fillStyle=brand.ink;font(ctx,brand,700,70);ctx.fillText('Ready to try it?',72,305)
  ctx.fillStyle=brand.text;font(ctx,brand,400,31);ctx.fillText('Read every step and source in the full guide.',72,380)
  ctx.fillStyle=brand.green;font(ctx,brand,700,27);ctx.fillText('sabipedia.com',72,475)
  ctx.drawImage(brand.mark,1020,225,140,140)
 } else {
  const item=steps[slide]!,image=images.get(item.index)
  const textWidth=image?630:1090
  ctx.fillStyle=brand.orange;font(ctx,brand,700,28)
  ctx.fillText(`Step ${item.index+1} of ${guide.content.steps.length}`,72,210)
  ctx.fillStyle=brand.ink;font(ctx,brand,700,image?54:60)
  drawLines(ctx,excerpt(item.text,230),72,295,textWidth,image?70:76,5)
  if(image) {
   ctx.save();ctx.beginPath();ctx.roundRect(780,164,430,420,22);ctx.clip()
   drawImageCover(ctx,image,780,164,430,420);ctx.restore()
  }
 }
 ctx.restore()
}

async function loadImages(steps:ReturnType<typeof highlightSteps>,guide:GuideDetail) {
 const entries=await Promise.all(steps.map(async step=>{
  const id=guide.content.stepMediaIds?.[step.index]?.[0]
  if(!id)return null
  const image=new Image()
  image.src=`/api/media/${encodeURIComponent(id)}`
  try{await image.decode();return [step.index,image] as const}catch{return null}
 }))
 return new Map(entries.filter((entry):entry is readonly [number,HTMLImageElement]=>entry!==null))
}

export async function generateGuideVideo(guide:GuideDetail,onProgress:(progress:number)=>void):Promise<File> {
 if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)
  throw new Error('Video generation needs a browser with canvas recording support. Try a current Chrome, Edge, or Safari browser.')
 const mimeType=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))
 if(!mimeType)throw new Error('This browser cannot record WebM or MP4 video.')
 const steps=highlightSteps(guide)
 const [images,brand]=await Promise.all([loadImages(steps,guide),loadBrand()])
 const total=introSeconds+steps.length*stepSeconds+outroSeconds
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
 const ctx=canvas.getContext('2d')
 if(!ctx)throw new Error('Could not start the video canvas.')
 drawFrame(ctx,guide,steps,images,brand,0,total)
 const stream=canvas.captureStream(20)
 let recorder:MediaRecorder
 try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:2_000_000})}
 catch(error){stream.getTracks().forEach(track=>track.stop());throw error}
 const chunks:BlobPart[]=[]
 let failed:Error|null=null
 const finished=new Promise<void>(resolve=>{
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)}
  recorder.onerror=()=>{failed=new Error('The browser could not finish recording the video.')}
  recorder.onstop=()=>resolve()
 })
 try {
  recorder.start(1000)
  const started=performance.now()
  let progress=-1
  await new Promise<void>(resolve=>{
   const frame=()=>{
    const elapsed=Math.min(total,(performance.now()-started)/1000)
    drawFrame(ctx,guide,steps,images,brand,elapsed,total)
    const next=Math.round(elapsed/total*100)
    if(next!==progress){progress=next;onProgress(next)}
    if(elapsed<total)requestAnimationFrame(frame)
    else setTimeout(resolve,200)
   }
   requestAnimationFrame(frame)
  })
  if(recorder.state!=='inactive')recorder.stop()
  await finished
 } finally {stream.getTracks().forEach(track=>track.stop())}
 if(failed)throw failed
 const type=recorder.mimeType.startsWith('video/mp4')?'video/mp4':'video/webm'
 const file=new File(chunks,`guide-${guide.slug}.${type==='video/mp4'?'mp4':'webm'}`,{type})
 if(!file.size)throw new Error('The browser produced an empty video. Please try again.')
 if(file.size>40_000_000)throw new Error('The generated video is over 40 MB. Try another browser.')
 return file
}
