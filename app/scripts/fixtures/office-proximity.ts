// Local-only integration: real WebRTC transport + production audio policy and sender gate.
// Synthetic signal. No microphone, no signaling service, no invitations to real users.
import { decidir, type EstadoAudio } from '../../app/oficina/_audio-grafo'
import { NegociacionOficina } from '../../app/oficina/_negociacion'
import { AudioSenderGate } from '../../app/oficina/_audio-sender'
const out=document.querySelector('pre')!,button=document.querySelector('button')!
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms))
button.onclick=async()=>{
  button.disabled=true;out.textContent='Comprobando transporte local…'
  const a=new RTCPeerConnection(),b=new RTCPeerConnection(),ctx=new AudioContext()
  let negotiationError = false
  let anchor:HTMLAudioElement|undefined,returnAnchor:HTMLAudioElement|undefined,gate:AudioSenderGate|undefined,returnGate:AudioSenderGate|undefined
  const lines:string[]=[]
  try{
    await ctx.resume()
    // Forzar ofertas simultáneas y entregar ICE antes de la descripción.
    const na=new NegociacionOficina(a,false,sdp=>{setTimeout(()=>void nb.descripcion(sdp),80)},()=>{negotiationError=true})
    const nb=new NegociacionOficina(b,true,sdp=>{setTimeout(()=>void na.descripcion(sdp),80)},()=>{negotiationError=true})
    a.onnegotiationneeded=()=>{void na.ofrecer()};b.onnegotiationneeded=()=>{void nb.ofrecer()}
    a.onicecandidate=e=>{if(e.candidate)void nb.candidato(e.candidate.toJSON())}
    b.onicecandidate=e=>{if(e.candidate)void na.candidato(e.candidate.toJSON())}
    let received:MediaStream|undefined,receivedA:MediaStream|undefined
    a.ontrack=e=>{receivedA=e.streams[0]??new MediaStream([e.track])}
    b.ontrack=e=>{received=e.streams[0]??new MediaStream([e.track])}
    const sender=a.addTransceiver('audio',{direction:'sendrecv'}).sender
    const senderB=b.addTransceiver('audio',{direction:'sendrecv'}).sender
    for(let i=0;i<50 && (a.connectionState!=='connected'||b.connectionState!=='connected');i++)await wait(100)
    if(negotiationError || a.connectionState!=='connected'||b.connectionState!=='connected')throw Error('No negoció ambas ofertas')
    lines.push('PASS · Ofertas simultáneas e ICE antes de la descripción')
    if(!received)throw Error('Sin pista receptora')
    anchor=document.createElement('audio');anchor.srcObject=received;anchor.muted=true;anchor.autoplay=true;await anchor.play()
    const source=ctx.createOscillator(),destination=ctx.createMediaStreamDestination();source.connect(destination);source.start()
    const analyser=ctx.createAnalyser(),silence=ctx.createGain();silence.gain.value=0
    ctx.createMediaStreamSource(received).connect(analyser);analyser.connect(silence);silence.connect(ctx.destination)
    const signal=destination.stream.getAudioTracks()[0];sender.setStreams(destination.stream);gate=new AudioSenderGate(sender)
    const base:EstadoAudio={id:'a',x:0,y:0,zona:null,privada:null,ghost:false,spot:false,quiet:false,estado:'disponible'}
    const peak=()=>{const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs))}
    async function check(label:string,me:EstadoAudio,other:EstadoAudio,audible:boolean){
      const dec=decidir(other,me,true)
      gate!.set(signal,dec.gain>0);await wait(1200)
      const value=peak()
      if(audible ? value<.02 : value>.01)throw Error(`${label}: amplitud ${value.toFixed(4)}`)
      if(!audible && sender.track!==null)throw Error(`${label}: todavía envía micrófono`)
      lines.push(`PASS · ${label} · amplitud ${value.toFixed(4)}`);out.textContent=lines.join('\n')
    }
    await check('Cerca: llega la voz',base,{...base,id:'b',x:1},true)
    if(!receivedA)throw Error('Sin pista de regreso')
    returnAnchor=document.createElement('audio');returnAnchor.srcObject=receivedA;returnAnchor.muted=true;await returnAnchor.play()
    const analyserA=ctx.createAnalyser();ctx.createMediaStreamSource(receivedA).connect(analyserA);analyserA.connect(silence)
    senderB.setStreams(destination.stream);returnGate=new AudioSenderGate(senderB);returnGate.set(signal,true);await wait(1200)
    const samplesA=new Float32Array(analyserA.fftSize);analyserA.getFloatTimeDomainData(samplesA)
    if(Math.max(...samplesA.map(Math.abs))<.02)throw Error('Sin voz de regreso después de resolver ofertas simultáneas')
    returnGate.set(null,false);lines.push('PASS · Voz de regreso: audio funciona en ambos sentidos')
    await check('Otra mesa: envío cortado',base,{...base,id:'b',x:3},false)
    await check('Se acerca de nuevo: reconecta voz',base,{...base,id:'b',x:1},true)
    await check('Pared: envío cortado',base,{...base,id:'b',x:1,zona:'gerencia'},false)
    await check('Privada: tercero no recibe voz',{...base,privada:'call'}, {...base,id:'b',x:1},false)
    await check('Privada aceptada: llega la voz a su pareja',{...base,privada:'call'},{...base,id:'b',x:20,privada:'call'},true)
    await check('Anuncio lejano: oyente no devuelve su audio',base,{...base,id:'b',x:20,spot:true},false)
    gate.set(null,true);destination.stream.getTracks().forEach(t=>t.stop());source.stop()
    out.textContent+='\nCOMPLETADO: 9 pruebas; micrófono del dispositivo nunca solicitado.'
  }catch(e){out.textContent+='\nFAIL: '+String(e)}finally{gate?.dispose();returnGate?.dispose();if(returnAnchor)returnAnchor.srcObject=null;a.close();b.close();if(anchor)anchor.srcObject=null;await ctx.close();button.disabled=false}
}
