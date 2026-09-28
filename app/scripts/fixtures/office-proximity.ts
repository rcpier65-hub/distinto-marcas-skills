// Local-only integration: real WebRTC transport + production audio policy and sender gate.
// Synthetic signal. No microphone, no signaling service, no invitations to real users.
import { decidir, type EstadoAudio } from '../../app/oficina/_audio-grafo'
import { AudioSenderGate } from '../../app/oficina/_audio-sender'
const out=document.querySelector('pre')!,button=document.querySelector('button')!
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms))
button.onclick=async()=>{
  button.disabled=true;out.textContent='Comprobando transporte local…'
  const a=new RTCPeerConnection(),b=new RTCPeerConnection(),ctx=new AudioContext()
  const pendingA:RTCIceCandidate[]=[],pendingB:RTCIceCandidate[]=[]
  let anchor:HTMLAudioElement|undefined,gate:AudioSenderGate|undefined
  const lines:string[]=[]
  try{
    await ctx.resume()
    a.onicecandidate=e=>{if(e.candidate){if(b.remoteDescription)void b.addIceCandidate(e.candidate);else pendingB.push(e.candidate)}}
    b.onicecandidate=e=>{if(e.candidate){if(a.remoteDescription)void a.addIceCandidate(e.candidate);else pendingA.push(e.candidate)}}
    let received:MediaStream|undefined
    b.ontrack=e=>{received=e.streams[0]??new MediaStream([e.track])}
    const sender=a.addTransceiver('audio',{direction:'sendrecv'}).sender
    b.addTransceiver('audio',{direction:'sendrecv'})
    await a.setLocalDescription();await b.setRemoteDescription(a.localDescription!);await b.setLocalDescription();await a.setRemoteDescription(b.localDescription!)
    for(const c of pendingA)await a.addIceCandidate(c);for(const c of pendingB)await b.addIceCandidate(c)
    await wait(400)
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
    await check('Otra mesa: envío cortado',base,{...base,id:'b',x:3},false)
    await check('Se acerca de nuevo: reconecta voz',base,{...base,id:'b',x:1},true)
    await check('Pared: envío cortado',base,{...base,id:'b',x:1,zona:'gerencia'},false)
    await check('Privada: tercero no recibe voz',{...base,privada:'call'}, {...base,id:'b',x:1},false)
    await check('Privada aceptada: llega la voz a su pareja',{...base,privada:'call'},{...base,id:'b',x:20,privada:'call'},true)
    await check('Anuncio lejano: oyente no devuelve su audio',base,{...base,id:'b',x:20,spot:true},false)
    gate.set(null,true);destination.stream.getTracks().forEach(t=>t.stop());source.stop()
    out.textContent+='\nCOMPLETADO: 7 pruebas; micrófono del dispositivo nunca solicitado.'
  }catch(e){out.textContent+='\nFAIL: '+String(e)}finally{gate?.dispose();a.close();b.close();if(anchor)anchor.srcObject=null;await ctx.close();button.disabled=false}
}
