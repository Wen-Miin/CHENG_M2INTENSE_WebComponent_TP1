import './libs/webaudio-controls.js';

const getBaseURL = () => {
    return new URL('.', import.meta.url);
};

const template = document.createElement("template");
template.innerHTML = /*html*/`
  <style>
  canvas {
      border:1px solid black;
  }
  </style>
  
  <canvas id="myCanvasSound" width=400></canvas>
  <canvas id="myCanvasFrequence" width=400></canvas>

  <audio id="myPlayer" crossorigin="anonymous" controls></audio>
    <br>
    Progression : <input id="progress" type="range" value=0 min=0 max=1>
    </br>
    
  <button id="play"> <img src="http://www.i2clipart.com/cliparts/0/2/f/c/clipart-windows-media-player-play-button-updated-512x512-02fc.png" height="30" width="30"> </img> </br> Play </button> 
  <button id="pause"> <img src= "https://pixabay.com/static/uploads/photo/2014/04/02/10/22/pause-303651_960_720.png" height="30" width="30"> </br> Pause </img> </button>
  <button id="recule10"> <img src= "https://www.clker.com/cliparts/z/d/S/G/q/a/windows-media-player-skip-back-button-hi.png" height="30" width="30"> </img></br> -10s </button>
  <button id="avance10"> <img src= "http://www.clker.com/cliparts/r/g/H/t/P/o/windows-media-player-skip-forward-button-hi.png" height="30" width="30"> </br> +10s </button>
  <button id="replay"><img src= "https://www.freeiconspng.com/uploads/restore-icon-png-10.png" height="30" width="30"> </br> Replay </img></button>
  <button id="mute"> <img src= "https://freesvg.org/img/mute-2.png" height="30" width="30"> </br> Mute </img></button>

  <webaudio-knob id="volumeKnob" 
    src="myComponents/assets/imgs/LittlePhatty.png" 
    value=50 min=0 max=100 step=0.1 
    diameter="35" 
    tooltip="Volume: %d">
  </webaudio-knob>
  
  <br>
  <label>Vitesse de lecture
     0 <input id="vitesseLecture" type="range" min=0.2 max=4 step=0.1 value=1> 4
  </label>
  <br>

  `;

class MyAudioPlayer extends HTMLElement {

    // On récupère les éléments du DOM
    constructor() {
        super();
        // Récupération des attributs HTML
        //this.value = this.getAttribute("value");

        // On crée un shadow DOM
        this.attachShadow({ mode: "open" });

        console.log("URL de base du composant : " + getBaseURL())
    }

    defineInitialValues() {
        const volumeMax = this.audioCtx.destination.maxGain;
        const volumeKnob = this.shadowRoot.querySelector("#volumeKnob");
        volumeKnob.value = volumeMax * 100;
        this.volume = 0.5;
        this.progress = 0;
        this.playing = false;
        this.vitesseLecture = 1;
    }

    connectedCallback() {
        // Appelée automatiquement par le browser
        // quand il insère le web component dans le DOM
        // de la page du parent..

        // On clone le template HTML/CSS (la gui du wc)
        // et on l'ajoute dans le shadow DOM
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // fix relative URLs
        this.fixRelativeURLs();

        this.player = this.shadowRoot.querySelector("#myPlayer");
        this.player.src = this.getAttribute("src");

        // récupérer le canvas
        this.canvas = this.shadowRoot.querySelector("#myCanvas");
        this.canvasCtx = this.canvas.getContext("2d");

        // Récupération du contexte WebAudio
        this.audioCtx = new AudioContext();

        // on définit les écouteurs etc.
        this.defineListeners();

        // On construit un graphe webaudio pour capturer
        // le son du lecteur et pouvoir le traiter
        // en insérant des "noeuds" webaudio dans le graphe
        this.buildAudioGraph();

        // on démarre l'animation
        requestAnimationFrame(() => {
            this.animationLoop();
        });
    }

