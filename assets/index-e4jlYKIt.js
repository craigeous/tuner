(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[`C`,`C#`,`D`,`D#`,`E`,`F`,`F#`,`G`,`G#`,`A`,`A#`,`B`],t=[`C`,`Db`,`D`,`Eb`,`E`,`F`,`Gb`,`G`,`Ab`,`A`,`Bb`,`B`],n=[`Do`,`Di`,`Re`,`Ri`,`Mi`,`Fa`,`Fi`,`Sol`,`Si`,`La`,`Li`,`Ti`];function r(r,i=440,a=`sharp`){if(r<=0||!isFinite(r))return null;let o=69+12*Math.log2(r/i),s=Math.round(o),c=Math.round((o-s)*100),l=i*2**((s-69)/12),u=(s%12+12)%12,d=Math.floor(s/12)-1,f=``,p=``;if(a===`flat`){let e=t[u];f=e[0],p=e.length>1?`♭`:``}else if(a===`solfege`)f=n[u],p=``;else{let t=e[u];f=t[0],p=t.length>1?`♯`:``}let m=n[u];return{frequency:Math.round(r*10)/10,targetFrequency:Math.round(l*10)/10,midi:o,noteIndex:u,noteName:f+p,accidental:p,octave:d,cents:c,solfege:m,inTune:Math.abs(c)<=3}}function i(e,t,n=440){return n*2**(((t+1)*12+e-69)/12)}function a(e,t,n=30,r=2200,i=.008){let a=e.length,o=0;for(let t=0;t<a;t++){let n=e[t];o+=n*n}let s=Math.sqrt(o/a);if(s<i)return{frequency:0,confidence:0,rms:s};let c=0;for(let t=0;t<a;t++)c+=e[t];let l=c/a,u=Math.max(4,Math.floor(t/r)),d=Math.min(a-1,Math.ceil(t/n)),f=-1,p=-1,m=!1,h=new Float32Array(d+2),g=0,_=0;for(let t=0;t<a-d;t++){let n=e[t]-l;g+=n*n}for(let t=u;t<=d;t++){let n=0;_=0;let r=a-t;for(let i=0;i<r;i++){let r=e[i]-l,a=e[i+t]-l;n+=r*a,_+=a*a}let i=Math.sqrt(g*_),o=i>0?n/i:0;if(h[t]=o,!m&&o<.2&&(m=!0),m&&t>u){let e=h[t-1];if(e>h[t-2]&&e>o&&e>.45&&e>p&&(p=e,f=t-1,e>=.9))break}}if(f===-1||p<.45)return{frequency:0,confidence:p>0?p:0,rms:s};let v=f,y=h[v-1],b=h[v],x=h[v+1],S=2*(2*b-y-x),C=0;Math.abs(S)>1e-6&&(C=(x-y)/S),C=Math.max(-.5,Math.min(.5,C));let w=t/(v+C);return w<n*.9||w>r*1.1?{frequency:0,confidence:0,rms:s}:{frequency:w,confidence:p,rms:s}}var o=class{audioCtx=null;mediaStream=null;sourceNode=null;highpassFilter=null;lowpassFilter=null;analyserNode=null;isRunning=!1;animFrameId=null;fftSize=4096;timeDataBuffer=new Float32Array(new ArrayBuffer(this.fftSize*4));freqDataBuffer=new Uint8Array(new ArrayBuffer(this.fftSize/2));pitchHistoryWindow=[];maxPitchSmoothing=3;a4=440;notation=`sharp`;noiseGateThreshold=.008;rawAudioMode=!0;history=[];maxHistoryLength=300;listeners=new Set;constructor(){}isListening(){return this.isRunning}setA4(e){this.a4=Math.max(400,Math.min(480,e))}getA4(){return this.a4}setNotation(e){this.notation=e}getNotation(){return this.notation}setNoiseGate(e){this.noiseGateThreshold=Math.max(.001,Math.min(.08,e))}getNoiseGate(){return this.noiseGateThreshold}setRawAudioMode(e){this.rawAudioMode=e,this.isRunning&&(this.stop(),this.start())}getRawAudioMode(){return this.rawAudioMode}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}getHistory(){return this.history}clearHistory(){this.history=[]}async start(){if(!this.isRunning)try{let e=window.AudioContext||window.webkitAudioContext;this.audioCtx=new e,this.audioCtx.state===`suspended`&&await this.audioCtx.resume();let t=this.rawAudioMode?{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1}:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!1};this.mediaStream=await navigator.mediaDevices.getUserMedia({audio:t,video:!1}),this.sourceNode=this.audioCtx.createMediaStreamSource(this.mediaStream),this.highpassFilter=this.audioCtx.createBiquadFilter(),this.highpassFilter.type=`highpass`,this.highpassFilter.frequency.setValueAtTime(32,this.audioCtx.currentTime),this.lowpassFilter=this.audioCtx.createBiquadFilter(),this.lowpassFilter.type=`lowpass`,this.lowpassFilter.frequency.setValueAtTime(2600,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=this.fftSize,this.analyserNode.smoothingTimeConstant=.1,this.sourceNode.connect(this.highpassFilter),this.highpassFilter.connect(this.lowpassFilter),this.lowpassFilter.connect(this.analyserNode),this.isRunning=!0,this.processLoop()}catch(e){throw console.error(`Failed to open microphone:`,e),this.stop(),e}}stop(){this.isRunning=!1,this.animFrameId!==null&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null),this.mediaStream&&=(this.mediaStream.getTracks().forEach(e=>e.stop()),null),this.sourceNode&&=(this.sourceNode.disconnect(),null),this.highpassFilter&&=(this.highpassFilter.disconnect(),null),this.lowpassFilter&&=(this.lowpassFilter.disconnect(),null),this.analyserNode&&=(this.analyserNode.disconnect(),null),this.audioCtx&&=(this.audioCtx.close(),null),this.pitchHistoryWindow=[];let e={timestamp:performance.now(),frequency:0,rawFrequency:0,confidence:0,rms:0,note:null,waveformData:new Float32Array,spectrumData:new Uint8Array};this.listeners.forEach(t=>t(e))}processLoop=()=>{if(!this.isRunning||!this.analyserNode||!this.audioCtx)return;this.analyserNode.getFloatTimeDomainData(this.timeDataBuffer),this.analyserNode.getByteFrequencyData(this.freqDataBuffer);let e=this.audioCtx.sampleRate,t=a(this.timeDataBuffer,e,25,2300,this.noiseGateThreshold),n=0,i=t.frequency;if(i>0){this.pitchHistoryWindow.push(i),this.pitchHistoryWindow.length>this.maxPitchSmoothing&&this.pitchHistoryWindow.shift();let e=[...this.pitchHistoryWindow].sort((e,t)=>e-t);n=e[Math.floor(e.length/2)]}else this.pitchHistoryWindow.length>0&&this.pitchHistoryWindow.shift();let o=n>0?r(n,this.a4,this.notation):null,s=performance.now();n>0&&o&&(this.history.push({time:s,freq:n,cents:o.cents,inTune:o.inTune,rms:t.rms}),this.history.length>this.maxHistoryLength&&this.history.shift());let c={timestamp:s,frequency:n,rawFrequency:i,confidence:t.confidence,rms:t.rms,note:o,waveformData:this.timeDataBuffer,spectrumData:this.freqDataBuffer};this.listeners.forEach(e=>e(c)),this.animFrameId=requestAnimationFrame(this.processLoop)}},s=class{audioCtx=null;masterGain=null;droneGain=null;droneOscillators=[];isDroneActive=!1;currentDroneFreq=440;currentTimbre=`acoustic`;volume=.5;constructor(){}ensureContext(){if(!this.audioCtx){let e=window.AudioContext||window.webkitAudioContext;this.audioCtx=new e,this.masterGain=this.audioCtx.createGain(),this.masterGain.gain.setValueAtTime(this.volume,this.audioCtx.currentTime),this.masterGain.connect(this.audioCtx.destination)}return this.audioCtx.state===`suspended`&&this.audioCtx.resume(),this.audioCtx}setVolume(e){if(this.volume=Math.max(0,Math.min(1,e)),this.audioCtx&&this.masterGain){let e=this.audioCtx.currentTime;this.masterGain.gain.cancelScheduledValues(e),this.masterGain.gain.linearRampToValueAtTime(this.volume,e+.03)}}getVolume(){return this.volume}setTimbre(e){this.currentTimbre=e,this.isDroneActive&&this.startDrone(this.currentDroneFreq,e)}getTimbre(){return this.currentTimbre}playNote(e,t=1.2,n=this.currentTimbre){let r=this.ensureContext(),i=r.currentTime,a=r.createGain();a.connect(this.masterGain),this.buildSynthVoice(r,a,e,n,i,t,!1)}startDrone(e,t=this.currentTimbre){let n=this.ensureContext();this.stopDrone(),this.currentDroneFreq=e,this.currentTimbre=t,this.isDroneActive=!0;let r=n.currentTime,i=n.createGain();i.gain.setValueAtTime(0,r),i.gain.linearRampToValueAtTime(.7,r+.08),i.connect(this.masterGain),this.droneGain=i,this.buildSynthVoice(n,i,e,t,r,0,!0)}updateDroneFrequency(e){if(!this.isDroneActive||!this.audioCtx)return;this.currentDroneFreq=e;let t=this.audioCtx.currentTime;for(let n of this.droneOscillators)if(n instanceof OscillatorNode){let r=n.__harmonicMult||1;n.frequency.cancelScheduledValues(t),n.frequency.exponentialRampToValueAtTime(Math.max(20,e*r),t+.05)}}stopDrone(){if(this.isDroneActive&&this.audioCtx&&(this.isDroneActive=!1,this.droneGain)){let e=this.audioCtx.currentTime;this.droneGain.gain.cancelScheduledValues(e),this.droneGain.gain.linearRampToValueAtTime(1e-4,e+.08),setTimeout(()=>{for(let e of this.droneOscillators)if(e instanceof OscillatorNode)try{e.stop(),e.disconnect()}catch{}this.droneOscillators=[],this.droneGain?.disconnect(),this.droneGain=null},100)}}isDronePlaying(){return this.isDroneActive}getDroneFrequency(){return this.currentDroneFreq}buildSynthVoice(e,t,n,r,i,a,o){let s=[];if(r===`sine`){let r=e.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(n,i),r.connect(t),r.start(i),s.push(r),o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.8,i+.03),t.gain.exponentialRampToValueAtTime(1e-4,i+a),r.stop(i+a+.05))}else if(r===`triangle`){let r=e.createOscillator();r.type=`triangle`,r.frequency.setValueAtTime(n,i),r.connect(t),r.start(i),s.push(r),o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.8,i+.02),t.gain.exponentialRampToValueAtTime(1e-4,i+a),r.stop(i+a+.05))}else if(r===`reed`){let r=e.createBiquadFilter();r.type=`lowpass`,r.frequency.setValueAtTime(Math.min(3500,n*5),i),r.connect(t);for(let t of[{mult:1,gain:.7},{mult:3,gain:.25},{mult:5,gain:.08}]){let c=e.createOscillator(),l=e.createGain();c.type=`triangle`,c.frequency.setValueAtTime(n*t.mult,i),c.__harmonicMult=t.mult,l.gain.setValueAtTime(t.gain,i),c.connect(l),l.connect(r),c.start(i),s.push(c),o||c.stop(i+a+.05)}o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.8,i+.03),t.gain.exponentialRampToValueAtTime(1e-4,i+a))}else{let r=e.createBiquadFilter();r.type=`lowpass`,r.frequency.setValueAtTime(Math.min(5e3,n*6),i),r.connect(t);for(let t of[{mult:1,gain:.65,type:`sine`},{mult:2,gain:.25,type:`triangle`},{mult:3,gain:.12,type:`sine`},{mult:4,gain:.05,type:`sine`}]){let c=e.createOscillator(),l=e.createGain();c.type=t.type,c.frequency.setValueAtTime(n*t.mult,i),c.__harmonicMult=t.mult,l.gain.setValueAtTime(t.gain,i),c.connect(l),l.connect(r),c.start(i),s.push(c),o||c.stop(i+a+.05)}o||(t.gain.setValueAtTime(0,i),t.gain.linearRampToValueAtTime(.85,i+.015),t.gain.exponentialRampToValueAtTime(.2,i+.35),t.gain.exponentialRampToValueAtTime(1e-4,i+a))}o&&(this.droneOscillators=s)}},c=class{canvas;ctx;currentCents=0;targetCents=0;needleVelocity=0;hasActiveNote=!1;strobeOffset=0;lastTime=performance.now();constructor(e){this.canvas=e,this.ctx=e.getContext(`2d`,{alpha:!0}),this.handleResize(),window.addEventListener(`resize`,this.handleResize)}handleResize=()=>{let e=window.devicePixelRatio||1,t=this.canvas.getBoundingClientRect();t.width!==0&&t.height!==0&&(this.canvas.width=t.width*e,this.canvas.height=t.height*e,this.ctx.resetTransform(),this.ctx.scale(e,e),this.draw())};update(e){e&&e.frequency>0?(this.hasActiveNote=!0,this.targetCents=Math.max(-50,Math.min(50,e.cents))):(this.hasActiveNote=!1,this.targetCents=0),this.renderFrame()}renderFrame=()=>{let e=performance.now(),t=Math.min(.1,(e-this.lastTime)/1e3);this.lastTime=e;let n=(this.targetCents-this.currentCents)*120+-this.needleVelocity*16;if(this.needleVelocity+=n*t,this.currentCents+=this.needleVelocity*t,this.hasActiveNote){let e=this.currentCents*35;this.strobeOffset=(this.strobeOffset+e*t)%40}this.draw()};draw(){let e=this.canvas.getBoundingClientRect(),t=e.width,n=e.height;if(t===0||n===0)return;this.ctx.clearRect(0,0,t,n);let r=t/2,i=n*.72,a=Math.min(t*.44,n*.62),o=Math.PI*.82,s=Math.PI*2.18,c=s-o;this.ctx.save(),this.ctx.beginPath(),this.ctx.arc(r,i,a,o,s),this.ctx.lineWidth=10,this.ctx.strokeStyle=`rgba(255, 255, 255, 0.08)`,this.ctx.lineCap=`round`,this.ctx.stroke();let l=o+c*.5,u=5/100*c;this.ctx.beginPath(),this.ctx.arc(r,i,a,l-u,l+u),this.ctx.lineWidth=12,this.ctx.strokeStyle=`rgba(16, 185, 129, 0.45)`,this.ctx.stroke();for(let e of[{cents:-50,label:`-50`},{cents:-40,label:``},{cents:-30,label:`-30`},{cents:-20,label:``},{cents:-10,label:`-10`},{cents:0,label:`0`},{cents:10,label:`+10`},{cents:20,label:``},{cents:30,label:`+30`},{cents:40,label:``},{cents:50,label:`+50`}]){let t=o+(e.cents+50)/100*c,n=e.cents%10==0,s=e.cents===0,l=s?a-18:n?a-14:a-8,u=a+6,d=r+Math.cos(t)*l,f=i+Math.sin(t)*l,p=r+Math.cos(t)*u,m=i+Math.sin(t)*u;if(this.ctx.beginPath(),this.ctx.moveTo(d,f),this.ctx.lineTo(p,m),this.ctx.lineWidth=s?3.5:n?2:1,this.ctx.strokeStyle=s?`#10b981`:n?`rgba(255, 255, 255, 0.45)`:`rgba(255, 255, 255, 0.2)`,this.ctx.stroke(),e.label){let n=a-28,o=r+Math.cos(t)*n,c=i+Math.sin(t)*n;this.ctx.fillStyle=s?`#10b981`:`rgba(255, 255, 255, 0.5)`,this.ctx.font=s?`600 13px system-ui, sans-serif`:`500 11px system-ui, sans-serif`,this.ctx.textAlign=`center`,this.ctx.textBaseline=`middle`,this.ctx.fillText(e.label,o,c)}}let d=Math.max(-50,Math.min(50,this.currentCents)),f=o+(d+50)/100*c,p=Math.abs(d),m=`#ef4444`,h=`rgba(239, 68, 68, 0.5)`;this.hasActiveNote?p<=3?(m=`#10b981`,h=`rgba(16, 185, 129, 0.8)`):p<=7?(m=`#84cc16`,h=`rgba(132, 204, 22, 0.6)`):p<=15&&(m=`#f59e0b`,h=`rgba(245, 158, 11, 0.5)`):(m=`rgba(255, 255, 255, 0.25)`,h=`transparent`),this.hasActiveNote&&(this.ctx.shadowColor=h,this.ctx.shadowBlur=12);let g=a+2,_=r+Math.cos(f)*g,v=i+Math.sin(f)*g,y=f+Math.PI/2,b=r+Math.cos(y)*5,x=i+Math.sin(y)*5,S=r-Math.cos(y)*5,C=i-Math.sin(y)*5;this.ctx.beginPath(),this.ctx.moveTo(b,x),this.ctx.lineTo(_,v),this.ctx.lineTo(S,C),this.ctx.closePath(),this.ctx.fillStyle=m,this.ctx.fill(),this.ctx.shadowBlur=0,this.ctx.beginPath(),this.ctx.arc(r,i,9,0,Math.PI*2),this.ctx.fillStyle=`#1e293b`,this.ctx.fill(),this.ctx.lineWidth=3,this.ctx.strokeStyle=m,this.ctx.stroke();let w=n-26,T=Math.min(t*.75,360),E=r-T/2;this.ctx.fillStyle=`#0f172a`,this.ctx.beginPath(),this.ctx.roundRect(E,w,T,14,7),this.ctx.fill(),this.ctx.strokeStyle=`rgba(255, 255, 255, 0.12)`,this.ctx.lineWidth=1,this.ctx.stroke(),this.ctx.save(),this.ctx.beginPath(),this.ctx.roundRect(E,w,T,14,7),this.ctx.clip();let D=E-40+this.strobeOffset%24;for(let e=D;e<E+T+40;e+=24)this.ctx.fillStyle=this.hasActiveNote?p<=3?`rgba(16, 185, 129, 0.9)`:p<=10?`rgba(245, 158, 11, 0.7)`:`rgba(239, 68, 68, 0.7)`:`rgba(255, 255, 255, 0.1)`,this.ctx.fillRect(e,w,12,14);this.ctx.beginPath(),this.ctx.moveTo(r,w),this.ctx.lineTo(r,w+14),this.ctx.strokeStyle=`#ffffff`,this.ctx.lineWidth=2,this.ctx.stroke(),this.ctx.restore(),this.ctx.restore()}},l=class{canvas;ctx;mode=`pitch-history`;history=[];lastWaveform=new Float32Array;constructor(e){this.canvas=e,this.ctx=e.getContext(`2d`,{alpha:!0}),this.handleResize(),window.addEventListener(`resize`,this.handleResize)}setMode(e){this.mode=e,this.draw()}getMode(){return this.mode}handleResize=()=>{let e=window.devicePixelRatio||1,t=this.canvas.getBoundingClientRect();t.width!==0&&t.height!==0&&(this.canvas.width=t.width*e,this.canvas.height=t.height*e,this.ctx.resetTransform(),this.ctx.scale(e,e),this.draw())};update(e){let t=e.timestamp;for(e.frequency>0&&e.note?this.history.push({time:t,cents:e.note.cents,inTune:e.note.inTune,hasSound:!0}):this.history.push({time:t,cents:0,inTune:!1,hasSound:!1});this.history.length>0&&t-this.history[0].time>4500;)this.history.shift();this.lastWaveform=e.waveformData,this.draw()}clear(){this.history=[],this.draw()}draw(){let e=this.canvas.getBoundingClientRect(),t=e.width,n=e.height;t!==0&&n!==0&&(this.ctx.clearRect(0,0,t,n),this.mode===`waveform`?this.drawWaveform(t,n):this.drawPitchHistory(t,n))}drawPitchHistory(e,t){let n=t/2,r=t*.42/50;for(let t of[-50,-25,0,25,50]){let i=n-t*r,a=t===0;this.ctx.beginPath(),this.ctx.moveTo(0,i),this.ctx.lineTo(e,i),this.ctx.lineWidth=a?1.5:1,this.ctx.strokeStyle=a?`rgba(16, 185, 129, 0.4)`:`rgba(255, 255, 255, 0.07)`,this.ctx.stroke(),this.ctx.fillStyle=a?`rgba(16, 185, 129, 0.7)`:`rgba(255, 255, 255, 0.3)`,this.ctx.font=`10px system-ui, sans-serif`,this.ctx.textAlign=`right`,this.ctx.fillText((t>0?`+${t}`:`${t}`)+`¢`,e-8,i-3)}let i=n-5*r,a=10*r;if(this.ctx.fillStyle=`rgba(16, 185, 129, 0.08)`,this.ctx.fillRect(0,i,e,a),this.history.length<2)return;let o=this.history[this.history.length-1].time,s=!1;for(let t=0;t<this.history.length;t++){let i=this.history[t],a=e-(o-i.time)/4500*e,c=n-i.cents*r;if(!i.hasSound){s=!1;continue}s?this.ctx.lineTo(a,c):(this.ctx.beginPath(),this.ctx.moveTo(a,c),s=!0);let l=Math.abs(i.cents),u=l<=3?`#10b981`:l<=12?`#f59e0b`:`#ef4444`;t>0&&this.history[t-1].hasSound&&(this.ctx.lineWidth=3,this.ctx.strokeStyle=u,this.ctx.stroke(),this.ctx.beginPath(),this.ctx.moveTo(a,c))}let c=this.history[this.history.length-1];if(c&&c.hasSound){let t=n-c.cents*r,i=Math.abs(c.cents)<=3?`#10b981`:Math.abs(c.cents)<=12?`#f59e0b`:`#ef4444`;this.ctx.beginPath(),this.ctx.arc(e-4,t,5,0,Math.PI*2),this.ctx.fillStyle=i,this.ctx.shadowColor=i,this.ctx.shadowBlur=8,this.ctx.fill(),this.ctx.shadowBlur=0}}drawWaveform(e,t){let n=t/2;if(this.ctx.beginPath(),this.ctx.moveTo(0,n),this.ctx.lineTo(e,n),this.ctx.strokeStyle=`rgba(255, 255, 255, 0.08)`,this.ctx.lineWidth=1,this.ctx.stroke(),!this.lastWaveform||this.lastWaveform.length===0)return;this.ctx.beginPath();let r=e/512,i=0,a=Math.floor(this.lastWaveform.length/512);for(let e=0;e<512;e++){let o=n+(this.lastWaveform[e*a]||0)*(t*.42);e===0?this.ctx.moveTo(i,o):this.ctx.lineTo(i,o),i+=r}this.ctx.lineWidth=2,this.ctx.strokeStyle=`#38bdf8`,this.ctx.shadowColor=`rgba(56, 189, 248, 0.6)`,this.ctx.shadowBlur=6,this.ctx.stroke(),this.ctx.shadowBlur=0}},u=class{container;toneGen;startOctave=3;numOctaves=2;a4=440;notation=`sharp`;activeDetectedMidi=null;onNoteSelect;keyElements=new Map;constructor(e,t,n){this.container=e,this.toneGen=t,n?.startOctave!==void 0&&(this.startOctave=n.startOctave),n?.numOctaves!==void 0&&(this.numOctaves=n.numOctaves),n?.a4!==void 0&&(this.a4=n.a4),n?.notation!==void 0&&(this.notation=n.notation),this.render()}setOnNoteSelect(e){this.onNoteSelect=e}setA4(e){this.a4=e}setNotation(e){this.notation=e,this.render()}shiftOctave(e){let t=this.startOctave+e;t>=1&&t<=6&&(this.startOctave=t,this.render())}getStartOctave(){return this.startOctave}highlightMidi(e){if(this.activeDetectedMidi!==null&&this.activeDetectedMidi!==e){let e=this.keyElements.get(this.activeDetectedMidi);e&&e.classList.remove(`mic-detected`)}if(this.activeDetectedMidi=e,e!==null){let t=this.keyElements.get(e);t&&t.classList.add(`mic-detected`)}}render(){this.container.innerHTML=``,this.keyElements.clear();let n=document.createElement(`div`);n.className=`piano-wrapper`;let r=document.createElement(`div`);r.className=`piano-controls`;let a=document.createElement(`button`);a.type=`button`,a.className=`btn-octave`,a.innerHTML=`&#9664; Octave Down`,a.disabled=this.startOctave<=1,a.addEventListener(`click`,()=>this.shiftOctave(-1));let o=document.createElement(`span`);o.className=`piano-range-label`;let s=this.startOctave+this.numOctaves-1;o.textContent=`Range: C${this.startOctave} – B${s}`;let c=document.createElement(`button`);c.type=`button`,c.className=`btn-octave`,c.innerHTML=`Octave Up &#9654;`,c.disabled=this.startOctave>=6,c.addEventListener(`click`,()=>this.shiftOctave(1)),r.appendChild(a),r.appendChild(o),r.appendChild(c),n.appendChild(r);let l=document.createElement(`div`);l.className=`piano-keys-bed`,l.setAttribute(`role`,`region`),l.setAttribute(`aria-label`,`Interactive Piano Roll`);let u=this.numOctaves*12+1;for(let n=0;n<u;n++){let r=n%12,a=this.startOctave+Math.floor(n/12),o=[1,3,6,8,10].includes(r),s=(a+1)*12+r,c=i(r,a,this.a4),u=this.notation===`flat`?t[r]:e[r],d=`${u}${a}`,f=document.createElement(`button`);f.type=`button`,f.className=o?`piano-key black-key`:`piano-key white-key`,f.setAttribute(`data-midi`,String(s)),f.setAttribute(`data-freq`,c.toFixed(1)),f.setAttribute(`aria-label`,`${d} (${c.toFixed(1)} Hz)`),f.setAttribute(`tabindex`,`0`);let p=document.createElement(`span`);p.className=`key-label`,p.textContent=d,f.appendChild(p);let m=e=>{e.preventDefault(),this.toneGen.playNote(c,1.2),f.classList.add(`active-played`),setTimeout(()=>f.classList.remove(`active-played`),300),this.onNoteSelect&&this.onNoteSelect(c,u,a)};f.addEventListener(`pointerdown`,m),f.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&m(e)}),this.keyElements.set(s,f),l.appendChild(f)}n.appendChild(l),this.container.appendChild(n)}},d=class{container;options;noteLetterEl;noteOctaveEl;centsEl;freqEl;meterBarEl;statusBadgeEl;comparisonEl;constructor(e,t={}){this.container=e,this.options=t,this.render()}update(e,t,n){if(!e||!e.note||e.frequency<=0){this.resetUI();return}let r=e.note;this.noteLetterEl.textContent=`${r.noteName}`,this.noteOctaveEl.textContent=`${r.octave}`;let i=r.cents>0?`+`:``;this.centsEl.textContent=`${i}${r.cents}¢`,this.freqEl.textContent=`${r.frequency.toFixed(1)} Hz`;let a=(Math.max(-50,Math.min(50,r.cents))+50)/100*100;this.meterBarEl.style.left=`${a}%`;let o=Math.abs(r.cents);if(this.statusBadgeEl.className=`mini-status-badge`,this.meterBarEl.className=`mini-meter-needle`,o<=3?(this.statusBadgeEl.classList.add(`in-tune`),this.statusBadgeEl.textContent=`✓ IN TUNE`,this.meterBarEl.classList.add(`in-tune`)):o<=8?(this.statusBadgeEl.classList.add(`close`),this.statusBadgeEl.textContent=r.cents<0?`▲ SLIGHTLY FLAT`:`▼ SLIGHTLY SHARP`,this.meterBarEl.classList.add(`close`)):r.cents<0?(this.statusBadgeEl.classList.add(`flat`),this.statusBadgeEl.textContent=`▲ TUNE UP (${Math.abs(r.cents)}¢)`,this.meterBarEl.classList.add(`flat`)):(this.statusBadgeEl.classList.add(`sharp`),this.statusBadgeEl.textContent=`▼ TUNE DOWN (+${r.cents}¢)`,this.meterBarEl.classList.add(`sharp`)),this.comparisonEl&&t&&t>0){let r=Math.round(1200*Math.log2(e.frequency/t)),i=Math.abs(r);if(i<=3)this.comparisonEl.innerHTML=`
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
    `,this.noteLetterEl=this.container.querySelector(`#mini-note-letter`),this.noteOctaveEl=this.container.querySelector(`#mini-note-octave`),this.centsEl=this.container.querySelector(`#mini-cents`),this.freqEl=this.container.querySelector(`#mini-freq`),this.meterBarEl=this.container.querySelector(`#mini-needle`),this.statusBadgeEl=this.container.querySelector(`#mini-status`),this.options.showReferenceComparison&&(this.comparisonEl=this.container.querySelector(`#mini-comparison`))}},f=class{container;toneGen;a4=440;targetNoteIndex=9;targetOctave=4;targetFreq=440;matchHoldStartTime=null;streak=0;isMatched=!1;targetNoteDisplay;targetFreqDisplay;statusText;matchRingProgress;streakBadge;miniTuner;constructor(e,t,n=440){this.container=e,this.toneGen=t,this.a4=n,this.updateTargetFreq(),this.render()}setA4(e){this.a4=e,this.updateTargetFreq(),this.updateUI()}updateTargetFreq(){this.targetFreq=i(this.targetNoteIndex,this.targetOctave,this.a4)}setTarget(e,t){this.targetNoteIndex=e,this.targetOctave=t,this.updateTargetFreq(),this.resetMatch(),this.updateUI()}randomTarget(){let e=Math.floor(Math.random()*22);this.targetNoteIndex=e%12,this.targetOctave=3+Math.floor(e/12),this.updateTargetFreq(),this.resetMatch(),this.updateUI(),this.playTargetTone()}playTargetTone(){this.toneGen.playNote(this.targetFreq,1.8,`acoustic`)}toggleTargetDrone(){this.toneGen.isDronePlaying()?this.toneGen.stopDrone():this.toneGen.startDrone(this.targetFreq,`sine`)}resetMatch(){this.matchHoldStartTime=null,this.isMatched=!1,this.matchRingProgress&&(this.matchRingProgress.style.strokeDashoffset=`283`),this.statusText&&(this.statusText.textContent=`Sing or play into the mic to match...`,this.statusText.className=`trainer-status-text`)}updatePitch(t){let n=`${e[this.targetNoteIndex]}${this.targetOctave}`;this.miniTuner&&this.miniTuner.update(t,this.targetFreq,n);let r=t?.note;if(!r||r.frequency<=0){this.resetMatch();return}let i=(this.targetOctave+1)*12+this.targetNoteIndex,a=r.midi-i,o=a*100,s=Math.abs(o);if(s<=7){let e=performance.now();this.matchHoldStartTime||=e;let t=e-this.matchHoldStartTime,n=Math.min(1,t/700),i=283*(1-n);this.matchRingProgress.style.strokeDashoffset=`${i}`,n>=1&&!this.isMatched?(this.isMatched=!0,this.streak++,this.statusText.textContent=`🎯 Excellent! Pitch Matched (${r.cents>0?`+`:``}${r.cents}¢)`,this.statusText.className=`trainer-status-text matched`,this.streakBadge.textContent=`Streak: ${this.streak} 🔥`,this.toneGen.playNote(this.targetFreq*2,.4,`sine`),setTimeout(()=>{this.isMatched&&this.randomTarget()},1400)):this.isMatched||(this.statusText.textContent=`Holding steady... ${(n*100).toFixed(0)}%`,this.statusText.className=`trainer-status-text holding`)}else this.matchHoldStartTime=null,this.matchRingProgress.style.strokeDashoffset=`283`,Math.abs(a)>2?this.statusText.textContent=`Heard: ${r.noteName}${r.octave} (${r.frequency} Hz)`:o>0?this.statusText.textContent=`Too Sharp (+${Math.round(s)}¢) — lower your pitch`:this.statusText.textContent=`Too Flat (-${Math.round(s)}¢) — raise your pitch`,this.statusText.className=`trainer-status-text`}updateUI(){let t=e[this.targetNoteIndex];this.targetNoteDisplay&&(this.targetNoteDisplay.textContent=`${t}${this.targetOctave}`),this.targetFreqDisplay&&(this.targetFreqDisplay.textContent=`${this.targetFreq.toFixed(1)} Hz`)}render(){this.container.innerHTML=`
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
    `,this.targetNoteDisplay=this.container.querySelector(`#trainer-note-name`),this.targetFreqDisplay=this.container.querySelector(`#trainer-note-freq`),this.statusText=this.container.querySelector(`#trainer-status`),this.matchRingProgress=this.container.querySelector(`#trainer-ring-prog`),this.streakBadge=this.container.querySelector(`#trainer-streak`);let t=this.container.querySelector(`#trainer-mini-tuner`);this.miniTuner=new d(t,{label:`Live Pitch Monitor (Trainer)`,showReferenceComparison:!1,compact:!0}),this.container.querySelector(`#btn-play-target`)?.addEventListener(`click`,()=>this.playTargetTone()),this.container.querySelector(`#btn-drone-target`)?.addEventListener(`click`,()=>this.toggleTargetDrone()),this.container.querySelector(`#btn-new-target`)?.addEventListener(`click`,()=>this.randomTarget())}},p=[{id:`chromatic`,name:`Chromatic (All)`,category:`general`,description:`Detects any musical note across all octaves. Ideal for any instrument, piano, or voice.`,notes:[]},{id:`guitar-standard`,name:`Guitar (Standard)`,category:`instruments`,description:`Standard 6-string guitar tuning (E2 - A2 - D3 - G3 - B3 - E4).`,notes:[{label:`6: E2`,name:`E`,octave:2,noteIndex:4,midi:40},{label:`5: A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`4: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`3: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`2: B3`,name:`B`,octave:3,noteIndex:11,midi:59},{label:`1: E4`,name:`E`,octave:4,noteIndex:4,midi:64}]},{id:`guitar-drop-d`,name:`Guitar (Drop D)`,category:`instruments`,description:`Drop D tuning (D2 - A2 - D3 - G3 - B3 - E4). Popular in rock and metal.`,notes:[{label:`6: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`5: A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`4: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`3: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`2: B3`,name:`B`,octave:3,noteIndex:11,midi:59},{label:`1: E4`,name:`E`,octave:4,noteIndex:4,midi:64}]},{id:`guitar-dadgad`,name:`Guitar (DADGAD)`,category:`instruments`,description:`Celtic and acoustic fingerstyle tuning (D2 - A2 - D3 - G3 - A3 - D4).`,notes:[{label:`6: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`5: A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`4: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`3: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`2: A3`,name:`A`,octave:3,noteIndex:9,midi:57},{label:`1: D4`,name:`D`,octave:4,noteIndex:2,midi:62}]},{id:`bass-4`,name:`Bass (4-String)`,category:`instruments`,description:`Standard 4-string electric bass (E1 - A1 - D2 - G2).`,notes:[{label:`4: E1`,name:`E`,octave:1,noteIndex:4,midi:28},{label:`3: A1`,name:`A`,octave:1,noteIndex:9,midi:33},{label:`2: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`1: G2`,name:`G`,octave:2,noteIndex:7,midi:43}]},{id:`bass-5`,name:`Bass (5-String)`,category:`instruments`,description:`5-string electric bass with low B (B0 - E1 - A1 - D2 - G2).`,notes:[{label:`5: B0`,name:`B`,octave:0,noteIndex:11,midi:23},{label:`4: E1`,name:`E`,octave:1,noteIndex:4,midi:28},{label:`3: A1`,name:`A`,octave:1,noteIndex:9,midi:33},{label:`2: D2`,name:`D`,octave:2,noteIndex:2,midi:38},{label:`1: G2`,name:`G`,octave:2,noteIndex:7,midi:43}]},{id:`ukulele-soprano`,name:`Ukulele (Standard C)`,category:`instruments`,description:`Standard re-entrant Soprano/Concert/Tenor tuning (G4 - C4 - E4 - A4).`,notes:[{label:`4: G4`,name:`G`,octave:4,noteIndex:7,midi:67},{label:`3: C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`2: E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`1: A4`,name:`A`,octave:4,noteIndex:9,midi:69}]},{id:`violin`,name:`Violin`,category:`instruments`,description:`Standard orchestral violin tuning in perfect fifths (G3 - D4 - A4 - E5).`,notes:[{label:`4: G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`3: D4`,name:`D`,octave:4,noteIndex:2,midi:62},{label:`2: A4`,name:`A`,octave:4,noteIndex:9,midi:69},{label:`1: E5`,name:`E`,octave:5,noteIndex:4,midi:76}]},{id:`cello`,name:`Cello`,category:`instruments`,description:`Standard cello tuning in fifths (C2 - G2 - D3 - A3).`,notes:[{label:`4: C2`,name:`C`,octave:2,noteIndex:0,midi:36},{label:`3: G2`,name:`G`,octave:2,noteIndex:7,midi:43},{label:`2: D3`,name:`D`,octave:3,noteIndex:2,midi:50},{label:`1: A3`,name:`A`,octave:3,noteIndex:9,midi:57}]},{id:`voice-tenor`,name:`Voice: Tenor`,category:`voice`,description:`High male voice range typically from C3 (131 Hz) to C5 (523 Hz).`,notes:[{label:`Low C3`,name:`C`,octave:3,noteIndex:0,midi:48},{label:`E3`,name:`E`,octave:3,noteIndex:4,midi:52},{label:`G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`Mid C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`G4`,name:`G`,octave:4,noteIndex:7,midi:67},{label:`High C5`,name:`C`,octave:5,noteIndex:0,midi:72}]},{id:`voice-baritone`,name:`Voice: Baritone`,category:`voice`,description:`Mid male voice range typically from A2 (110 Hz) to A4 (440 Hz).`,notes:[{label:`Low A2`,name:`A`,octave:2,noteIndex:9,midi:45},{label:`C3`,name:`C`,octave:3,noteIndex:0,midi:48},{label:`E3`,name:`E`,octave:3,noteIndex:4,midi:52},{label:`A3`,name:`A`,octave:3,noteIndex:9,midi:57},{label:`C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`High A4`,name:`A`,octave:4,noteIndex:9,midi:69}]},{id:`voice-bass`,name:`Voice: Bass`,category:`voice`,description:`Deep male voice range typically from E2 (82 Hz) to E4 (330 Hz).`,notes:[{label:`Low E2`,name:`E`,octave:2,noteIndex:4,midi:40},{label:`G2`,name:`G`,octave:2,noteIndex:7,midi:43},{label:`C3`,name:`C`,octave:3,noteIndex:0,midi:48},{label:`E3`,name:`E`,octave:3,noteIndex:4,midi:52},{label:`G3`,name:`G`,octave:3,noteIndex:7,midi:55},{label:`C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`High E4`,name:`E`,octave:4,noteIndex:4,midi:64}]},{id:`voice-soprano`,name:`Voice: Soprano`,category:`voice`,description:`High female voice range typically from C4 (261 Hz) to C6 (1046 Hz).`,notes:[{label:`Low C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`E4`,name:`E`,octave:4,noteIndex:4,midi:64},{label:`G4`,name:`G`,octave:4,noteIndex:7,midi:67},{label:`C5`,name:`C`,octave:5,noteIndex:0,midi:72},{label:`E5`,name:`E`,octave:5,noteIndex:4,midi:76},{label:`G5`,name:`G`,octave:5,noteIndex:7,midi:79},{label:`High C6`,name:`C`,octave:6,noteIndex:0,midi:84}]},{id:`voice-alto`,name:`Voice: Alto / Contralto`,category:`voice`,description:`Lower female voice range typically from F3 (175 Hz) to F5 (698 Hz).`,notes:[{label:`Low F3`,name:`F`,octave:3,noteIndex:5,midi:53},{label:`A3`,name:`A`,octave:3,noteIndex:9,midi:57},{label:`C4`,name:`C`,octave:4,noteIndex:0,midi:60},{label:`F4`,name:`F`,octave:4,noteIndex:5,midi:65},{label:`A4`,name:`A`,octave:4,noteIndex:9,midi:69},{label:`C5`,name:`C`,octave:5,noteIndex:0,midi:72},{label:`High F5`,name:`F`,octave:5,noteIndex:5,midi:77}]}],m=new o,h=new s,g=p[1],_=`sharp`,v=440,y=9,b=4,x=440,S=`acoustic`;try{let e=localStorage.getItem(`tunerlab_a4`);e&&(v=Number(e)||440);let t=localStorage.getItem(`tunerlab_notation`);t&&(_=t);let n=localStorage.getItem(`tunerlab_preset`);if(n){let e=p.find(e=>e.id===n);e&&(g=e)}}catch{}m.setA4(v),m.setNotation(_);var C=document.querySelector(`#app`);C.innerHTML=`
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
        <span class="value-text" id="a4-display">${v} Hz</span>
        <button type="button" class="stepper-btn" id="btn-a4-plus" aria-label="Increase A4 pitch">+</button>
      </div>

      <!-- Notation Selector -->
      <div class="control-badge">
        <label for="notation-select">Keys</label>
        <select class="app-select" id="notation-select" aria-label="Select musical notation style">
          <option value="sharp" ${_===`sharp`?`selected`:``}>Sharps (♯)</option>
          <option value="flat" ${_===`flat`?`selected`:``}>Flats (♭)</option>
          <option value="solfege" ${_===`solfege`?`selected`:``}>Solfège (Do-Re-Mi)</option>
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
            <h3 id="preset-title">${g.name}</h3>
            <p id="preset-desc">${g.description}</p>
          </div>
          <select class="app-select" id="preset-select" aria-label="Select instrument tuning or vocal profile">
            ${p.map(e=>`<option value="${e.id}" ${e.id===g.id?`selected`:``}>${e.name}</option>`).join(``)}
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

        <!-- VU Level & Noise Gate Controls -->
        <div class="audio-meter-bar">
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">MIC LEVEL</span>
          <div class="vu-meter-wrap">
            <div class="vu-meter-level" id="vu-meter-bar"></div>
          </div>
          <div class="gate-control-wrap">
            <label for="noise-gate-slider">Gate Threshold:</label>
            <input type="range" id="noise-gate-slider" min="0.002" max="0.04" step="0.002" value="0.008" />
          </div>
          <div class="gate-control-wrap">
            <label>
              <input type="checkbox" id="raw-audio-toggle" checked />
              Raw Musician Audio
            </label>
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
            <span>🔊</span> Play Note (${e[y]}${b} &bull; ${x.toFixed(1)} Hz)
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
              ${e.map((e,t)=>`<button type="button" class="note-grid-btn ${t===y?`active`:``}" data-idx="${t}">${e}</button>`).join(``)}
            </div>
          </div>

          <!-- Octave & Timbre -->
          <div class="control-panel-box">
            <h4>2. Octave & Timbre</h4>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Octave:</span>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button type="button" class="stepper-btn" id="btn-gen-oct-minus">-</button>
                <span class="value-text" id="gen-oct-display">${b}</span>
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
                <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;" id="gen-freq-display">${x.toFixed(1)} Hz</span>
              </div>
              <input type="range" id="gen-freq-slider" min="50" max="1500" step="0.5" value="${x}" style="width: 100%;" />
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
  </main>

  <!-- Footer with keyboard shortcuts -->
  <footer class="app-footer">
    <div class="footer-shortcuts">
      <span>Shortcuts:</span>
      <kbd>Space</kbd> Toggle Mic &bull;
      <kbd>1-4</kbd> Switch Tabs &bull;
      <kbd>D</kbd> Toggle Drone &bull;
      <kbd>M</kbd> Mute
    </div>
    <div>TunerLab &bull; Web Audio & DSP Pitch Detection</div>
  </footer>
`;var w=new c(document.querySelector(`#tuner-gauge-canvas`)),T=new l(document.querySelector(`#pitch-trace-canvas`)),E=new u(document.querySelector(`#piano-container`),h,{startOctave:3,numOctaves:2,a4:v,notation:_}),D=new f(document.querySelector(`#trainer-container`),h,v),ee=new d(document.querySelector(`#generator-mini-tuner`),{label:`Live Voice / Instrument Pitch Matcher`,showReferenceComparison:!0}),te=new d(document.querySelector(`#piano-mini-tuner`),{label:`Live Microphone Pitch Tracker`,compact:!0}),O=document.querySelector(`#btn-master-mic`),k=document.querySelector(`#mic-status-label`),ne=document.querySelector(`#note-letter`),re=document.querySelector(`#note-accidental`),ie=document.querySelector(`#note-octave`),ae=document.querySelector(`#note-solfege`),A=document.querySelector(`#tuning-guidance`),oe=document.querySelector(`#stat-cents`),se=document.querySelector(`#stat-freq`),ce=document.querySelector(`#stat-target-freq`),j=document.querySelector(`#vu-meter-bar`),M=document.querySelector(`#tuner-hero-card`);m.subscribe(t=>{let n=Math.min(100,Math.round(t.rms*350));j&&(j.style.width=`${n}%`),T.update(t),D.updatePitch(t);let r=`${e[y]}${b}`;if(ee.update(t,x,r),te.update(t),t.note&&t.frequency>0){let e=t.note;ne.textContent=e.noteName[0],re.textContent=e.accidental,ie.textContent=String(e.octave),ae.textContent=`Solfège: ${e.solfege} ${e.octave}`,oe.textContent=`${e.cents>0?`+`:``}${e.cents}¢`,se.textContent=`${e.frequency.toFixed(1)} Hz`,ce.textContent=`${e.targetFrequency.toFixed(1)} Hz`,M.className=`tuner-hero-card`,A.className=`tuning-guidance-badge`,Math.abs(e.cents)<=3?(M.classList.add(`in-tune`),A.classList.add(`in-tune`),A.textContent=`✓ PERFECT IN TUNE`):Math.abs(e.cents)<=8?(M.classList.add(`close-tune`),e.cents<0?(A.classList.add(`flat`),A.textContent=`▲ SLIGHTLY FLAT`):(A.classList.add(`sharp`),A.textContent=`▼ SLIGHTLY SHARP`)):e.cents<0?(M.classList.add(`flat-tune`),A.classList.add(`flat`),A.textContent=`▲ TUNE UP (${Math.abs(e.cents)}¢ FLAT)`):(M.classList.add(`sharp-tune`),A.classList.add(`sharp`),A.textContent=`▼ TUNE DOWN (+${e.cents}¢ SHARP)`),w.update(e),E.highlightMidi(Math.round(e.midi)),I(e.midi,Math.abs(e.cents)<=3)}else w.update(null),E.highlightMidi(null),I(null,!1),m.isListening()?(A.textContent=`Listening for notes...`,A.className=`tuning-guidance-badge`):(A.textContent=`Microphone off. Click Start Listening.`,A.className=`tuning-guidance-badge`)});var N=document.querySelector(`#preset-select`),P=document.querySelector(`#preset-strings-container`),le=document.querySelector(`#preset-title`),ue=document.querySelector(`#preset-desc`);function F(){if(le.textContent=g.name,ue.textContent=g.description,P.innerHTML=``,g.notes.length===0){let n=document.createElement(`div`);n.style.display=`flex`,n.style.flexWrap=`wrap`,n.style.gap=`0.5rem`,(_===`flat`?t:e).forEach((e,t)=>{let r=document.createElement(`button`);r.type=`button`,r.className=`string-btn`;let a=i(t,4,v);r.innerHTML=`
        <span class="string-name">${e}4</span>
        <span class="string-freq">${a.toFixed(1)} Hz</span>
      `,r.title=`Click to hear ${e}4 reference pitch`,r.addEventListener(`click`,()=>{h.playNote(a,1.2)}),n.appendChild(r)}),P.appendChild(n);return}g.notes.forEach(e=>{let t=document.createElement(`button`);t.type=`button`,t.className=`string-btn`,t.setAttribute(`data-midi`,String(e.midi));let n=i(e.noteIndex,e.octave,v);t.innerHTML=`
      <span class="string-name">${e.label}</span>
      <span class="string-freq">${n.toFixed(1)} Hz</span>
    `,t.title=`Click to hear ${e.label} reference tone`,t.addEventListener(`click`,()=>{h.playNote(n,1.5)}),P.appendChild(t)})}function I(e,t){P.querySelectorAll(`.string-btn`).forEach(n=>{let r=n.getAttribute(`data-midi`);if(!r||e===null){n.classList.remove(`active-target`,`in-tune-string`);return}let i=Number(r);Math.abs(e-i)<=1.2?(n.classList.add(`active-target`),t?n.classList.add(`in-tune-string`):n.classList.remove(`in-tune-string`)):n.classList.remove(`active-target`,`in-tune-string`)})}N.addEventListener(`change`,()=>{let e=p.find(e=>e.id===N.value);e&&(g=e,localStorage.setItem(`tunerlab_preset`,e.id),F())}),F();async function L(){if(m.isListening())m.stop(),O.classList.remove(`listening`),k.textContent=`Start Listening`;else{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){if(window.location.protocol===`http:`&&window.location.hostname!==`localhost`){let e=`https://${window.location.hostname}:5174/`;if(confirm(`Mobile browsers require HTTPS for microphone access.\n\nOpen the HTTPS version at ${e}?`)){window.location.href=e;return}}alert(`Microphone access is not supported over insecure HTTP. Please use https:// on mobile.`);return}try{k.textContent=`Connecting...`,await m.start(),O.classList.add(`listening`),k.textContent=`Microphone Active`}catch{k.textContent=`Mic Error (Click to retry)`,O.classList.remove(`listening`),alert(`Could not access microphone. Please ensure microphone permissions are granted.`)}}}O.addEventListener(`click`,L);var de=document.querySelector(`#a4-display`),fe=document.querySelector(`#btn-a4-minus`),pe=document.querySelector(`#btn-a4-plus`);function R(e){v=Math.max(415,Math.min(466,e)),de.textContent=`${v} Hz`,m.setA4(v),E.setA4(v),D.setA4(v),$(),F(),localStorage.setItem(`tunerlab_a4`,String(v))}fe.addEventListener(`click`,()=>R(v-1)),pe.addEventListener(`click`,()=>R(v+1));var z=document.querySelector(`#notation-select`);z.addEventListener(`change`,()=>{_=z.value,m.setNotation(_),E.setNotation(_),F(),localStorage.setItem(`tunerlab_notation`,_)});var B=document.querySelector(`#master-volume`),V=document.querySelector(`#btn-mute`),H=!1,U=.6;B.addEventListener(`input`,()=>{let e=parseFloat(B.value);h.setVolume(e),H=e===0,V.textContent=H?`🔇`:`🔊`}),V.addEventListener(`click`,()=>{H?(H=!1,B.value=String(U||.6),h.setVolume(U||.6),V.textContent=`🔊`):(U=parseFloat(B.value),H=!0,B.value=`0`,h.setVolume(0),V.textContent=`🔇`)});var W=document.querySelector(`#noise-gate-slider`);W.addEventListener(`input`,()=>{m.setNoiseGate(parseFloat(W.value))});var G=document.querySelector(`#raw-audio-toggle`);G.addEventListener(`change`,()=>{m.setRawAudioMode(G.checked)});var me=document.querySelectorAll(`.viz-toggle-btn`),he=document.querySelector(`#viz-title`);me.forEach(e=>{e.addEventListener(`click`,()=>{me.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`);let t=e.getAttribute(`data-viz`);T.setMode(t),he.textContent=t===`waveform`?`Live Audio Waveform`:`Pitch Stability Trace`})});var ge=document.querySelectorAll(`.tab-btn`),_e=document.querySelectorAll(`.tab-panel`);function K(e){ge.forEach(t=>{let n=t.getAttribute(`data-tab`)===e;t.classList.toggle(`active`,n),t.setAttribute(`aria-selected`,String(n))}),_e.forEach(t=>{let n=t.id===`panel-${e}`;t.classList.toggle(`active`,n)}),e===`tuner`&&setTimeout(()=>{w.handleResize(),T.handleResize()},50)}ge.forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-tab`);t&&K(t)})});var q=document.querySelector(`#btn-play-tone`),J=document.querySelector(`#btn-drone-toggle`),Y=document.querySelectorAll(`.note-grid-btn`),X=document.querySelector(`#gen-oct-display`),ve=document.querySelector(`#btn-gen-oct-minus`),ye=document.querySelector(`#btn-gen-oct-plus`),Z=document.querySelector(`#gen-freq-display`),Q=document.querySelector(`#gen-freq-slider`),be=document.querySelectorAll(`.timbre-btn`);function $(){x=i(y,b,v),Z.textContent=`${x.toFixed(1)} Hz`,Q.value=String(x),q.innerHTML=`<span>🔊</span> Play Note (${e[y]}${b} &bull; ${x.toFixed(1)} Hz)`,h.isDronePlaying()&&h.updateDroneFrequency(x)}Y.forEach(e=>{e.addEventListener(`click`,()=>{Y.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),y=Number(e.getAttribute(`data-idx`)),$()})}),ve.addEventListener(`click`,()=>{b>1&&(b--,X.textContent=String(b),$())}),ye.addEventListener(`click`,()=>{b<7&&(b++,X.textContent=String(b),$())}),Q.addEventListener(`input`,()=>{x=parseFloat(Q.value),Z.textContent=`${x.toFixed(1)} Hz`,q.innerHTML=`<span>🔊</span> Play Custom (${x.toFixed(1)} Hz)`,h.isDronePlaying()&&h.updateDroneFrequency(x)}),be.forEach(e=>{e.addEventListener(`click`,()=>{be.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),S=e.getAttribute(`data-timbre`),h.setTimbre(S)})}),q.addEventListener(`click`,()=>{h.playNote(x,1.5,S)}),J.addEventListener(`click`,()=>{h.isDronePlaying()?(h.stopDrone(),J.classList.remove(`active`),J.innerHTML=`<span>〰️</span> Start Continuous Drone`):(h.startDrone(x,S),J.classList.add(`active`),J.innerHTML=`<span>⏹️</span> Stop Continuous Drone`)}),E.setOnNoteSelect((t,n,r)=>{x=t,b=r;let i=e.indexOf(n);i!==-1&&(y=i),X.textContent=String(b),Z.textContent=`${x.toFixed(1)} Hz`,Q.value=String(x),Y.forEach(e=>{e.classList.toggle(`active`,Number(e.getAttribute(`data-idx`))===y)}),q.innerHTML=`<span>🔊</span> Play Note (${n}${r} &bull; ${x.toFixed(1)} Hz)`}),window.addEventListener(`keydown`,e=>{e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||(e.code===`Space`?(e.preventDefault(),L()):e.key===`1`?K(`tuner`):e.key===`2`?K(`generator`):e.key===`3`?K(`piano`):e.key===`4`?K(`trainer`):e.key.toLowerCase()===`d`?J.click():e.key.toLowerCase()===`m`&&V.click())});