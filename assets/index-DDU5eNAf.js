(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[`C`,`C#`,`D`,`D#`,`E`,`F`,`F#`,`G`,`G#`,`A`,`A#`,`B`],t=[`C`,`Db`,`D`,`Eb`,`E`,`F`,`Gb`,`G`,`Ab`,`A`,`Bb`,`B`],n=[`Do`,`Di`,`Re`,`Ri`,`Mi`,`Fa`,`Fi`,`Sol`,`Si`,`La`,`Li`,`Ti`];function r(r,i=440,a=`sharp`){if(r<=0||!isFinite(r))return null;let o=69+12*Math.log2(r/i),s=Math.round(o),c=Math.round((o-s)*100),l=i*2**((s-69)/12),u=(s%12+12)%12,d=Math.floor(s/12)-1,f=``,p=``;if(a===`flat`){let e=t[u];f=e[0],p=e.length>1?`♭`:``}else if(a===`solfege`)f=n[u],p=``;else{let t=e[u];f=t[0],p=t.length>1?`♯`:``}let m=n[u];return{frequency:Math.round(r*10)/10,targetFrequency:Math.round(l*10)/10,midi:o,noteIndex:u,noteName:f+p,accidental:p,octave:d,cents:c,solfege:m,inTune:Math.abs(c)<=3}}function i(e,t,n=440){return n*2**(((t+1)*12+e-69)/12)}function a(e,t=440){return t*2**((e-69)/12)}function o(e,t,n=30,r=2200,i=.002){let a=e.length,o=0;for(let t=0;t<a;t++){let n=e[t];o+=n*n}let s=Math.sqrt(o/a);if(s<i)return{frequency:0,confidence:0,rms:s};let c=0;for(let t=0;t<a;t++)c+=e[t];let l=c/a,u=Math.max(4,Math.floor(t/r)),d=Math.min(a-1,Math.ceil(t/n)),f=-1,p=-1,m=!1,h=new Float32Array(d+2),g=0,_=0;for(let t=0;t<a-d;t++){let n=e[t]-l;g+=n*n}for(let t=u;t<=d;t++){let n=0;_=0;let r=a-t;for(let i=0;i<r;i++){let r=e[i]-l,a=e[i+t]-l;n+=r*a,_+=a*a}let i=Math.sqrt(g*_),o=i>0?n/i:0;if(h[t]=o,!m&&o<.2&&(m=!0),m&&t>u){let e=h[t-1];if(e>h[t-2]&&e>o&&e>.45&&e>p&&(p=e,f=t-1,e>=.9))break}}if(f===-1||p<.45)return{frequency:0,confidence:p>0?p:0,rms:s};let v=f,y=h[v-1],b=h[v],x=h[v+1],S=2*(2*b-y-x),C=0;Math.abs(S)>1e-6&&(C=(x-y)/S),C=Math.max(-.5,Math.min(.5,C));let w=t/(v+C);return w<n*.9||w>r*1.1?{frequency:0,confidence:0,rms:s}:{frequency:w,confidence:p,rms:s}}function s(){return typeof navigator>`u`?!1:/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1}var c=class{audioCtx=null;mediaStream=null;sourceNode=null;preampGainNode=null;highpassFilter=null;lowpassFilter=null;analyserNode=null;isRunning=!1;animFrameId=null;fftSize=4096;timeDataBuffer=new Float32Array(new ArrayBuffer(this.fftSize*4));freqDataBuffer=new Uint8Array(new ArrayBuffer(this.fftSize/2));pitchHistoryWindow=[];maxPitchSmoothing=3;a4=440;notation=`sharp`;noiseGateThreshold=s()?.0015:.0025;inputGain=s()?4:1;autoGainControl=s();rawAudioMode=!0;history=[];maxHistoryLength=300;listeners=new Set;constructor(){}isListening(){return this.isRunning}setA4(e){this.a4=Math.max(400,Math.min(480,e))}getA4(){return this.a4}setNotation(e){this.notation=e}getNotation(){return this.notation}setNoiseGate(e){this.noiseGateThreshold=Math.max(3e-4,Math.min(.08,e))}getNoiseGate(){return this.noiseGateThreshold}setInputGain(e){this.inputGain=Math.max(.5,Math.min(20,e)),this.preampGainNode&&this.audioCtx&&this.preampGainNode.gain.setValueAtTime(this.inputGain,this.audioCtx.currentTime)}getInputGain(){return this.inputGain}setAutoGainControl(e){this.autoGainControl=e,this.isRunning&&(this.stop(),this.start())}getAutoGainControl(){return this.autoGainControl}setRawAudioMode(e){this.rawAudioMode=e,this.isRunning&&(this.stop(),this.start())}getRawAudioMode(){return this.rawAudioMode}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}getHistory(){return this.history}clearHistory(){this.history=[]}async start(){if(!this.isRunning)try{let e=window.AudioContext||window.webkitAudioContext;this.audioCtx=new e,this.audioCtx.state===`suspended`&&await this.audioCtx.resume();let t=this.rawAudioMode?{echoCancellation:!1,noiseSuppression:!1,autoGainControl:this.autoGainControl}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0};this.mediaStream=await navigator.mediaDevices.getUserMedia({audio:t,video:!1}),this.sourceNode=this.audioCtx.createMediaStreamSource(this.mediaStream),this.preampGainNode=this.audioCtx.createGain(),this.preampGainNode.gain.setValueAtTime(this.inputGain,this.audioCtx.currentTime),this.highpassFilter=this.audioCtx.createBiquadFilter(),this.highpassFilter.type=`highpass`,this.highpassFilter.frequency.setValueAtTime(32,this.audioCtx.currentTime),this.lowpassFilter=this.audioCtx.createBiquadFilter(),this.lowpassFilter.type=`lowpass`,this.lowpassFilter.frequency.setValueAtTime(2600,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=this.fftSize,this.analyserNode.smoothingTimeConstant=.1,this.sourceNode.connect(this.preampGainNode),this.preampGainNode.connect(this.highpassFilter),this.highpassFilter.connect(this.lowpassFilter),this.lowpassFilter.connect(this.analyserNode),this.isRunning=!0,this.processLoop()}catch(e){throw console.error(`Failed to open microphone:`,e),this.stop(),e}}stop(){this.isRunning=!1,this.animFrameId!==null&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null),this.mediaStream&&=(this.mediaStream.getTracks().forEach(e=>e.stop()),null),this.sourceNode&&=(this.sourceNode.disconnect(),null),this.preampGainNode&&=(this.preampGainNode.disconnect(),null),this.highpassFilter&&=(this.highpassFilter.disconnect(),null),this.lowpassFilter&&=(this.lowpassFilter.disconnect(),null),this.analyserNode&&=(this.analyserNode.disconnect(),null),this.audioCtx&&=(this.audioCtx.close(),null),this.pitchHistoryWindow=[];let e={timestamp:performance.now(),frequency:0,rawFrequency:0,confidence:0,rms:0,note:null,waveformData:new Float32Array,spectrumData:new Uint8Array};this.listeners.forEach(t=>t(e))}processLoop=()=>{if(!this.isRunning||!this.analyserNode||!this.audioCtx)return;this.analyserNode.getFloatTimeDomainData(this.timeDataBuffer),this.analyserNode.getByteFrequencyData(this.freqDataBuffer);let e=this.audioCtx.sampleRate,t=o(this.timeDataBuffer,e,25,2300,this.noiseGateThreshold),n=0,i=t.frequency;if(i>0){this.pitchHistoryWindow.push(i),this.pitchHistoryWindow.length>this.maxPitchSmoothing&&this.pitchHistoryWindow.shift();let e=[...this.pitchHistoryWindow].sort((e,t)=>e-t);n=e[Math.floor(e.length/2)]}else this.pitchHistoryWindow.length>0&&this.pitchHistoryWindow.shift();let a=n>0?r(n,this.a4,this.notation):null,s=performance.now();n>0&&a&&(this.history.push({time:s,freq:n,cents:a.cents,inTune:a.inTune,rms:t.rms}),this.history.length>this.maxHistoryLength&&this.history.shift());let c={timestamp:s,frequency:n,rawFrequency:i,confidence:t.confidence,rms:t.rms,note:a,waveformData:this.timeDataBuffer,spectrumData:this.freqDataBuffer};this.listeners.forEach(e=>e(c)),this.animFrameId=requestAnimationFrame(this.processLoop)}},l=class{audioCtx=null;masterGain=null;droneGain=null;droneOscillators=[];isDroneActive=!1;currentDroneFreq=440;currentTimbre=`acoustic`;volume=.5;constructor(){}ensureContext(){if(!this.audioCtx){let e=window.AudioContext||window.webkitAudioContext;this.audioCtx=new e,this.masterGain=this.audioCtx.createGain(),this.masterGain.gain.setValueAtTime(this.volume,this.audioCtx.currentTime),this.masterGain.connect(this.audioCtx.destination)}return this.audioCtx.state===`suspended`&&this.audioCtx.resume(),this.audioCtx}setVolume(e){if(this.volume=Math.max(0,Math.min(1,e)),this.audioCtx&&this.masterGain){let e=this.audioCtx.currentTime;this.masterGain.gain.cancelScheduledValues(e),this.masterGain.gain.linearRampToValueAtTime(this.volume,e+.03)}}getVolume(){return this.volume}setTimbre(e){this.currentTimbre=e,this.isDroneActive&&this.startDrone(this.currentDroneFreq,e)}getTimbre(){return this.currentTimbre}playNote(e,t=1.2,n=this.currentTimbre){let r=this.ensureContext(),i=r.currentTime,a=r.createGain();a.connect(this.masterGain),this.buildSynthVoice(r,a,e,n,i,t,!1)}startDrone(e,t=this.currentTimbre){let n=this.ensureContext();this.stopDrone(),this.currentDroneFreq=e,this.currentTimbre=t,this.isDroneActive=!0;let r=n.currentTime,i=n.createGain();i.gain.setValueAtTime(0,r),i.gain.linearRampToValueAtTime(.7,r+.08),i.connect(this.masterGain),this.droneGain=i,this.buildSynthVoice(n,i,e,t,r,0,!0)}updateDroneFrequency(e){if(!this.isDroneActive||!this.audioCtx)return;this.currentDroneFreq=e;let t=this.audioCtx.currentTime;for(let n of this.droneOscillators)if(n instanceof OscillatorNode){let r=n.__harmonicMult||1;n.frequency.cancelScheduledValues(t),n.frequency.exponentialRampToValueAtTime(Math.max(20,e*r),t+.05)}}stopDrone(){if(this.isDroneActive&&this.audioCtx&&(this.isDroneActive=!1,this.droneGain)){let e=this.audioCtx.currentTime;this.droneGain.gain.cancelScheduledValues(e),this.droneGain.gain.linearRampToValueAtTime(1e-4,e+.08),setTimeout(()=>{for(let e of this.droneOscillators)if(e instanceof OscillatorNode)try{e.stop(),e.disconnect()}catch{}this.droneOscillators=[],this.droneGain?.disconnect(),this.droneGain=null},100)}}isDronePlaying(){return this.isDroneActive}getDroneFrequency(){return this.currentDroneFreq}buildSynthVoice(e,t,n,r,i,a,o){let s=[];if(r===`sine`){let r=e.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(n,i),r.connect(t),r.start(i),s.push(r),o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.8,i+.03),t.gain.exponentialRampToValueAtTime(1e-4,i+a),r.stop(i+a+.05))}else if(r===`triangle`){let r=e.createOscillator();r.type=`triangle`,r.frequency.setValueAtTime(n,i),r.connect(t),r.start(i),s.push(r),o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.8,i+.02),t.gain.exponentialRampToValueAtTime(1e-4,i+a),r.stop(i+a+.05))}else if(r===`reed`){let r=e.createBiquadFilter();r.type=`lowpass`,r.frequency.setValueAtTime(Math.min(3500,n*5),i),r.connect(t);for(let t of[{mult:1,gain:.7},{mult:3,gain:.25},{mult:5,gain:.08}]){let c=e.createOscillator(),l=e.createGain();c.type=`triangle`,c.frequency.setValueAtTime(n*t.mult,i),c.__harmonicMult=t.mult,l.gain.setValueAtTime(t.gain,i),c.connect(l),l.connect(r),c.start(i),s.push(c),o||c.stop(i+a+.05)}o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.8,i+.03),t.gain.exponentialRampToValueAtTime(1e-4,i+a))}else{let r=e.createBiquadFilter();r.type=`lowpass`,r.frequency.setValueAtTime(Math.min(5e3,n*6),i),r.connect(t);for(let t of[{mult:1,gain:.65,type:`sine`},{mult:2,gain:.25,type:`triangle`},{mult:3,gain:.12,type:`sine`},{mult:4,gain:.05,type:`sine`}]){let c=e.createOscillator(),l=e.createGain();c.type=t.type,c.frequency.setValueAtTime(n*t.mult,i),c.__harmonicMult=t.mult,l.gain.setValueAtTime(t.gain,i),c.connect(l),l.connect(r),c.start(i),s.push(c),o||c.stop(i+a+.05)}o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.85,i+.015),t.gain.exponentialRampToValueAtTime(.2,i+.35),t.gain.exponentialRampToValueAtTime(1e-4,i+a))}o&&(this.droneOscillators=s)}},u=class{canvas;ctx;currentCents=0;targetCents=0;needleVelocity=0;hasActiveNote=!1;strobeOffset=0;lastTime=performance.now();constructor(e){this.canvas=e,this.ctx=e.getContext(`2d`,{alpha:!0}),this.handleResize(),window.addEventListener(`resize`,this.handleResize)}handleResize=()=>{let e=window.devicePixelRatio||1,t=this.canvas.getBoundingClientRect();t.width!==0&&t.height!==0&&(this.canvas.width=t.width*e,this.canvas.height=t.height*e,this.ctx.resetTransform(),this.ctx.scale(e,e),this.draw())};update(e){e&&e.frequency>0?(this.hasActiveNote=!0,this.targetCents=Math.max(-50,Math.min(50,e.cents))):(this.hasActiveNote=!1,this.targetCents=0),this.renderFrame()}renderFrame=()=>{let e=performance.now(),t=Math.min(.1,(e-this.lastTime)/1e3);this.lastTime=e;let n=(this.targetCents-this.currentCents)*120+-this.needleVelocity*16;if(this.needleVelocity+=n*t,this.currentCents+=this.needleVelocity*t,this.hasActiveNote){let e=this.currentCents*35;this.strobeOffset=(this.strobeOffset+e*t)%40}this.draw()};draw(){let e=this.canvas.getBoundingClientRect(),t=e.width,n=e.height;if(t===0||n===0)return;this.ctx.clearRect(0,0,t,n);let r=t/2,i=n*.72,a=Math.min(t*.44,n*.62),o=Math.PI*.82,s=Math.PI*2.18,c=s-o;this.ctx.save(),this.ctx.beginPath(),this.ctx.arc(r,i,a,o,s),this.ctx.lineWidth=10,this.ctx.strokeStyle=`rgba(255, 255, 255, 0.08)`,this.ctx.lineCap=`round`,this.ctx.stroke();let l=o+c*.5,u=5/100*c;this.ctx.beginPath(),this.ctx.arc(r,i,a,l-u,l+u),this.ctx.lineWidth=12,this.ctx.strokeStyle=`rgba(16, 185, 129, 0.45)`,this.ctx.stroke();for(let e of[{cents:-50,label:`-50`},{cents:-40,label:``},{cents:-30,label:`-30`},{cents:-20,label:``},{cents:-10,label:`-10`},{cents:0,label:`0`},{cents:10,label:`+10`},{cents:20,label:``},{cents:30,label:`+30`},{cents:40,label:``},{cents:50,label:`+50`}]){let t=o+(e.cents+50)/100*c,n=e.cents%10==0,s=e.cents===0,l=s?a-18:n?a-14:a-8,u=a+6,d=r+Math.cos(t)*l,f=i+Math.sin(t)*l,p=r+Math.cos(t)*u,m=i+Math.sin(t)*u;if(this.ctx.beginPath(),this.ctx.moveTo(d,f),this.ctx.lineTo(p,m),this.ctx.lineWidth=s?3.5:n?2:1,this.ctx.strokeStyle=s?`#10b981`:n?`rgba(255, 255, 255, 0.45)`:`rgba(255, 255, 255, 0.2)`,this.ctx.stroke(),e.label){let n=a-28,o=r+Math.cos(t)*n,c=i+Math.sin(t)*n;this.ctx.fillStyle=s?`#10b981`:`rgba(255, 255, 255, 0.5)`,this.ctx.font=s?`600 13px system-ui, sans-serif`:`500 11px system-ui, sans-serif`,this.ctx.textAlign=`center`,this.ctx.textBaseline=`middle`,this.ctx.fillText(e.label,o,c)}}let d=Math.max(-50,Math.min(50,this.currentCents)),f=o+(d+50)/100*c,p=Math.abs(d),m=`#ef4444`,h=`rgba(239, 68, 68, 0.5)`;this.hasActiveNote?p<=3?(m=`#10b981`,h=`rgba(16, 185, 129, 0.8)`):p<=7?(m=`#84cc16`,h=`rgba(132, 204, 22, 0.6)`):p<=15&&(m=`#f59e0b`,h=`rgba(245, 158, 11, 0.5)`):(m=`rgba(255, 255, 255, 0.25)`,h=`transparent`),this.hasActiveNote&&(this.ctx.shadowColor=h,this.ctx.shadowBlur=12);let g=a+2,_=r+Math.cos(f)*g,v=i+Math.sin(f)*g,y=f+Math.PI/2,b=r+Math.cos(y)*5,x=i+Math.sin(y)*5,S=r-Math.cos(y)*5,C=i-Math.sin(y)*5;this.ctx.beginPath(),this.ctx.moveTo(b,x),this.ctx.lineTo(_,v),this.ctx.lineTo(S,C),this.ctx.closePath(),this.ctx.fillStyle=m,this.ctx.fill(),this.ctx.shadowBlur=0,this.ctx.beginPath(),this.ctx.arc(r,i,9,0,Math.PI*2),this.ctx.fillStyle=`#1e293b`,this.ctx.fill(),this.ctx.lineWidth=3,this.ctx.strokeStyle=m,this.ctx.stroke();let w=n-26,T=Math.min(t*.75,360),E=r-T/2;this.ctx.fillStyle=`#0f172a`,this.ctx.beginPath(),this.ctx.roundRect(E,w,T,14,7),this.ctx.fill(),this.ctx.strokeStyle=`rgba(255, 255, 255, 0.12)`,this.ctx.lineWidth=1,this.ctx.stroke(),this.ctx.save(),this.ctx.beginPath(),this.ctx.roundRect(E,w,T,14,7),this.ctx.clip();let D=E-40+this.strobeOffset%24;for(let e=D;e<E+T+40;e+=24)this.ctx.fillStyle=this.hasActiveNote?p<=3?`rgba(16, 185, 129, 0.9)`:p<=10?`rgba(245, 158, 11, 0.7)`:`rgba(239, 68, 68, 0.7)`:`rgba(255, 255, 255, 0.1)`,this.ctx.fillRect(e,w,12,14);this.ctx.beginPath(),this.ctx.moveTo(r,w),this.ctx.lineTo(r,w+14),this.ctx.strokeStyle=`#ffffff`,this.ctx.lineWidth=2,this.ctx.stroke(),this.ctx.restore(),this.ctx.restore()}},d=class{canvas;ctx;mode=`pitch-history`;history=[];lastWaveform=new Float32Array;constructor(e){this.canvas=e,this.ctx=e.getContext(`2d`,{alpha:!0}),this.handleResize(),window.addEventListener(`resize`,this.handleResize)}setMode(e){this.mode=e,this.draw()}getMode(){return this.mode}handleResize=()=>{let e=window.devicePixelRatio||1,t=this.canvas.getBoundingClientRect();t.width!==0&&t.height!==0&&(this.canvas.width=t.width*e,this.canvas.height=t.height*e,this.ctx.resetTransform(),this.ctx.scale(e,e),this.draw())};update(e){let t=e.timestamp;for(e.frequency>0&&e.note?this.history.push({time:t,cents:e.note.cents,inTune:e.note.inTune,hasSound:!0}):this.history.push({time:t,cents:0,inTune:!1,hasSound:!1});this.history.length>0&&t-this.history[0].time>4500;)this.history.shift();this.lastWaveform=e.waveformData,this.draw()}clear(){this.history=[],this.draw()}draw(){let e=this.canvas.getBoundingClientRect(),t=e.width,n=e.height;t!==0&&n!==0&&(this.ctx.clearRect(0,0,t,n),this.mode===`waveform`?this.drawWaveform(t,n):this.drawPitchHistory(t,n))}drawPitchHistory(e,t){let n=t/2,r=t*.42/50;for(let t of[-50,-25,0,25,50]){let i=n-t*r,a=t===0;this.ctx.beginPath(),this.ctx.moveTo(0,i),this.ctx.lineTo(e,i),this.ctx.lineWidth=a?1.5:1,this.ctx.strokeStyle=a?`rgba(16, 185, 129, 0.4)`:`rgba(255, 255, 255, 0.07)`,this.ctx.stroke(),this.ctx.fillStyle=a?`rgba(16, 185, 129, 0.7)`:`rgba(255, 255, 255, 0.3)`,this.ctx.font=`10px system-ui, sans-serif`,this.ctx.textAlign=`right`,this.ctx.fillText((t>0?`+${t}`:`${t}`)+`¢`,e-8,i-3)}let i=n-5*r,a=10*r;if(this.ctx.fillStyle=`rgba(16, 185, 129, 0.08)`,this.ctx.fillRect(0,i,e,a),this.history.length<2)return;let o=this.history[this.history.length-1].time,s=!1;for(let t=0;t<this.history.length;t++){let i=this.history[t],a=e-(o-i.time)/4500*e,c=n-i.cents*r;if(!i.hasSound){s=!1;continue}s?this.ctx.lineTo(a,c):(this.ctx.beginPath(),this.ctx.moveTo(a,c),s=!0);let l=Math.abs(i.cents),u=l<=3?`#10b981`:l<=12?`#f59e0b`:`#ef4444`;t>0&&this.history[t-1].hasSound&&(this.ctx.lineWidth=3,this.ctx.strokeStyle=u,this.ctx.stroke(),this.ctx.beginPath(),this.ctx.moveTo(a,c))}let c=this.history[this.history.length-1];if(c&&c.hasSound){let t=n-c.cents*r,i=Math.abs(c.cents)<=3?`#10b981`:Math.abs(c.cents)<=12?`#f59e0b`:`#ef4444`;this.ctx.beginPath(),this.ctx.arc(e-4,t,5,0,Math.PI*2),this.ctx.fillStyle=i,this.ctx.shadowColor=i,this.ctx.shadowBlur=8,this.ctx.fill(),this.ctx.shadowBlur=0}}drawWaveform(e,t){let n=t/2;if(this.ctx.beginPath(),this.ctx.moveTo(0,n),this.ctx.lineTo(e,n),this.ctx.strokeStyle=`rgba(255, 255, 255, 0.08)`,this.ctx.lineWidth=1,this.ctx.stroke(),!this.lastWaveform||this.lastWaveform.length===0)return;this.ctx.beginPath();let r=e/512,i=0,a=Math.floor(this.lastWaveform.length/512);for(let e=0;e<512;e++){let o=n+(this.lastWaveform[e*a]||0)*(t*.42);e===0?this.ctx.moveTo(i,o):this.ctx.lineTo(i,o),i+=r}this.ctx.lineWidth=2,this.ctx.strokeStyle=`#38bdf8`,this.ctx.shadowColor=`rgba(56, 189, 248, 0.6)`,this.ctx.shadowBlur=6,this.ctx.stroke(),this.ctx.shadowBlur=0}},f={KeyZ:0,z:0,KeyS:1,s:1,KeyX:2,x:2,KeyD:3,d:3,KeyC:4,c:4,KeyV:5,v:5,KeyG:6,g:6,KeyB:7,b:7,KeyH:8,h:8,KeyN:9,n:9,KeyJ:10,j:10,KeyM:11,m:11,Comma:12,",":12,KeyQ:12,q:12,Digit2:13,2:13,KeyW:14,w:14,Digit3:15,3:15,KeyE:16,e:16,KeyR:17,r:17,Digit5:18,5:18,KeyT:19,t:19,Digit6:20,6:20,KeyY:21,y:21,Digit7:22,7:22,KeyU:23,u:23,KeyI:24,i:24},p=[`Z`,`S`,`X`,`D`,`C`,`V`,`G`,`B`,`H`,`N`,`J`,`M`,`Q`,`2`,`W`,`3`,`E`,`R`,`5`,`T`,`6`,`Y`,`7`,`U`,`I`],m={KeyA:0,a:0,KeyW:1,w:1,KeyS:2,s:2,KeyE:3,e:3,KeyD:4,d:4,KeyF:5,f:5,KeyT:6,t:6,KeyG:7,g:7,KeyY:8,y:8,KeyH:9,h:9,KeyU:10,u:10,KeyJ:11,j:11,KeyK:12,k:12,KeyO:13,o:13,KeyL:14,l:14,KeyP:15,p:15,Semicolon:16,";":16,Quote:17,"'":17},h=[`A`,`W`,`S`,`E`,`D`,`F`,`T`,`G`,`Y`,`H`,`U`,`J`,`K`,`O`,`L`,`P`,`;`,`'`,``,``,``,``,``,``,``],g=class{container;toneGen;startOctave=3;numOctaves=2;a4=440;notation=`sharp`;activeDetectedMidi=null;onNoteSelect;keyboardLayout=`dual`;showKeyHints=!0;heldKeyCodes=new Set;keyElements=new Map;indexElements=new Map;constructor(e,t,n){this.container=e,this.toneGen=t,n?.startOctave!==void 0&&(this.startOctave=n.startOctave),n?.numOctaves!==void 0&&(this.numOctaves=n.numOctaves),n?.a4!==void 0&&(this.a4=n.a4),n?.notation!==void 0&&(this.notation=n.notation),n?.defaultLayout&&(this.keyboardLayout=n.defaultLayout),this.render()}setOnNoteSelect(e){this.onNoteSelect=e}setA4(e){this.a4=e,this.render()}setNotation(e){this.notation=e,this.render()}setKeyboardLayout(e){this.keyboardLayout=e,this.render()}getKeyboardLayout(){return this.keyboardLayout}toggleKeyHints(e){this.showKeyHints=e===void 0?!this.showKeyHints:e,this.render()}shiftOctave(e){let t=this.startOctave+e;t>=1&&t<=6&&(this.startOctave=t,this.render())}getStartOctave(){return this.startOctave}highlightMidi(e){if(this.activeDetectedMidi!==null&&this.activeDetectedMidi!==e){let e=this.keyElements.get(this.activeDetectedMidi);e&&e.classList.remove(`mic-detected`)}if(this.activeDetectedMidi=e,e!==null){let t=this.keyElements.get(e);t&&t.classList.add(`mic-detected`)}}playNoteIndex(e){let t=this.indexElements.get(e);if(!t)return!1;let n=parseFloat(t.getAttribute(`data-freq`)||`0`),r=t.getAttribute(`data-note`)||``,i=parseInt(t.getAttribute(`data-octave`)||`0`,10);return this.toneGen.playNote(n,1.2),t.classList.add(`active-played`),this.onNoteSelect&&this.onNoteSelect(n,r,i),!0}handleKeyDown(e){if(e.repeat){let t=this.keyboardLayout===`dual`?f:m;return e.code in t||e.key in t}if(this.keyboardLayout===`garageband`){if(e.code===`KeyZ`||e.key===`z`||e.key===`Z`)return e.preventDefault(),this.shiftOctave(-1),!0;if(e.code===`KeyX`||e.key===`x`||e.key===`X`)return e.preventDefault(),this.shiftOctave(1),!0}if(e.code===`BracketLeft`||e.key===`[`||e.key===`ArrowLeft`||e.key===`ArrowDown`||e.key===`-`)return e.preventDefault(),this.shiftOctave(-1),!0;if(e.code===`BracketRight`||e.key===`]`||e.key===`ArrowRight`||e.key===`ArrowUp`||e.key===`+`||e.key===`=`)return e.preventDefault(),this.shiftOctave(1),!0;let t=this.keyboardLayout===`dual`?f:m,n;return e.code in t?n=t[e.code]:e.key in t&&(n=t[e.key]),n!==void 0&&(e.preventDefault(),this.heldKeyCodes.add(e.code),this.playNoteIndex(n))}handleKeyUp(e){this.heldKeyCodes.delete(e.code);let t=this.keyboardLayout===`dual`?f:m,n;if(e.code in t?n=t[e.code]:e.key in t&&(n=t[e.key]),n!==void 0){let e=this.indexElements.get(n);return e&&e.classList.remove(`active-played`),!0}return!1}render(){this.container.innerHTML=``,this.keyElements.clear(),this.indexElements.clear();let n=document.createElement(`div`);n.className=`piano-wrapper`;let r=document.createElement(`div`);r.className=`piano-toolbar`;let a=document.createElement(`div`);a.className=`piano-octave-controls`;let o=document.createElement(`button`);o.type=`button`,o.className=`btn-octave`,o.innerHTML=`&#9664; Octave Down <kbd class="kbd-hint">${this.keyboardLayout===`garageband`?`[Z]`:`[ [ ]`}</kbd>`,o.disabled=this.startOctave<=1,o.addEventListener(`click`,()=>this.shiftOctave(-1));let s=document.createElement(`span`);s.className=`piano-range-label`;let c=this.startOctave+this.numOctaves-1;s.textContent=`Range: C${this.startOctave} – B${c}`;let l=document.createElement(`button`);l.type=`button`,l.className=`btn-octave`,l.innerHTML=`Octave Up &#9654; <kbd class="kbd-hint">${this.keyboardLayout===`garageband`?`[X]`:`[ ] ]`}</kbd>`,l.disabled=this.startOctave>=6,l.addEventListener(`click`,()=>this.shiftOctave(1)),a.appendChild(o),a.appendChild(s),a.appendChild(l),r.appendChild(a);let u=document.createElement(`div`);u.className=`piano-layout-group`;let d=document.createElement(`div`);d.className=`layout-toggle-group`;let f=document.createElement(`button`);f.type=`button`,f.className=`btn-layout-toggle ${this.keyboardLayout===`dual`?`active`:``}`,f.textContent=`2 Full Octaves (Z-M / Q-I)`,f.title=`Lower octave on Z-M; Upper octave on Q-I with numbers 2-7 for sharps`,f.addEventListener(`click`,()=>this.setKeyboardLayout(`dual`));let m=document.createElement(`button`);m.type=`button`,m.className=`btn-layout-toggle ${this.keyboardLayout===`garageband`?`active`:``}`,m.textContent=`GarageBand (A-K / W-U)`,m.title=`White keys on A-K; Black keys on W-U; Octave shift on Z and X`,m.addEventListener(`click`,()=>this.setKeyboardLayout(`garageband`)),d.appendChild(f),d.appendChild(m),u.appendChild(d);let g=document.createElement(`label`);g.className=`key-hint-toggle-label`,g.innerHTML=`
      <input type="checkbox" ${this.showKeyHints?`checked`:``} />
      <span>Key Badges</span>
    `,g.querySelector(`input`)?.addEventListener(`change`,e=>{this.toggleKeyHints(e.target.checked)}),u.appendChild(g),r.appendChild(u),n.appendChild(r);let _=document.createElement(`div`);_.className=`piano-keyboard-guide`,_.innerHTML=`
      <div class="guide-item">
        <span class="guide-badge">🎹 Play Keys:</span>
        <span class="guide-text">${this.keyboardLayout===`dual`?`Row 1: <strong>Z–M</strong> (White) + <strong>S D G H J</strong> (Black) &bull; Row 2: <strong>Q–I</strong> (White) + <strong>2 3 5 6 7</strong> (Black)`:`White Keys: <strong>A–K</strong> &bull; Black Keys: <strong>W E T Y U O P</strong> &bull; Octave Down: <strong>Z</strong> &bull; Octave Up: <strong>X</strong>`}</span>
      </div>
      <div class="guide-item">
        <span class="guide-badge">🔄 Octave Shift:</span>
        <span class="guide-text">${this.keyboardLayout===`dual`?`Press <strong>[</strong> and <strong>]</strong> (or <strong>◀</strong> / <strong>▶</strong> arrows)`:`Press <strong>Z</strong> / <strong>X</strong> or <strong>[</strong> / <strong>]</strong>`}</span>
      </div>
    `,n.appendChild(_);let v=document.createElement(`div`);v.className=`piano-keys-bed`,v.setAttribute(`role`,`region`),v.setAttribute(`aria-label`,`Interactive Piano Roll`);let y=this.numOctaves*12+1,b=this.keyboardLayout===`dual`?p:h;for(let n=0;n<y;n++){let r=n%12,a=this.startOctave+Math.floor(n/12),o=[1,3,6,8,10].includes(r),s=(a+1)*12+r,c=i(r,a,this.a4),l=this.notation===`flat`?t[r]:e[r],u=`${l}${a}`,d=b[n]||``,f=document.createElement(`button`);if(f.type=`button`,f.className=o?`piano-key black-key`:`piano-key white-key`,f.setAttribute(`data-midi`,String(s)),f.setAttribute(`data-index`,String(n)),f.setAttribute(`data-freq`,c.toFixed(1)),f.setAttribute(`data-note`,l),f.setAttribute(`data-octave`,String(a)),f.setAttribute(`aria-label`,`${u} (${c.toFixed(1)} Hz) [Key: ${d}]`),f.setAttribute(`tabindex`,`0`),this.showKeyHints&&d){let e=document.createElement(`span`);e.className=`key-binding-hint`,e.textContent=d,f.appendChild(e)}let p=document.createElement(`span`);p.className=`key-label`,p.textContent=u,f.appendChild(p);let m=e=>{e.preventDefault(),this.playNoteIndex(n),setTimeout(()=>f.classList.remove(`active-played`),300)};f.addEventListener(`pointerdown`,m),f.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&m(e)}),this.keyElements.set(s,f),this.indexElements.set(n,f),v.appendChild(f)}n.appendChild(v),this.container.appendChild(n)}},_=class{container;options;noteLetterEl;noteOctaveEl;centsEl;freqEl;meterBarEl;statusBadgeEl;comparisonEl;constructor(e,t={}){this.container=e,this.options=t,this.render()}update(e,t,n){if(!e||!e.note||e.frequency<=0){this.resetUI();return}let r=e.note;this.noteLetterEl.textContent=`${r.noteName}`,this.noteOctaveEl.textContent=`${r.octave}`;let i=r.cents>0?`+`:``;this.centsEl.textContent=`${i}${r.cents}¢`,this.freqEl.textContent=`${r.frequency.toFixed(1)} Hz`;let a=(Math.max(-50,Math.min(50,r.cents))+50)/100*100;this.meterBarEl.style.left=`${a}%`;let o=Math.abs(r.cents);if(this.statusBadgeEl.className=`mini-status-badge`,this.meterBarEl.className=`mini-meter-needle`,o<=3?(this.statusBadgeEl.classList.add(`in-tune`),this.statusBadgeEl.textContent=`✓ IN TUNE`,this.meterBarEl.classList.add(`in-tune`)):o<=8?(this.statusBadgeEl.classList.add(`close`),this.statusBadgeEl.textContent=r.cents<0?`▲ SLIGHTLY FLAT`:`▼ SLIGHTLY SHARP`,this.meterBarEl.classList.add(`close`)):r.cents<0?(this.statusBadgeEl.classList.add(`flat`),this.statusBadgeEl.textContent=`▲ TUNE UP (${Math.abs(r.cents)}¢)`,this.meterBarEl.classList.add(`flat`)):(this.statusBadgeEl.classList.add(`sharp`),this.statusBadgeEl.textContent=`▼ TUNE DOWN (+${r.cents}¢)`,this.meterBarEl.classList.add(`sharp`)),this.comparisonEl&&t&&t>0){let r=Math.round(1200*Math.log2(e.frequency/t)),i=Math.abs(r);if(i<=3)this.comparisonEl.innerHTML=`
          <span class="match-badge in-tune">🎯 Tone Matched!</span>
          <span>Target: <strong>${n||``} (${t.toFixed(1)} Hz)</strong></span>
        `;else{let e=r<0?`▲ Sing higher (${Math.abs(r)}¢ flat)`:`▼ Sing lower (+${r}¢ sharp)`;this.comparisonEl.innerHTML=`
          <span class="match-badge ${i<=10?`close`:`off`}">${e}</span>
          <span>Target: <strong>${n||``} (${t.toFixed(1)} Hz)</strong></span>
        `}}}resetUI(){this.noteLetterEl.textContent=`-`,this.noteOctaveEl.textContent=``,this.centsEl.textContent=`0¢`,this.freqEl.textContent=`0.0 Hz`,this.meterBarEl.style.left=`50%`,this.meterBarEl.className=`mini-meter-needle`,this.statusBadgeEl.className=`mini-status-badge`,this.statusBadgeEl.textContent=`Listening...`,this.comparisonEl&&(this.comparisonEl.innerHTML=`<span style="color: var(--text-muted);">Sing or play to match tone...</span>`)}render(){let e=this.options.label||`Live Pitch Monitor`;this.container.innerHTML=`
      <div class="mini-tuner-card ${this.options.compact?`compact`:``}">
        <div class="mini-tuner-top">
          <span class="mini-tuner-title">🎤 ${e}</span>
          <span class="mini-status-badge" id="mini-status">Listening...</span>
        </div>

        <div class="mini-tuner-body">
          <div class="mini-note-display">
            <span class="mini-note-letter" id="mini-note-letter">-</span>
            <span class="mini-note-octave" id="mini-note-octave"></span>
          </div>

          <div class="mini-gauge-track-wrap">
            <div class="mini-gauge-track">
              <div class="mini-safe-band"></div>
              <div class="mini-center-tick"></div>
              <div class="mini-meter-needle" id="mini-needle"></div>
            </div>
            <div class="mini-gauge-labels">
              <span>-50¢</span>
              <span>0¢</span>
              <span>+50¢</span>
            </div>
          </div>

          <div class="mini-stats">
            <span class="mini-cents" id="mini-cents">0¢</span>
            <span class="mini-freq" id="mini-freq">0.0 Hz</span>
          </div>
        </div>

        ${this.options.showReferenceComparison?`<div class="mini-comparison-bar" id="mini-comparison">
                 <span style="color: var(--text-muted);">Sing or play to match tone...</span>
               </div>`:``}
      </div>
    `,this.noteLetterEl=this.container.querySelector(`#mini-note-letter`),this.noteOctaveEl=this.container.querySelector(`#mini-note-octave`),this.centsEl=this.container.querySelector(`#mini-cents`),this.freqEl=this.container.querySelector(`#mini-freq`),this.meterBarEl=this.container.querySelector(`#mini-needle`),this.statusBadgeEl=this.container.querySelector(`#mini-status`),this.options.showReferenceComparison&&(this.comparisonEl=this.container.querySelector(`#mini-comparison`))}},v=class{container;toneGen;a4=440;targetNoteIndex=9;targetOctave=4;targetFreq=440;matchHoldStartTime=null;streak=0;isMatched=!1;targetNoteDisplay;targetFreqDisplay;statusText;matchRingProgress;streakBadge;miniTuner;constructor(e,t,n=440){this.container=e,this.toneGen=t,this.a4=n,this.updateTargetFreq(),this.render()}setA4(e){this.a4=e,this.updateTargetFreq(),this.updateUI()}updateTargetFreq(){this.targetFreq=i(this.targetNoteIndex,this.targetOctave,this.a4)}setTarget(e,t){this.targetNoteIndex=e,this.targetOctave=t,this.updateTargetFreq(),this.resetMatch(),this.updateUI()}randomTarget(){let e=Math.floor(Math.random()*22);this.targetNoteIndex=e%12,this.targetOctave=3+Math.floor(e/12),this.updateTargetFreq(),this.resetMatch(),this.updateUI(),this.playTargetTone()}playTargetTone(){this.toneGen.playNote(this.targetFreq,1.8,`acoustic`)}toggleTargetDrone(){this.toneGen.isDronePlaying()?this.toneGen.stopDrone():this.toneGen.startDrone(this.targetFreq,`sine`)}resetMatch(){this.matchHoldStartTime=null,this.isMatched=!1,this.matchRingProgress&&(this.matchRingProgress.style.strokeDashoffset=`283`),this.statusText&&(this.statusText.textContent=`Sing or play into the mic to match...`,this.statusText.className=`trainer-status-text`)}updatePitch(t){let n=`${e[this.targetNoteIndex]}${this.targetOctave}`;this.miniTuner&&this.miniTuner.update(t,this.targetFreq,n);let r=t?.note;if(!r||r.frequency<=0){this.resetMatch();return}let i=(this.targetOctave+1)*12+this.targetNoteIndex,a=r.midi-i,o=a*100,s=Math.abs(o);if(s<=7){let e=performance.now();this.matchHoldStartTime||=e;let t=e-this.matchHoldStartTime,n=Math.min(1,t/700),i=283*(1-n);this.matchRingProgress.style.strokeDashoffset=`${i}`,n>=1&&!this.isMatched?(this.isMatched=!0,this.streak++,this.statusText.textContent=`🎯 Excellent! Pitch Matched (${r.cents>0?`+`:``}${r.cents}¢)`,this.statusText.className=`trainer-status-text matched`,this.streakBadge.textContent=`Streak: ${this.streak} 🔥`,this.toneGen.playNote(this.targetFreq*2,.4,`sine`),setTimeout(()=>{this.isMatched&&this.randomTarget()},1400)):this.isMatched||(this.statusText.textContent=`Holding steady... ${(n*100).toFixed(0)}%`,this.statusText.className=`trainer-status-text holding`)}else this.matchHoldStartTime=null,this.matchRingProgress.style.strokeDashoffset=`283`,Math.abs(a)>2?this.statusText.textContent=`Heard: ${r.noteName}${r.octave} (${r.frequency} Hz)`:o>0?this.statusText.textContent=`Too Sharp (+${Math.round(s)}¢) — lower your pitch`:this.statusText.textContent=`Too Flat (-${Math.round(s)}¢) — raise your pitch`,this.statusText.className=`trainer-status-text`}updateUI(){let t=e[this.targetNoteIndex];this.targetNoteDisplay&&(this.targetNoteDisplay.textContent=`${t}${this.targetOctave}`),this.targetFreqDisplay&&(this.targetFreqDisplay.textContent=`${this.targetFreq.toFixed(1)} Hz`)}render(){this.container.innerHTML=`
      <div class="trainer-card">
        <div class="trainer-header">
          <div class="trainer-title-wrap">
            <h3>Pitch Match Trainer</h3>
            <p class="trainer-subtitle">Listen to the target note, then sing or play into your mic to match it.</p>
          </div>
          <span class="trainer-streak-badge" id="trainer-streak">Streak: ${this.streak} 🔥</span>
        </div>

        <div class="trainer-target-area">
          <div class="trainer-ring-container">
            <svg class="trainer-match-ring" viewBox="0 0 100 100" width="120" height="120">
              <circle cx="50" cy="50" r="45" class="ring-bg"></circle>
              <circle cx="50" cy="50" r="45" class="ring-progress" id="trainer-ring-prog"></circle>
            </svg>
            <div class="trainer-note-center">
              <span class="trainer-note-name" id="trainer-note-name">${e[this.targetNoteIndex]}${this.targetOctave}</span>
              <span class="trainer-note-freq" id="trainer-note-freq">${this.targetFreq.toFixed(1)} Hz</span>
            </div>
          </div>

          <div class="trainer-actions">
            <button type="button" class="btn-trainer btn-play-target" id="btn-play-target">
              <span class="btn-icon">🔊</span> Play Reference Tone
            </button>
            <button type="button" class="btn-trainer btn-drone-target" id="btn-drone-target">
              <span class="btn-icon">〰️</span> Toggle Continuous Drone
            </button>
            <button type="button" class="btn-trainer btn-new-target" id="btn-new-target">
              <span class="btn-icon">🎲</span> New Random Note
            </button>
          </div>
        </div>

        <div class="trainer-feedback">
          <div class="trainer-status-text" id="trainer-status">Sing or play into the mic to match...</div>
        </div>

        <div id="trainer-mini-tuner" style="margin-top: 0.75rem;"></div>
      </div>
    `,this.targetNoteDisplay=this.container.querySelector(`#trainer-note-name`),this.targetFreqDisplay=this.container.querySelector(`#trainer-note-freq`),this.statusText=this.container.querySelector(`#trainer-status`),this.matchRingProgress=this.container.querySelector(`#trainer-ring-prog`),this.streakBadge=this.container.querySelector(`#trainer-streak`);let t=this.container.querySelector(`#trainer-mini-tuner`);this.miniTuner=new _(t,{label:`Live Pitch Monitor (Trainer)`,showReferenceComparison:!1,compact:!0}),this.container.querySelector(`#btn-play-target`)?.addEventListener(`click`,()=>this.playTargetTone()),this.container.querySelector(`#btn-drone-target`)?.addEventListener(`click`,()=>this.toggleTargetDrone()),this.container.querySelector(`#btn-new-target`)?.addEventListener(`click`,()=>this.randomTarget())}},y={treble:{name:`Treble Clef`,symbol:`𝄞`,bottomLineStep:30,referenceDescription:`Standard for voice, guitar, violin, flute, right-hand piano`},bass:{name:`Bass Clef`,symbol:`𝄢`,bottomLineStep:18,referenceDescription:`Standard for bass guitar, cello, trombone, left-hand piano`},alto:{name:`Alto Clef`,symbol:`𝄡`,bottomLineStep:24,referenceDescription:`Standard for viola and alto trombone`},tenor:{name:`Tenor Clef`,symbol:`𝄡`,bottomLineStep:22,referenceDescription:`Standard for upper cello, bassoon, and tenor trombone`}},b=[`C`,`D`,`E`,`F`,`G`,`A`,`B`],x={C:0,D:2,E:4,F:5,G:7,A:9,B:11},S={whole:4,half:2,quarter:1,eighth:.5,sixteenth:.25},C=class{container;toneGen;a4;activeClef=`treble`;timeSigTop=4;timeSigBottom=4;activeAccidental=``;activeDuration=`quarter`;placedNotes=[];selectedNoteIndex=null;tempoBpm=100;isPlayingSequence=!1;playbackTimeoutId=null;activePlayingNoteIndex=null;enableMetronome=!0;showMicIndicator=!0;svgEl;ghostGroupEl;notesGroupEl;micIndicatorGroupEl;miniTuner;tempoLabelEl;tempoSliderEl;playBtnEl;selectionStatusEl;staffLeft=120;staffRight=770;line1Y=144;stepHeight=8;constructor(e,t,n=440){this.container=e,this.toneGen=t,this.a4=n,this.render()}setA4(e){this.a4=e;for(let e of this.placedNotes)e.freq=a(e.midi,this.a4);this.renderNotes()}setClef(e){this.activeClef=e,this.render()}setTimeSignature(e,t){this.timeSigTop=Math.max(1,Math.min(32,Math.round(e))),this.timeSigBottom=Math.max(1,Math.min(32,Math.round(t))),this.render()}getTimeSignature(){return{top:this.timeSigTop,bottom:this.timeSigBottom}}getBeatsPerMeasure(){return this.timeSigTop*(4/this.timeSigBottom)}setDuration(e){if(this.activeDuration=e,this.selectedNoteIndex!==null&&this.placedNotes[this.selectedNoteIndex]){let t=this.placedNotes[this.selectedNoteIndex];t.duration=e,t.beats=S[e],this.renderNotes(),this.updateSelectionStatus()}}setAccidental(e){if(this.activeAccidental=e,this.selectedNoteIndex!==null&&this.placedNotes[this.selectedNoteIndex]){let t=this.placedNotes[this.selectedNoteIndex];t.accidental=e;let{midi:n,freq:r}=this.stepToNoteInfo(t.diatonicStep,e);t.midi=n,t.freq=r,this.renderNotes(),this.updateSelectionStatus()}}updatePitch(e){if(this.miniTuner&&this.miniTuner.update(e),!this.showMicIndicator||!this.micIndicatorGroupEl)return;if(!e||!e.note||e.frequency<=0){this.micIndicatorGroupEl.style.display=`none`;return}let t=e.note,n=t.noteName[0],r=b.indexOf(n);if(r===-1)return;let i=t.octave*7+r-y[this.activeClef].bottomLineStep,a=this.line1Y-i*this.stepHeight;this.micIndicatorGroupEl.style.display=`block`,this.micIndicatorGroupEl.innerHTML=`
      <circle cx="70" cy="${a}" r="11" fill="rgba(16, 185, 129, 0.25)" class="mic-halo-pulse" />
      <circle cx="70" cy="${a}" r="6.5" fill="#10b981" stroke="#fff" stroke-width="1.8" />
      <text x="82" y="${a+4}" font-size="11" font-weight="700" fill="#10b981" font-family="monospace">
        ${t.noteName}${t.octave} ${t.cents>0?`+`:``}${t.cents}¢
      </text>
      ${this.renderLedgerLines(70,i)}
    `}stepToY(e){let t=e-y[this.activeClef].bottomLineStep;return this.line1Y-t*this.stepHeight}yToStep(e){let t=y[this.activeClef],n=Math.round((this.line1Y-e)/this.stepHeight);return t.bottomLineStep+n}stepToNoteInfo(e,t){let n=Math.floor(e/7),r=b[(e%7+7)%7],i=x[r];t===`#`&&(i+=1),t===`b`&&--i;let o=(n+1)*12+i;return{octave:n,baseLetter:r,midi:o,freq:a(o,this.a4)}}addNoteAtStep(e){if(this.placedNotes.length>=20){alert(`Staff has reached maximum notes (20 notes). Clear or delete notes to add more.`);return}let{octave:t,baseLetter:n,midi:r,freq:i}=this.stepToNoteInfo(e,this.activeAccidental),a={id:`note_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,diatonicStep:e,baseLetter:n,accidental:this.activeAccidental,octave:t,midi:r,freq:i,duration:this.activeDuration,beats:S[this.activeDuration]};this.placedNotes.push(a),this.selectedNoteIndex=this.placedNotes.length-1,this.toneGen.playNote(i,.8,`acoustic`),this.renderNotes(),this.updateSelectionStatus()}removeLastNote(){this.placedNotes.length>0&&(this.placedNotes.pop(),this.selectedNoteIndex!==null&&this.selectedNoteIndex>=this.placedNotes.length&&(this.selectedNoteIndex=null),this.renderNotes(),this.updateSelectionStatus())}clearNotes(){this.stopPlayback(),this.placedNotes=[],this.selectedNoteIndex=null,this.renderNotes(),this.updateSelectionStatus()}loadExampleMelody(){if(this.stopPlayback(),this.placedNotes=[],this.selectedNoteIndex=null,this.activeClef===`treble`){if(this.timeSigTop===3){let e=[28,30,32,33,32,30,28,32,35],t=[`half`,`quarter`,`half`,`quarter`,`quarter`,`quarter`,`quarter`,`half`,`quarter`];e.forEach((e,n)=>{let{octave:r,baseLetter:i,midi:a,freq:o}=this.stepToNoteInfo(e,``),s=t[n]||`quarter`;this.placedNotes.push({id:`ex_${n}`,diatonicStep:e,baseLetter:i,accidental:``,octave:r,midi:a,freq:o,duration:s,beats:S[s]})})}else[32,32,33,34,34,33,32,31,30,30,31,32,32,31,31].slice(0,12).forEach((e,t)=>{let{octave:n,baseLetter:r,midi:i,freq:a}=this.stepToNoteInfo(e,``),o=t===11?`half`:`quarter`;this.placedNotes.push({id:`ex_${t}`,diatonicStep:e,baseLetter:r,accidental:``,octave:n,midi:i,freq:a,duration:o,beats:S[o]})})}else{let e=y[this.activeClef].bottomLineStep;[0,2,4,7,9,7,4,0].forEach((t,n)=>{let r=e+t,{octave:i,baseLetter:a,midi:o,freq:s}=this.stepToNoteInfo(r,``);this.placedNotes.push({id:`ex_${n}`,diatonicStep:r,baseLetter:a,accidental:``,octave:i,midi:o,freq:s,duration:`quarter`,beats:1})})}this.renderNotes(),this.updateSelectionStatus()}startPlayback(){if(this.placedNotes.length===0)return;this.isPlayingSequence=!0,this.playBtnEl.innerHTML=`<span>⏹️</span> Stop`,this.playBtnEl.classList.add(`active`);let e=0,t=60/this.tempoBpm,n=()=>{if(!this.isPlayingSequence)return;if(e>=this.placedNotes.length){this.stopPlayback();return}let r=this.placedNotes[e];this.activePlayingNoteIndex=e,this.renderNotes();let i=r.beats*t;if(this.enableMetronome){let t=e===0||this.isMeasureBoundary(e)?1100:750;this.toneGen.playNote(t,.035,`sine`)}this.toneGen.playNote(r.freq,Math.max(.1,i*.92),`acoustic`),e++,this.playbackTimeoutId=window.setTimeout(n,i*1e3)};n()}isMeasureBoundary(e){let t=this.getBeatsPerMeasure(),n=0;for(let t=0;t<e;t++)n+=this.placedNotes[t].beats;return n>0&&Math.abs(n%t)<.01}stopPlayback(){this.isPlayingSequence=!1,this.playbackTimeoutId!==null&&(clearTimeout(this.playbackTimeoutId),this.playbackTimeoutId=null),this.activePlayingNoteIndex=null,this.playBtnEl&&(this.playBtnEl.innerHTML=`<span>▶️</span> Play Melody`,this.playBtnEl.classList.remove(`active`)),this.renderNotes()}updateSelectionStatus(){if(this.selectionStatusEl){if(this.selectedNoteIndex!==null&&this.placedNotes[this.selectedNoteIndex]){let e=this.placedNotes[this.selectedNoteIndex];this.selectionStatusEl.innerHTML=`
        <div class="note-selected-pill">
          <span>🎯 Note ${this.selectedNoteIndex+1}: <strong>${e.baseLetter}${e.accidental}${e.octave}</strong> (${e.duration}, ${e.beats} beat${e.beats===1?``:`s`})</span>
          <span class="selection-action-tip">👉 Click Duration or Accidental buttons above to edit timing in-place.</span>
          <button type="button" class="btn-deselect-note" id="btn-deselect-note" title="Deselect note">✕</button>
        </div>
      `,this.selectionStatusEl.querySelector(`#btn-deselect-note`)?.addEventListener(`click`,()=>{this.selectedNoteIndex=null,this.renderNotes(),this.updateSelectionStatus()})}else this.selectionStatusEl.innerHTML=``}}renderLedgerLines(e,t){let n=``;if(t<=-2)for(let r=-2;r>=t;r-=2){let t=this.line1Y-r*this.stepHeight;n+=`<line x1="${e-14}" y1="${t}" x2="${e+14}" y2="${t}" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.8" />`}if(t>=10)for(let r=10;r<=t;r+=2){let t=this.line1Y-r*this.stepHeight;n+=`<line x1="${e-14}" y1="${t}" x2="${e+14}" y2="${t}" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.8" />`}return n}renderNotes(){if(!this.notesGroupEl)return;this.notesGroupEl.innerHTML=``;let e=this.placedNotes.length;if(e===0)return;let t=this.staffRight-this.staffLeft-40,n=e>1?Math.min(52,t/e):60,r=this.getBeatsPerMeasure(),i=0,a=1;this.placedNotes.forEach((t,o)=>{let s=this.staffLeft+35+o*n,c=this.stepToY(t.diatonicStep),l=y[this.activeClef],u=t.diatonicStep-l.bottomLineStep,d=u<4,f=d?s+6.5:s-6.5,p=d?c-36:c+36,m=o===this.activePlayingNoteIndex,h=o===this.selectedNoteIndex,g=`#f8fafc`;m?g=`#10b981`:h&&(g=`#38bdf8`);let _=m?`filter: drop-shadow(0 0 10px #10b981);`:h?`filter: drop-shadow(0 0 8px #38bdf8);`:``,v=t.duration===`whole`||t.duration===`half`,b=t.duration!==`whole`,x=``;t.accidental===`#`&&(x=`♯`),t.accidental===`b`&&(x=`♭`);let S=document.createElementNS(`http://www.w3.org/2000/svg`,`g`);S.setAttribute(`class`,`placed-note-group ${m?`playing`:``} ${h?`selected`:``}`),S.setAttribute(`data-idx`,String(o)),S.style.cursor=`pointer`;let C=``;if(t.duration===`eighth`&&b?C=d?`<path d="M ${f} ${p} Q ${f+10} ${p+10} ${f+8} ${p+20}" stroke="${g}" stroke-width="2" fill="none" />`:`<path d="M ${f} ${p} Q ${f+10} ${p-10} ${f+8} ${p-20}" stroke="${g}" stroke-width="2" fill="none" />`:t.duration===`sixteenth`&&b&&(C=d?`
            <path d="M ${f} ${p} Q ${f+10} ${p+8} ${f+8} ${p+16}" stroke="${g}" stroke-width="2" fill="none" />
            <path d="M ${f} ${p+7} Q ${f+10} ${p+15} ${f+8} ${p+23}" stroke="${g}" stroke-width="2" fill="none" />
          `:`
            <path d="M ${f} ${p} Q ${f+10} ${p-8} ${f+8} ${p-16}" stroke="${g}" stroke-width="2" fill="none" />
            <path d="M ${f} ${p-7} Q ${f+10} ${p-15} ${f+8} ${p-23}" stroke="${g}" stroke-width="2" fill="none" />
          `),S.innerHTML=`
        <!-- Click target hitbox -->
        <rect x="${s-18}" y="${Math.min(c,p)-10}" width="36" height="61" fill="transparent" />

        <!-- Selection Halo Ring -->
        ${h?`<circle cx="${s}" cy="${c}" r="14" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 2" />`:``}

        <!-- Ledger lines -->
        ${this.renderLedgerLines(s,u)}

        <!-- Accidental -->
        ${x?`<text x="${s-17}" y="${c+5}" font-size="16" font-weight="700" fill="${g}">${x}</text>`:``}

        <!-- Notehead -->
        <ellipse cx="${s}" cy="${c}" rx="7.2" ry="5.4"
          transform="rotate(-22 ${s} ${c})"
          fill="${v?`#020617`:g}"
          stroke="${g}"
          stroke-width="${v?`2.5`:`0`}"
          style="${_}"
        />

        <!-- Stem -->
        ${b?`<line x1="${f}" y1="${c}" x2="${f}" y2="${p}" stroke="${g}" stroke-width="1.8" />`:``}

        <!-- Flags -->
        ${C}

        <!-- Pitch & Duration Label below -->
        <text x="${s}" y="206" font-size="10" font-weight="700" fill="${g}" text-anchor="middle" font-family="monospace">
          ${t.baseLetter}${t.accidental}${t.octave}
        </text>
        <text x="${s}" y="218" font-size="9" font-weight="600" fill="var(--text-muted)" text-anchor="middle">
          ${t.duration}
        </text>

        <!-- Delete button on hover -->
        <circle cx="${s}" cy="230" r="6.5" fill="#ef4444" class="note-delete-btn" />
        <text x="${s}" y="233" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">&times;</text>
      `,S.addEventListener(`click`,e=>{e.target.classList.contains(`note-delete-btn`)?(e.stopPropagation(),this.placedNotes.splice(o,1),this.selectedNoteIndex===o?this.selectedNoteIndex=null:this.selectedNoteIndex!==null&&this.selectedNoteIndex>o&&this.selectedNoteIndex--,this.renderNotes(),this.updateSelectionStatus()):(e.stopPropagation(),this.selectedNoteIndex=o,this.toneGen.playNote(t.freq,.8,`acoustic`),this.renderNotes(),this.updateSelectionStatus())}),this.notesGroupEl.appendChild(S),i+=t.beats,o<e-1&&i>=r-.001){let e=s+n/2,t=document.createElementNS(`http://www.w3.org/2000/svg`,`g`);t.innerHTML=`
          <line x1="${e}" y1="80" x2="${e}" y2="144" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
          <text x="${e+4}" y="74" font-size="9" font-weight="bold" fill="var(--text-muted)">m.${a+1}</text>
        `,this.notesGroupEl.appendChild(t),a++,i=0}})}render(){let e=y[this.activeClef],t=this.getBeatsPerMeasure(),n=t%1==0?t:t.toFixed(2);this.container.innerHTML=`
      <div class="sheet-music-card">
        <!-- Tab Header with Clef and Instructions -->
        <div class="sheet-header">
          <div class="sheet-title-wrap">
            <h2>Interactive Sheet Music Staff</h2>
            <p>Pick clef, set any custom time signature (top & bottom pieces), place notes on staff lines, and edit timing in-place.</p>
          </div>

          <!-- Embedded Live Pitch Monitor -->
          <div id="sheet-mini-tuner" style="width: 100%; max-width: 440px;"></div>
        </div>

        <!-- Controls Toolbar -->
        <div class="sheet-toolbar">
          <!-- 1. Clef Selector -->
          <div class="toolbar-group">
            <span class="group-label">Clef:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeClef===`treble`?`active`:``}" data-clef="treble" title="Treble Clef (G-Clef)">
                𝄞 Treble
              </button>
              <button type="button" class="pill-btn ${this.activeClef===`bass`?`active`:``}" data-clef="bass" title="Bass Clef (F-Clef)">
                𝄢 Bass
              </button>
              <button type="button" class="pill-btn ${this.activeClef===`alto`?`active`:``}" data-clef="alto" title="Alto Clef (C-Clef)">
                𝄡 Alto
              </button>
              <button type="button" class="pill-btn ${this.activeClef===`tenor`?`active`:``}" data-clef="tenor" title="Tenor Clef (C-Clef)">
                𝄡 Tenor
              </button>
            </div>
          </div>

          <!-- 2. Time Signature: Separate Top & Bottom Piece Selectors -->
          <div class="toolbar-group time-sig-custom-group">
            <span class="group-label">Time Signature:</span>
            <div class="time-sig-fraction-box">
              <!-- Top piece (Count / Beats per Measure) -->
              <div class="time-sig-piece" title="Top Number: Number of beats per measure">
                <span class="sig-piece-label">Beats</span>
                <div class="sig-stepper-wrap">
                  <button type="button" class="btn-sig-step" id="btn-sig-top-minus" title="Decrease beats per measure">-</button>
                  <input type="number" id="time-sig-top-input" min="1" max="32" value="${this.timeSigTop}" class="sig-num-input" aria-label="Beats per measure" />
                  <button type="button" class="btn-sig-step" id="btn-sig-top-plus" title="Increase beats per measure">+</button>
                </div>
              </div>

              <span class="time-sig-fraction-slash">/</span>

              <!-- Bottom piece (Beat Unit note value) -->
              <div class="time-sig-piece" title="Bottom Number: Note value that gets 1 beat">
                <span class="sig-piece-label">Note Value</span>
                <select id="time-sig-bottom-select" class="sig-unit-select" aria-label="Beat unit note value">
                  <option value="1" ${this.timeSigBottom===1?`selected`:``}>1 (Whole)</option>
                  <option value="2" ${this.timeSigBottom===2?`selected`:``}>2 (Half)</option>
                  <option value="4" ${this.timeSigBottom===4?`selected`:``}>4 (Quarter)</option>
                  <option value="8" ${this.timeSigBottom===8?`selected`:``}>8 (Eighth)</option>
                  <option value="16" ${this.timeSigBottom===16?`selected`:``}>16 (Sixteenth)</option>
                  <option value="32" ${this.timeSigBottom===32?`selected`:``}>32 (Thirty-second)</option>
                </select>
              </div>
            </div>

            <!-- Quick Presets -->
            <div class="time-sig-quick-pills">
              <button type="button" class="mini-pill-btn ${this.timeSigTop===4&&this.timeSigBottom===4?`active`:``}" data-preset-top="4" data-preset-bottom="4">4/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop===3&&this.timeSigBottom===4?`active`:``}" data-preset-top="3" data-preset-bottom="4">3/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop===2&&this.timeSigBottom===4?`active`:``}" data-preset-top="2" data-preset-bottom="4">2/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop===6&&this.timeSigBottom===8?`active`:``}" data-preset-top="6" data-preset-bottom="8">6/8</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop===5&&this.timeSigBottom===4?`active`:``}" data-preset-top="5" data-preset-bottom="4">5/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop===7&&this.timeSigBottom===8?`active`:``}" data-preset-top="7" data-preset-bottom="8">7/8</button>
            </div>
          </div>

          <!-- 3. Note Duration / Timing -->
          <div class="toolbar-group">
            <span class="group-label">Note Timing:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeDuration===`quarter`?`active`:``}" data-duration="quarter" title="Quarter Note (1 beat)">
                ♩ Quarter (1b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration===`half`?`active`:``}" data-duration="half" title="Half Note (2 beats)">
                𝅗𝅥 Half (2b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration===`whole`?`active`:``}" data-duration="whole" title="Whole Note (4 beats)">
                𝅝 Whole (4b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration===`eighth`?`active`:``}" data-duration="eighth" title="Eighth Note (0.5 beat)">
                ♪ 8th (0.5b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration===`sixteenth`?`active`:``}" data-duration="sixteenth" title="Sixteenth Note (0.25 beat)">
                𝅘𝅥𝅯 16th (0.25b)
              </button>
            </div>
          </div>

          <!-- 4. Accidental Selector -->
          <div class="toolbar-group">
            <span class="group-label">Pitch:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeAccidental===``?`active`:``}" data-accidental="" title="Natural">
                ♮ Natural
              </button>
              <button type="button" class="pill-btn ${this.activeAccidental===`#`?`active`:``}" data-accidental="#" title="Sharp">
                ♯ Sharp
              </button>
              <button type="button" class="pill-btn ${this.activeAccidental===`b`?`active`:``}" data-accidental="b" title="Flat">
                ♭ Flat
              </button>
            </div>
          </div>

          <!-- 5. Playback and Actions -->
          <div class="toolbar-group">
            <div class="playback-actions">
              <button type="button" class="btn-sheet-play" id="btn-sheet-play">
                <span>▶️</span> Play Melody
              </button>
              <button type="button" class="btn-sheet-action" id="btn-sheet-undo" title="Undo last note">
                <span>↩️</span> Undo
              </button>
              <button type="button" class="btn-sheet-action" id="btn-sheet-clear" title="Clear all notes">
                <span>🗑️</span> Clear
              </button>
              <button type="button" class="btn-sheet-action" id="btn-sheet-example" title="Load example melody">
                <span>🎲</span> Example
              </button>
            </div>
          </div>
        </div>

        <!-- Note Selection Timing Status Bar -->
        <div id="sheet-selection-status"></div>

        <!-- Tempo & Timing Options Strip -->
        <div class="sheet-options-strip">
          <div class="tempo-control-wrap">
            <label for="sheet-tempo-slider">Playback Tempo:</label>
            <input type="range" id="sheet-tempo-slider" min="40" max="220" step="5" value="${this.tempoBpm}" />
            <span class="value-text" id="sheet-tempo-val">${this.tempoBpm} BPM</span>
          </div>

          <label class="sheet-checkbox-label" title="Play audible woodblock click on beats during playback">
            <input type="checkbox" id="sheet-metronome-toggle" ${this.enableMetronome?`checked`:``} />
            <span>🥁 Metronome Beat Click</span>
          </label>

          <label class="sheet-checkbox-label">
            <input type="checkbox" id="sheet-mic-toggle" ${this.showMicIndicator?`checked`:``} />
            <span>🎤 Live Mic Pitch on Staff</span>
          </label>

          <span class="sheet-clef-desc">
            <strong>${e.name} • ${this.timeSigTop}/${this.timeSigBottom} Time</strong> (${n} beats/measure)
          </span>
        </div>

        <!-- SVG Sheet Music Canvas -->
        <div class="sheet-svg-wrapper">
          <svg class="staff-svg" id="staff-svg" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid meet">
            <!-- Background Glow for Staff Area -->
            <rect x="20" y="20" width="760" height="200" rx="10" fill="#040814" stroke="rgba(255, 255, 255, 0.08)" />

            <!-- The 5 Staff Lines -->
            <line x1="${this.staffLeft-50}" y1="80" x2="${this.staffRight}" y2="80" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft-50}" y1="96" x2="${this.staffRight}" y2="96" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft-50}" y1="112" x2="${this.staffRight}" y2="112" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft-50}" y1="128" x2="${this.staffRight}" y2="128" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft-50}" y1="144" x2="${this.staffRight}" y2="144" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />

            <!-- Start & End Vertical Bar Lines -->
            <line x1="${this.staffLeft-50}" y1="80" x2="${this.staffLeft-50}" y2="144" stroke="rgba(255, 255, 255, 0.7)" stroke-width="2.5" />
            <line x1="${this.staffRight}" y1="80" x2="${this.staffRight}" y2="144" stroke="rgba(255, 255, 255, 0.7)" stroke-width="2.5" />
            <line x1="${this.staffRight-6}" y1="80" x2="${this.staffRight-6}" y2="144" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1.5" />

            <!-- Clef Symbol -->
            <text x="${this.staffLeft-38}" y="${this.activeClef===`treble`?142:this.activeClef===`bass`?134:124}"
              font-size="${this.activeClef===`treble`?`68`:`52`}"
              fill="#38bdf8"
              font-weight="bold"
              pointer-events="none"
              style="user-select: none;">
              ${e.symbol}
            </text>

            <!-- Dynamic Time Signature (Top / Bottom Numbers) -->
            <text x="${this.staffLeft+2}" y="108" font-size="${this.timeSigTop>9?`18`:`22`}" font-weight="900" fill="#38bdf8" text-anchor="middle" pointer-events="none">
              ${this.timeSigTop}
            </text>
            <text x="${this.staffLeft+2}" y="136" font-size="${this.timeSigBottom>9?`18`:`22`}" font-weight="900" fill="#38bdf8" text-anchor="middle" pointer-events="none">
              ${this.timeSigBottom}
            </text>

            <!-- Interactive Clickable Staff Area -->
            <rect id="staff-interaction-area" x="${this.staffLeft+16}" y="30" width="${this.staffRight-this.staffLeft-16}" height="175" fill="transparent" style="cursor: crosshair;" />

            <!-- Group for Placed Notes & Measure Barlines -->
            <g id="staff-notes-group"></g>

            <!-- Group for Hover Ghost Note -->
            <g id="staff-ghost-group" pointer-events="none" style="display: none;"></g>

            <!-- Group for Microphone Live Pitch Indicator -->
            <g id="staff-mic-group" pointer-events="none" style="display: none;"></g>
          </svg>
        </div>

        <div class="sheet-footer-hint">
          <span>💡 <strong>Timing Tips:</strong> Customize both pieces of the time signature (any beats per measure / any note unit). Click any placed note on the staff to select it, then click duration buttons above to change its timing in real-time.</span>
        </div>
      </div>
    `,this.svgEl=this.container.querySelector(`#staff-svg`),this.ghostGroupEl=this.container.querySelector(`#staff-ghost-group`),this.notesGroupEl=this.container.querySelector(`#staff-notes-group`),this.micIndicatorGroupEl=this.container.querySelector(`#staff-mic-group`),this.playBtnEl=this.container.querySelector(`#btn-sheet-play`),this.tempoLabelEl=this.container.querySelector(`#sheet-tempo-val`),this.tempoSliderEl=this.container.querySelector(`#sheet-tempo-slider`),this.selectionStatusEl=this.container.querySelector(`#sheet-selection-status`);let r=this.container.querySelector(`#sheet-mini-tuner`);this.miniTuner=new _(r,{label:`Live Pitch Monitor (Staff)`,compact:!0}),this.container.querySelectorAll(`[data-clef]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-clef`);t&&this.setClef(t)})});let i=this.container.querySelector(`#time-sig-top-input`);i.addEventListener(`change`,()=>{let e=parseInt(i.value,10);!isNaN(e)&&e>=1&&this.setTimeSignature(e,this.timeSigBottom)}),this.container.querySelector(`#btn-sig-top-minus`)?.addEventListener(`click`,()=>{this.timeSigTop>1&&this.setTimeSignature(this.timeSigTop-1,this.timeSigBottom)}),this.container.querySelector(`#btn-sig-top-plus`)?.addEventListener(`click`,()=>{this.timeSigTop<32&&this.setTimeSignature(this.timeSigTop+1,this.timeSigBottom)});let a=this.container.querySelector(`#time-sig-bottom-select`);a.addEventListener(`change`,()=>{let e=parseInt(a.value,10);!isNaN(e)&&e>=1&&this.setTimeSignature(this.timeSigTop,e)}),this.container.querySelectorAll(`[data-preset-top]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=parseInt(e.getAttribute(`data-preset-top`)||`4`,10),n=parseInt(e.getAttribute(`data-preset-bottom`)||`4`,10);this.setTimeSignature(t,n)})}),this.container.querySelectorAll(`[data-duration]`).forEach(e=>{e.addEventListener(`click`,()=>{this.container.querySelectorAll(`[data-duration]`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`);let t=e.getAttribute(`data-duration`);this.setDuration(t)})}),this.container.querySelectorAll(`[data-accidental]`).forEach(e=>{e.addEventListener(`click`,()=>{this.container.querySelectorAll(`[data-accidental]`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`);let t=e.getAttribute(`data-accidental`)||``;this.setAccidental(t)})}),this.playBtnEl.addEventListener(`click`,()=>{this.isPlayingSequence?this.stopPlayback():this.startPlayback()}),this.container.querySelector(`#btn-sheet-undo`)?.addEventListener(`click`,()=>this.removeLastNote()),this.container.querySelector(`#btn-sheet-clear`)?.addEventListener(`click`,()=>this.clearNotes()),this.container.querySelector(`#btn-sheet-example`)?.addEventListener(`click`,()=>this.loadExampleMelody()),this.tempoSliderEl.addEventListener(`input`,()=>{this.tempoBpm=parseInt(this.tempoSliderEl.value,10),this.tempoLabelEl.textContent=`${this.tempoBpm} BPM`}),this.container.querySelector(`#sheet-metronome-toggle`)?.addEventListener(`change`,e=>{this.enableMetronome=e.target.checked}),this.container.querySelector(`#sheet-mic-toggle`)?.addEventListener(`change`,e=>{this.showMicIndicator=e.target.checked,!this.showMicIndicator&&this.micIndicatorGroupEl&&(this.micIndicatorGroupEl.style.display=`none`)});let o=this.container.querySelector(`#staff-interaction-area`),s=e=>{let t=this.svgEl.createSVGPoint();t.x=e.clientX,t.y=e.clientY;let n=this.svgEl.getScreenCTM();return n?t.matrixTransform(n.inverse()):{x:e.offsetX,y:e.offsetY}};o.addEventListener(`mousemove`,e=>{let t=s(e),n=this.yToStep(t.y),r=this.stepToY(n),i=n-y[this.activeClef].bottomLineStep,{octave:a,baseLetter:o}=this.stepToNoteInfo(n,this.activeAccidental),c=`${o}${this.activeAccidental}${a}`;this.ghostGroupEl.style.display=`block`,this.ghostGroupEl.innerHTML=`
        <!-- Ledger Lines -->
        ${this.renderLedgerLines(t.x,i)}

        <!-- Ghost Notehead -->
        <ellipse cx="${t.x}" cy="${r}" rx="7.2" ry="5.4" transform="rotate(-22 ${t.x} ${r})" fill="rgba(56, 189, 248, 0.45)" stroke="#38bdf8" stroke-width="1.5" />

        <!-- Ghost Label with Duration -->
        <rect x="${t.x-26}" y="${r-26}" width="52" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
        <text x="${t.x}" y="${r-13}" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle" font-family="monospace">
          ${c} (${this.activeDuration})
        </text>
      `}),o.addEventListener(`mouseleave`,()=>{this.ghostGroupEl.style.display=`none`}),o.addEventListener(`click`,e=>{let t=s(e),n=this.yToStep(t.y);this.addNoteAtStep(n)}),this.container.addEventListener(`click`,e=>{let t=e.target;!t.closest(`.placed-note-group`)&&!t.closest(`.pill-btn`)&&!t.closest(`.note-selected-pill`)&&!t.closest(`.time-sig-fraction-box`)&&this.selectedNoteIndex!==null&&(this.selectedNoteIndex=null,this.renderNotes(),this.updateSelectionStatus())}),this.renderNotes(),this.updateSelectionStatus()}},w=[{id:`chromatic`,name:`Chromatic (All)`,category:`general`,description:`Detects any musical note across all octaves. Ideal for any instrument, piano, or voice.`,notes:[]},{id:`guitar-standard`,name:`Guitar (Standard)`,category:`instruments`,description:`Standard 6-string guitar tuning (E2 - A2 - D3 - G3 - B3 - E4).`,notes:[{label:`6: E2`,name:`E`,octave:2,noteIndex:4,midi:40},{label:`5: A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`4: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`3: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`2: B3`,name:`B`,octave:3,noteIndex:11,midi:59},{label:`1: E4`,name:`E`,octave:4,noteIndex:4,midi:64}]},{id:`guitar-drop-d`,name:`Guitar (Drop D)`,category:`instruments`,description:`Drop D tuning (D2 - A2 - D3 - G3 - B3 - E4). Popular in rock and metal.`,notes:[{label:`6: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`5: A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`4: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`3: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`2: B3`,name:`B`,octave:3,noteIndex:11,midi:59},{label:`1: E4`,name:`E`,octave:4,noteIndex:4,midi:64}]},{id:`guitar-dadgad`,name:`Guitar (DADGAD)`,category:`instruments`,description:`Celtic and acoustic fingerstyle tuning (D2 - A2 - D3 - G3 - A3 - D4).`,notes:[{label:`6: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`5: A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`4: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`3: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`2: A3`,name:`A`,octave:3,noteIndex:9,midi:57},{label:`1: D4`,name:`D`,octave:4,noteIndex:2,midi:62}]},{id:`bass-4`,name:`Bass (4-String)`,category:`instruments`,description:`Standard 4-string electric bass (E1 - A1 - D2 - G2).`,notes:[{label:`4: E1`,name:`E`,octave:1,noteIndex:4,midi:28},{label:`3: A1`,name:`A`,octave:1,noteIndex:9,midi:33},{label:`2: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`1: G2`,name:`G`,octave:2,noteIndex:7,midi:43}]},{id:`bass-5`,name:`Bass (5-String)`,category:`instruments`,description:`5-string electric bass with low B (B0 - E1 - A1 - D2 - G2).`,notes:[{label:`5: B0`,name:`B`,octave:0,noteIndex:11,midi:23},{label:`4: E1`,name:`E`,octave:1,noteIndex:4,midi:28},{label:`3: A1`,name:`A`,octave:1,noteIndex:9,midi:33},{label:`2: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`1: G2`,name:`G`,octave:2,noteIndex:7,midi:43}]},{id:`ukulele-soprano`,name:`Ukulele (Standard C)`,category:`instruments`,description:`Standard re-entrant Soprano/Concert/Tenor tuning (G4 - C4 - E4 - A4).`,notes:[{label:`4: G4`,name:`G`,octave:4,noteIndex:7,midi:67},{label:`3: C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`2: E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`1: A4`,name:`A`,octave:4,noteIndex:9,midi:69}]},{id:`violin`,name:`Violin`,category:`instruments`,description:`Standard orchestral violin tuning in perfect fifths (G3 - D4 - A4 - E5).`,notes:[{label:`4: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`3: D4`,name:`D`,octave:4,noteIndex:2,midi:62},{label:`2: A4`,name:`A`,octave:4,noteIndex:9,midi:69},{label:`1: E5`,name:`E`,octave:5,noteIndex:4,midi:76}]},{id:`cello`,name:`Cello`,category:`instruments`,description:`Standard cello tuning in fifths (C2 - G2 - D3 - A3).`,notes:[{label:`4: C2`,name:`C`,octave:2,noteIndex:0,midi:36},{label:`3: G2`,name:`G`,octave:2,noteIndex:7,midi:43},{label:`2: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`1: A3`,name:`A`,octave:3,noteIndex:9,midi:57}]},{id:`voice-tenor`,name:`Voice: Tenor`,category:`voice`,description:`High male voice range typically from C3 (131 Hz) to C5 (523 Hz).`,notes:[{label:`Low C3`,name:`C`,octave:3,noteIndex:0,midi:48},{label:`E3`,name:`E`,octave:3,noteIndex:4,midi:52},{label:`G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`Mid C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`G4`,name:`G`,octave:4,noteIndex:7,midi:67},{label:`High C5`,name:`C`,octave:5,noteIndex:0,midi:72}]},{id:`voice-baritone`,name:`Voice: Baritone`,category:`voice`,description:`Mid male voice range typically from A2 (110 Hz) to A4 (440 Hz).`,notes:[{label:`Low A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`C3`,name:`C`,octave:3,noteIndex:0,midi:48},{label:`E3`,name:`E`,octave:3,noteIndex:4,midi:52},{label:`A3`,name:`A`,octave:3,noteIndex:9,midi:57},{label:`C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`High A4`,name:`A`,octave:4,noteIndex:9,midi:69}]},{id:`voice-bass`,name:`Voice: Bass`,category:`voice`,description:`Deep male voice range typically from E2 (82 Hz) to E4 (330 Hz).`,notes:[{label:`Low E2`,name:`E`,octave:2,noteIndex:4,midi:40},{label:`G2`,name:`G`,octave:2,noteIndex:7,midi:43},{label:`C3`,name:`C`,octave:3,noteIndex:0,midi:48},{label:`E3`,name:`E`,octave:3,noteIndex:4,midi:52},{label:`G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`High E4`,name:`E`,octave:4,noteIndex:4,midi:64}]},{id:`voice-soprano`,name:`Voice: Soprano`,category:`voice`,description:`High female voice range typically from C4 (261 Hz) to C6 (1046 Hz).`,notes:[{label:`Low C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`G4`,name:`G`,octave:4,noteIndex:7,midi:67},{label:`C5`,name:`C`,octave:5,noteIndex:0,midi:72},{label:`E5`,name:`E`,octave:5,noteIndex:4,midi:76},{label:`G5`,name:`G`,octave:5,noteIndex:7,midi:79},{label:`High C6`,name:`C`,octave:6,noteIndex:0,midi:84}]},{id:`voice-alto`,name:`Voice: Alto / Contralto`,category:`voice`,description:`Lower female voice range typically from F3 (175 Hz) to F5 (698 Hz).`,notes:[{label:`Low F3`,name:`F`,octave:3,noteIndex:5,midi:53},{label:`A3`,name:`A`,octave:3,noteIndex:9,midi:57},{label:`C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`F4`,name:`F`,octave:4,noteIndex:5,midi:65},{label:`A4`,name:`A`,octave:4,noteIndex:9,midi:69},{label:`C5`,name:`C`,octave:5,noteIndex:0,midi:72},{label:`High F5`,name:`F`,octave:5,noteIndex:5,midi:77}]}],T=new c,E=new l,D=w[1],O=`sharp`,k=440,A=9,j=4,M=440,N=`acoustic`;try{let e=localStorage.getItem(`tunerlab_a4`);e&&(k=Number(e)||440);let t=localStorage.getItem(`tunerlab_notation`);t&&(O=t);let n=localStorage.getItem(`tunerlab_preset`);if(n){let e=w.find(e=>e.id===n);e&&(D=e)}}catch{}T.setA4(k),T.setNotation(O);var ee=document.querySelector(`#app`);ee.innerHTML=`
  <!-- App Header -->
  <header class="app-header">
    <div class="brand-section">
      <div class="brand-logo" aria-hidden="true">&#9836;</div>
      <div class="brand-title">
        <h1>TunerLab</h1>
        <p>Instrument & Vocal Chromatic Tuner</p>
      </div>
    </div>

    <div class="header-controls">
      <!-- Master Mic Button -->
      <button type="button" class="btn-mic-toggle" id="btn-master-mic" aria-label="Toggle Microphone Input">
        <span class="mic-pulse-dot"></span>
        <span id="mic-status-label">Start Listening</span>
      </button>

      <!-- A4 Calibration -->
      <div class="control-badge" title="Calibration reference pitch (Standard: 440 Hz)">
        <label for="a4-display">A4 Ref</label>
        <button type="button" class="stepper-btn" id="btn-a4-minus" aria-label="Decrease A4 pitch">-</button>
        <span class="value-text" id="a4-display">${k} Hz</span>
        <button type="button" class="stepper-btn" id="btn-a4-plus" aria-label="Increase A4 pitch">+</button>
      </div>

      <!-- Notation Selector -->
      <div class="control-badge">
        <label for="notation-select">Keys</label>
        <select class="app-select" id="notation-select" aria-label="Select musical notation style">
          <option value="sharp" ${O===`sharp`?`selected`:``}>Sharps (♯)</option>
          <option value="flat" ${O===`flat`?`selected`:``}>Flats (♭)</option>
          <option value="solfege" ${O===`solfege`?`selected`:``}>Solfège (Do-Re-Mi)</option>
        </select>
      </div>

      <!-- Volume & Mute -->
      <div class="control-badge" title="Master output volume">
        <label for="master-volume">Vol</label>
        <input type="range" id="master-volume" min="0" max="1" step="0.05" value="0.6" style="width: 70px;" aria-label="Output Volume" />
        <button type="button" class="stepper-btn" id="btn-mute" title="Mute Audio">🔊</button>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="nav-tabs" role="tablist">
    <button type="button" class="tab-btn active" data-tab="tuner" role="tab" aria-selected="true">
      <span>🎯</span> Tuner
    </button>
    <button type="button" class="tab-btn" data-tab="generator" role="tab" aria-selected="false">
      <span>🔊</span> Tone Generator
    </button>
    <button type="button" class="tab-btn" data-tab="piano" role="tab" aria-selected="false">
      <span>🎹</span> Piano Roll
    </button>
    <button type="button" class="tab-btn" data-tab="trainer" role="tab" aria-selected="false">
      <span>🎯</span> Pitch Match
    </button>
    <button type="button" class="tab-btn" data-tab="sheet" role="tab" aria-selected="false">
      <span>🎼</span> Sheet Music
    </button>
  </nav>

  <!-- Tab Contents -->
  <main class="tab-content">
    <!-- ==================== TAB 1: TUNER ==================== -->
    <section class="tab-panel active" id="panel-tuner" role="tabpanel">
      <!-- Hero Tuner Card -->
      <div class="tuner-hero-card" id="tuner-hero-card">
        <!-- Big Note Display -->
        <div class="note-display-container">
          <div class="note-badge-wrap">
            <span class="note-main-letter" id="note-letter">-</span>
            <span class="note-accidental" id="note-accidental"></span>
            <span class="note-octave" id="note-octave"></span>
          </div>
          <div class="note-solfege-sub" id="note-solfege">Play a note or sing into microphone</div>
        </div>

        <!-- Direction Badge -->
        <div class="tuning-guidance-badge" id="tuning-guidance">Waiting for sound...</div>

        <!-- Numeric Stats -->
        <div class="numeric-stats-row">
          <div class="stat-pill">
            <span class="stat-label">Offset</span>
            <span class="stat-val cents-val" id="stat-cents">0.0¢</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Detected</span>
            <span class="stat-val" id="stat-freq">0.0 Hz</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Target Note</span>
            <span class="stat-val" id="stat-target-freq">0.0 Hz</span>
          </div>
        </div>

        <!-- Canvas Arc Gauge & Strobe -->
        <div class="gauge-canvas-container">
          <canvas id="tuner-gauge-canvas"></canvas>
        </div>
      </div>

      <!-- Presets & Strings Card -->
      <div class="preset-card">
        <div class="preset-header">
          <div class="preset-title-wrap">
            <h3 id="preset-title">${D.name}</h3>
            <p id="preset-desc">${D.description}</p>
          </div>
          <select class="app-select" id="preset-select" aria-label="Select instrument tuning or vocal profile">
            ${w.map(e=>`<option value="${e.id}" ${e.id===D.id?`selected`:``}>${e.name}</option>`).join(``)}
          </select>
        </div>
        <div class="preset-pills-container" id="preset-strings-container"></div>
      </div>

      <!-- Live Visualizer & Input Bar -->
      <div class="visualizer-card">
        <div class="visualizer-header">
          <h3 id="viz-title">Pitch Stability Trace</h3>
          <div class="viz-toggle-group">
            <button type="button" class="viz-toggle-btn active" data-viz="pitch-history">Pitch Trace</button>
            <button type="button" class="viz-toggle-btn" data-viz="waveform">Waveform</button>
          </div>
        </div>

        <div class="viz-canvas-container">
          <canvas id="pitch-trace-canvas"></canvas>
        </div>

        <!-- VU Level & Microphone Sensitivity Controls -->
        <div class="audio-meter-bar">
          <div class="meter-row-top">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">MIC LEVEL</span>
            <div class="vu-meter-wrap">
              <div class="vu-meter-level" id="vu-meter-bar"></div>
            </div>
            <button type="button" class="btn-boost-quick ${T.getInputGain()>=3?`active`:``}" id="btn-quick-ipad-boost" title="Preamp boost for iPad Pro/Air mic arrays">
              ⚡ iPad / Quiet Mic Boost
            </button>
          </div>

          <div class="meter-controls-grid">
            <!-- Digital Preamp Boost Slider -->
            <div class="gate-control-wrap" title="Software preamp gain multiplier. Boosts quiet tablet microphone arrays.">
              <label for="mic-gain-slider">Preamp Gain:</label>
              <input type="range" id="mic-gain-slider" min="1" max="10" step="0.5" value="${T.getInputGain()}" style="width: 80px;" />
              <span class="value-text" id="mic-gain-label" style="min-width: 42px;">${T.getInputGain().toFixed(1)}x</span>
            </div>

            <!-- Noise Gate Slider -->
            <div class="gate-control-wrap" title="Lower values detect softer notes; higher values filter out background noise">
              <label for="noise-gate-slider">Gate:</label>
              <input type="range" id="noise-gate-slider" min="0.0003" max="0.02" step="0.0003" value="${T.getNoiseGate()}" style="width: 80px;" />
              <span class="value-text" id="noise-gate-label" style="min-width: 48px;">${(T.getNoiseGate()*1e3).toFixed(1)}m</span>
            </div>

            <!-- Auto Gain Control Toggle -->
            <div class="gate-control-wrap">
              <label title="Engages hardware automatic gain leveling in iPadOS/browser">
                <input type="checkbox" id="auto-gain-toggle" ${T.getAutoGainControl()?`checked`:``} />
                Auto-Gain (AGC)
              </label>
            </div>

            <!-- Raw Audio Toggle -->
            <div class="gate-control-wrap">
              <label title="Disables echo cancellation and noise suppression for instruments">
                <input type="checkbox" id="raw-audio-toggle" ${T.getRawAudioMode()?`checked`:``} />
                Raw Musician Audio
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== TAB 2: TONE GENERATOR ==================== -->
    <section class="tab-panel" id="panel-generator" role="tabpanel">
      <div class="tone-card">
        <div class="tone-header">
          <h2>Reference Tone & Drone Generator</h2>
          <p>Generate clean reference tones to tune instruments by ear or practice vocal pitch matching.</p>
        </div>

        <!-- Live Pitch & Tone Matcher on Generator Tab -->
        <div id="generator-mini-tuner"></div>

        <div class="tone-playback-bar">
          <button type="button" class="btn-big-play" id="btn-play-tone">
            <span>🔊</span> Play Note (${e[A]}${j} &bull; ${M.toFixed(1)} Hz)
          </button>
          <button type="button" class="btn-drone-toggle" id="btn-drone-toggle">
            <span>〰️</span> Start Continuous Drone
          </button>
        </div>

        <div class="tone-pitch-selector-grid">
          <!-- 12 Chromatic Notes -->
          <div class="control-panel-box">
            <h4>1. Select Note</h4>
            <div class="note-grid-12" id="tone-note-grid">
              ${e.map((e,t)=>`<button type="button" class="note-grid-btn ${t===A?`active`:``}" data-idx="${t}">${e}</button>`).join(``)}
            </div>
          </div>

          <!-- Octave & Timbre -->
          <div class="control-panel-box">
            <h4>2. Octave & Timbre</h4>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Octave:</span>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button type="button" class="stepper-btn" id="btn-gen-oct-minus">-</button>
                <span class="value-text" id="gen-oct-display">${j}</span>
                <button type="button" class="stepper-btn" id="btn-gen-oct-plus">+</button>
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.82rem; display: block; margin-bottom: 0.4rem;">Sound Timbre:</span>
              <div class="timbre-selector-row">
                <button type="button" class="timbre-btn active" data-timbre="acoustic">
                  <span>🎸</span> Acoustic Pluck
                </button>
                <button type="button" class="timbre-btn" data-timbre="sine">
                  <span>〰️</span> Pure Sine
                </button>
                <button type="button" class="timbre-btn" data-timbre="reed">
                  <span>🎷</span> Clarinet / Reed
                </button>
                <button type="button" class="timbre-btn" data-timbre="triangle">
                  <span>🪈</span> Flute / Warm
                </button>
              </div>
            </div>

            <div style="margin-top: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.2rem;">
                <span>Exact Frequency:</span>
                <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;" id="gen-freq-display">${M.toFixed(1)} Hz</span>
              </div>
              <input type="range" id="gen-freq-slider" min="50" max="1500" step="0.5" value="${M}" style="width: 100%;" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== TAB 3: PIANO ROLL ==================== -->
    <section class="tab-panel" id="panel-piano" role="tabpanel">
      <div class="piano-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff;">Interactive Piano Roll</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Click or tap keys to play reference notes. Keys light up dynamically when heard through the microphone!
            </p>
          </div>
        </div>

        <!-- Live Pitch Monitor on Piano Tab -->
        <div id="piano-mini-tuner"></div>

        <div id="piano-container"></div>
      </div>
    </section>

    <!-- ==================== TAB 4: PITCH MATCH TRAINER ==================== -->
    <section class="tab-panel" id="panel-trainer" role="tabpanel">
      <div id="trainer-container"></div>
    </section>

    <!-- ==================== TAB 5: SHEET MUSIC ==================== -->
    <section class="tab-panel" id="panel-sheet" role="tabpanel">
      <div id="sheet-container"></div>
    </section>
  </main>

  <!-- Footer with keyboard shortcuts -->
  <footer class="app-footer">
    <div class="footer-shortcuts">
      <span>Shortcuts:</span>
      <kbd>Space</kbd> Mic &bull;
      <kbd>1-5</kbd> Tabs &bull;
      <kbd>Z-M / Q-I</kbd> Play Piano &bull;
      <kbd>[ / ]</kbd> Octaves &bull;
      <kbd>D</kbd> Drone &bull;
      <kbd>M</kbd> Mute
    </div>
    <div>TunerLab &bull; Web Audio & DSP Pitch Detection</div>
  </footer>
`;var P=new u(document.querySelector(`#tuner-gauge-canvas`)),F=new d(document.querySelector(`#pitch-trace-canvas`)),I=new g(document.querySelector(`#piano-container`),E,{startOctave:3,numOctaves:2,a4:k,notation:O}),te=new v(document.querySelector(`#trainer-container`),E,k),ne=new _(document.querySelector(`#generator-mini-tuner`),{label:`Live Voice / Instrument Pitch Matcher`,showReferenceComparison:!0}),re=new _(document.querySelector(`#piano-mini-tuner`),{label:`Live Microphone Pitch Tracker`,compact:!0}),ie=new C(document.querySelector(`#sheet-container`),E,k),L=document.querySelector(`#btn-master-mic`),R=document.querySelector(`#mic-status-label`),ae=document.querySelector(`#note-letter`),oe=document.querySelector(`#note-accidental`),se=document.querySelector(`#note-octave`),ce=document.querySelector(`#note-solfege`),z=document.querySelector(`#tuning-guidance`),le=document.querySelector(`#stat-cents`),ue=document.querySelector(`#stat-freq`),de=document.querySelector(`#stat-target-freq`),fe=document.querySelector(`#vu-meter-bar`),B=document.querySelector(`#tuner-hero-card`);T.subscribe(t=>{let n=Math.min(100,Math.round(t.rms*350));fe&&(fe.style.width=`${n}%`),F.update(t),te.updatePitch(t);let r=`${e[A]}${j}`;if(ne.update(t,M,r),re.update(t),ie.updatePitch(t),t.note&&t.frequency>0){let e=t.note;ae.textContent=e.noteName[0],oe.textContent=e.accidental,se.textContent=String(e.octave),ce.textContent=`Solfège: ${e.solfege} ${e.octave}`,le.textContent=`${e.cents>0?`+`:``}${e.cents}¢`,ue.textContent=`${e.frequency.toFixed(1)} Hz`,de.textContent=`${e.targetFrequency.toFixed(1)} Hz`,B.className=`tuner-hero-card`,z.className=`tuning-guidance-badge`,Math.abs(e.cents)<=3?(B.classList.add(`in-tune`),z.classList.add(`in-tune`),z.textContent=`✓ PERFECT IN TUNE`):Math.abs(e.cents)<=8?(B.classList.add(`close-tune`),e.cents<0?(z.classList.add(`flat`),z.textContent=`▲ SLIGHTLY FLAT`):(z.classList.add(`sharp`),z.textContent=`▼ SLIGHTLY SHARP`)):e.cents<0?(B.classList.add(`flat-tune`),z.classList.add(`flat`),z.textContent=`▲ TUNE UP (${Math.abs(e.cents)}¢ FLAT)`):(B.classList.add(`sharp-tune`),z.classList.add(`sharp`),z.textContent=`▼ TUNE DOWN (+${e.cents}¢ SHARP)`),P.update(e),I.highlightMidi(Math.round(e.midi)),ge(e.midi,Math.abs(e.cents)<=3)}else P.update(null),I.highlightMidi(null),ge(null,!1),T.isListening()?(z.textContent=`Listening for notes...`,z.className=`tuning-guidance-badge`):(z.textContent=`Microphone off. Click Start Listening.`,z.className=`tuning-guidance-badge`)});var pe=document.querySelector(`#preset-select`),V=document.querySelector(`#preset-strings-container`),me=document.querySelector(`#preset-title`),he=document.querySelector(`#preset-desc`);function H(){if(me.textContent=D.name,he.textContent=D.description,V.innerHTML=``,D.notes.length===0){let n=document.createElement(`div`);n.style.display=`flex`,n.style.flexWrap=`wrap`,n.style.gap=`0.5rem`,(O===`flat`?t:e).forEach((e,t)=>{let r=document.createElement(`button`);r.type=`button`,r.className=`string-btn`;let a=i(t,4,k);r.innerHTML=`
        <span class="string-name">${e}4</span>
        <span class="string-freq">${a.toFixed(1)} Hz</span>
      `,r.title=`Click to hear ${e}4 reference pitch`,r.addEventListener(`click`,()=>{E.playNote(a,1.2)}),n.appendChild(r)}),V.appendChild(n);return}D.notes.forEach(e=>{let t=document.createElement(`button`);t.type=`button`,t.className=`string-btn`,t.setAttribute(`data-midi`,String(e.midi));let n=i(e.noteIndex,e.octave,k);t.innerHTML=`
      <span class="string-name">${e.label}</span>
      <span class="string-freq">${n.toFixed(1)} Hz</span>
    `,t.title=`Click to hear ${e.label} reference tone`,t.addEventListener(`click`,()=>{E.playNote(n,1.5)}),V.appendChild(t)})}function ge(e,t){V.querySelectorAll(`.string-btn`).forEach(n=>{let r=n.getAttribute(`data-midi`);if(!r||e===null){n.classList.remove(`active-target`,`in-tune-string`);return}let i=Number(r);Math.abs(e-i)<=1.2?(n.classList.add(`active-target`),t?n.classList.add(`in-tune-string`):n.classList.remove(`in-tune-string`)):n.classList.remove(`active-target`,`in-tune-string`)})}pe.addEventListener(`change`,()=>{let e=w.find(e=>e.id===pe.value);e&&(D=e,localStorage.setItem(`tunerlab_preset`,e.id),H())}),H();async function _e(){if(T.isListening())T.stop(),L.classList.remove(`listening`),R.textContent=`Start Listening`;else{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){if(window.location.protocol===`http:`&&window.location.hostname!==`localhost`){let e=`https://${window.location.hostname}:5174/`;if(confirm(`Mobile browsers require HTTPS for microphone access.\n\nOpen the HTTPS version at ${e}?`)){window.location.href=e;return}}alert(`Microphone access is not supported over insecure HTTP. Please use https:// on mobile.`);return}try{R.textContent=`Connecting...`,await T.start(),L.classList.add(`listening`),R.textContent=`Microphone Active`}catch{R.textContent=`Mic Error (Click to retry)`,L.classList.remove(`listening`),alert(`Could not access microphone. Please ensure microphone permissions are granted.`)}}}L.addEventListener(`click`,_e);var ve=document.querySelector(`#a4-display`),ye=document.querySelector(`#btn-a4-minus`),be=document.querySelector(`#btn-a4-plus`);function xe(e){k=Math.max(415,Math.min(466,e)),ve.textContent=`${k} Hz`,T.setA4(k),I.setA4(k),te.setA4(k),ie.setA4(k),$(),H(),localStorage.setItem(`tunerlab_a4`,String(k))}ye.addEventListener(`click`,()=>xe(k-1)),be.addEventListener(`click`,()=>xe(k+1));var Se=document.querySelector(`#notation-select`);Se.addEventListener(`change`,()=>{O=Se.value,T.setNotation(O),I.setNotation(O),H(),localStorage.setItem(`tunerlab_notation`,O)});var U=document.querySelector(`#master-volume`),W=document.querySelector(`#btn-mute`),G=!1,K=.6;U.addEventListener(`input`,()=>{let e=parseFloat(U.value);E.setVolume(e),G=e===0,W.textContent=G?`🔇`:`🔊`}),W.addEventListener(`click`,()=>{G?(G=!1,U.value=String(K||.6),E.setVolume(K||.6),W.textContent=`🔊`):(K=parseFloat(U.value),G=!0,U.value=`0`,E.setVolume(0),W.textContent=`🔇`)});var q=document.querySelector(`#mic-gain-slider`),Ce=document.querySelector(`#mic-gain-label`),we=document.querySelector(`#btn-quick-ipad-boost`),Te=document.querySelector(`#noise-gate-slider`),Ee=document.querySelector(`#noise-gate-label`),De=document.querySelector(`#auto-gain-toggle`),Oe=document.querySelector(`#raw-audio-toggle`);function ke(e){T.setInputGain(e),q.value=String(e),Ce.textContent=`${e.toFixed(1)}x`,we.classList.toggle(`active`,e>=3);try{localStorage.setItem(`tunerlab_mic_gain`,String(e))}catch{}}q.addEventListener(`input`,()=>{ke(parseFloat(q.value))}),we.addEventListener(`click`,()=>{ke(T.getInputGain()>=3?1:4)}),Te.addEventListener(`input`,()=>{let e=parseFloat(Te.value);T.setNoiseGate(e),Ee.textContent=`${(e*1e3).toFixed(1)}m`;try{localStorage.setItem(`tunerlab_noise_gate`,String(e))}catch{}}),De.addEventListener(`change`,()=>{T.setAutoGainControl(De.checked)}),Oe.addEventListener(`change`,()=>{T.setRawAudioMode(Oe.checked)});var Ae=document.querySelectorAll(`.viz-toggle-btn`),je=document.querySelector(`#viz-title`);Ae.forEach(e=>{e.addEventListener(`click`,()=>{Ae.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`);let t=e.getAttribute(`data-viz`);F.setMode(t),je.textContent=t===`waveform`?`Live Audio Waveform`:`Pitch Stability Trace`})});var Me=document.querySelectorAll(`.tab-btn`),Ne=document.querySelectorAll(`.tab-panel`),J=`tuner`;function Y(e){J=e,Me.forEach(t=>{let n=t.getAttribute(`data-tab`)===e;t.classList.toggle(`active`,n),t.setAttribute(`aria-selected`,String(n))}),Ne.forEach(t=>{let n=t.id===`panel-${e}`;t.classList.toggle(`active`,n)}),e===`tuner`&&setTimeout(()=>{P.handleResize(),F.handleResize()},50)}Me.forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-tab`);t&&Y(t)})});var X=document.querySelector(`#btn-play-tone`),Z=document.querySelector(`#btn-drone-toggle`),Pe=document.querySelectorAll(`.note-grid-btn`),Fe=document.querySelector(`#gen-oct-display`),Ie=document.querySelector(`#btn-gen-oct-minus`),Le=document.querySelector(`#btn-gen-oct-plus`),Re=document.querySelector(`#gen-freq-display`),Q=document.querySelector(`#gen-freq-slider`),ze=document.querySelectorAll(`.timbre-btn`);function $(){M=i(A,j,k),Re.textContent=`${M.toFixed(1)} Hz`,Q.value=String(M),X.innerHTML=`<span>🔊</span> Play Note (${e[A]}${j} &bull; ${M.toFixed(1)} Hz)`,E.isDronePlaying()&&E.updateDroneFrequency(M)}Pe.forEach(e=>{e.addEventListener(`click`,()=>{Pe.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),A=Number(e.getAttribute(`data-idx`)),$()})}),Ie.addEventListener(`click`,()=>{j>1&&(j--,Fe.textContent=String(j),$())}),Le.addEventListener(`click`,()=>{j<7&&(j++,Fe.textContent=String(j),$())}),Q.addEventListener(`input`,()=>{M=parseFloat(Q.value),Re.textContent=`${M.toFixed(1)} Hz`,X.innerHTML=`<span>🔊</span> Play Custom (${M.toFixed(1)} Hz)`,E.isDronePlaying()&&E.updateDroneFrequency(M)}),ze.forEach(e=>{e.addEventListener(`click`,()=>{ze.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),N=e.getAttribute(`data-timbre`),E.setTimbre(N)})}),X.addEventListener(`click`,()=>{E.playNote(M,1.5,N)}),Z.addEventListener(`click`,()=>{E.isDronePlaying()?(E.stopDrone(),Z.classList.remove(`active`),Z.innerHTML=`<span>〰️</span> Start Continuous Drone`):(E.startDrone(M,N),Z.classList.add(`active`),Z.innerHTML=`<span>⏹️</span> Stop Continuous Drone`)}),I.setOnNoteSelect((t,n,r)=>{M=t,j=r;let i=e.indexOf(n);i!==-1&&(A=i),Fe.textContent=String(j),Re.textContent=`${M.toFixed(1)} Hz`,Q.value=String(M),Pe.forEach(e=>{e.classList.toggle(`active`,Number(e.getAttribute(`data-idx`))===A)}),X.innerHTML=`<span>🔊</span> Play Note (${n}${r} &bull; ${M.toFixed(1)} Hz)`}),window.addEventListener(`keydown`,e=>{e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||J===`piano`&&I.handleKeyDown(e)||(e.code===`Space`?(e.preventDefault(),_e()):e.key===`1`?Y(`tuner`):e.key===`2`?Y(`generator`):e.key===`3`?Y(`piano`):e.key===`4`?Y(`trainer`):e.key===`5`?Y(`sheet`):e.key.toLowerCase()===`d`&&J!==`piano`?Z.click():e.key.toLowerCase()===`m`&&J!==`piano`&&W.click())}),window.addEventListener(`keyup`,e=>{J===`piano`&&I.handleKeyUp(e)});