    buildAudioGraph() {
        let audioContext = this.audioCtx;

        let playerNode = audioContext.createMediaElementSource(this.player);

        // Create an analyser node
        this.analyserNode = audioContext.createAnalyser();

        // Try changing for lower values: 512, 256, 128, 64...
        this.analyserNode.fftSize = 512;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // lecteur audio -> analyser -> haut parleurs
        playerNode.connect(this.analyserNode);
        this.analyserNode.connect(audioContext.destination);

        
    }


    animationLoop() {
        // 1 on efface le canvas
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2 on dessine les objets
        //this.canvasCtx.fillRect(10+Math.random()*20, 10, 100, 100);
        // Get the analyser data
        this.analyserNode.getByteFrequencyData(this.dataArray);

        let barWidth = this.canvas.width / this.bufferLength;
        let barHeight;
        let x = 0;

        // values go from 0 to 256 and the canvas heigt is 100. Let's rescale
        // before drawing. This is the scale factor
        let heightScale = this.canvas.height / 128;

        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = this.dataArray[i];

            this.canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            barHeight *= heightScale;
            this.canvasCtx.fillRect(x, this.canvas.height - barHeight / 2, barWidth, barHeight / 2);

            // 2 is the number of pixels between bars
            x += barWidth + 1;
        }
        // 3 on deplace les objets

        // 4 On demande au navigateur de recommencer l'animation
        requestAnimationFrame(() => {
            this.animationLoop();
        });
    }

    fixRelativeURLs() {
        const elems = this.shadowRoot.querySelectorAll("webaudio-knob, webaudio-slider, webaudio-switch, img");
        elems.forEach(e => {
            const path = e.src;
            if (path.startsWith(".")) {
                e.src = getBaseURL() + path;
            }
        });
    }

    defineListeners() {
        this.shadowRoot.querySelector("#play").onclick = () => {
            this.player.play();
            this.audioCtx.resume(); // à cause de la politique de Chrome (autoplay) qui bloque le son s'il n'y pas de user interaction
        }

        this.shadowRoot.querySelector("#pause").onclick = () => {
            this.player.pause();
            console.log("mise en pause");
        }

        this.shadowRoot.querySelector("#recule10").onclick = () => {
            this.player.currentTime -= 10;
            console.log("reculé de 10" + this.player.currentTime);
        }

        this.shadowRoot.querySelector("#avance10").onclick = () => {
            this.player.currentTime += 10;
            console.log("avancé de 10" + this.player.currentTime);
        }

        this.shadowRoot.querySelector("#replay").onclick = () => {
            this.player.currentTime = 0;
            console.log("replay , remise à " + this.player.currentTime);
        }


        this.shadowRoot.querySelector("#vitesseLecture").oninput = (event) => {
            this.player.playbackRate = parseFloat(event.target.value);
            console.log("vitesse =  " + this.player.playbackRate);
        }

        this.shadowRoot.querySelector("#progress").onchange = (event) => {
            const tempsActuel = this.player.currentTime * (parseFloat(event.target.value) - 1000 / 60);
            //tempsActuel = parseFloat(event.target.value);
            console.log("progression =  " + this.player.currentTime);
            this.player.currentTime = event.target.value
        }

        this.shadowRoot.querySelector("#volumeKnob").oninput = (event) => {
            this.player.volume = (parseFloat(event.target.value) / 100).toFixed(2);
            //this.player.volume = parseFloat(value, 10);
            //this.player.volume = parseFloat(event);
            console.log("volumeKnob = " + this.player.volume);
        }


        //this.shadowRoot.querySelector("#volumeKnob").addEventListener('input', (evt) => {
        //    this.player.volume = (evt.target.value);
        //    this.consolelog("volume = " + this.player.volume);
        //  });


        this.player.ontimeupdate = (event) => {
            let progressSlider = this.shadowRoot.querySelector("#progress");
            progressSlider.max = this.player.duration;
            progressSlider.min = 0;
            progressSlider.value = this.player.currentTime;
        }


    }

    // L'API du Web Component

}

customElements.define("my-player", MyAudioPlayer);
