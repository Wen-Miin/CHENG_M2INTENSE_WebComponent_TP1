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
  
  <canvas id="myCanvasFrequency" width=400></canvas>
  <canvas id="myCanvasWaveForm" width=400></canvas>

  <br>
  <br>

  <audio id="myPlayer" crossorigin="anonymous" controls></audio>

    <br>
    Progression : <input id="progress" type="range" value=0 min=0 max=1>
    <span id="TempsActuel"></span> /
    <span id="Durée"></span>
    <br>

  <button id="play"> <img src="http://www.i2clipart.com/cliparts/0/2/f/c/clipart-windows-media-player-play-button-updated-512x512-02fc.png" height="30" width="30"> </img> </br> Play </button> 
  <button id="pause"> <img src= "https://pixabay.com/static/uploads/photo/2014/04/02/10/22/pause-303651_960_720.png" height="30" width="30"> </br> Pause </img> </button>
  <button id="recule10"> <img src= "https://www.clker.com/cliparts/z/d/S/G/q/a/windows-media-player-skip-back-button-hi.png" height="30" width="30"> </img></br> -10s </button>
  <button id="avance10"> <img src= "http://www.clker.com/cliparts/r/g/H/t/P/o/windows-media-player-skip-forward-button-hi.png" height="30" width="30"> </br> +10s </button>
  <button id="replay"><img src= "https://www.freeiconspng.com/uploads/restore-icon-png-10.png" height="30" width="30"> </br> Replay </img></button>
  <button id="mute"> <img src= "https://freesvg.org/img/mute-2.png" height="30" width="30"> </br> Mute </img></button>

  <webaudio-knob id="volumeKnob" 
    src="myComponents/assets/imgs/LittlePhatty.png" 
    value=100 min=0 max=100 step=0.1 
    diameter="35" 
    tooltip="Volume: %d">
  </webaudio-knob>
  
  <br>
  <label>Vitesse de lecture
     0 <input id="vitesseLecture" type="range" min=0.2 max=4 step=0.1 value=1> 4
  </label>
  <br>
  <br>
  
  <label for="balance"> Balance : </label>
  Gauche
  <input type="range" min="-1" max="1" step="0.1" value="0" id="pannerSlider" /> Droite
  <br>
  <br>

  `;

//let audioComponent = document.querySelector ("my-player");

class MyAudioPlayer extends HTMLElement {

    // On récupère les éléments du DOM
    constructor() {
        super();
        // Récupération des attributs HTML
        this.value = this.getAttribute("value");

        // On crée un shadow DOM
        this.attachShadow({ mode: "open" });

        console.log("URL de base du composant : " + getBaseURL())
    }

    // Définition des valeurs initiales 
    defineInitialValues() {
        const volumeMax = this.audioCtx.destination.maxGain;
        const volumeKnob = this.shadowRoot.querySelector("#volumeKnob");
        volumeKnob.value = volumeMax * 100;
        this.volume = 0.5;
        this.progress = 0;
        this.playing = false;
        this.vitesseLecture = 1;
        this.currentTime = 0;
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

        // récupérer le canvas pour le dessin du son
        this.canvasFrequency = this.shadowRoot.querySelector("#myCanvasFrequency");
        this.canvasWaveForm = this.shadowRoot.querySelector("#myCanvasWaveForm");
        this.canvasFrequencyCtx = this.canvasFrequency.getContext("2d");
        this.canvasWaveFormCtx = this.canvasWaveForm.getContext("2d");

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

        // mise à jour de la barre de progression
        this.updateProgress();

    }

    // Fonction pour construire les graphes webaudio
    buildAudioGraph() {

        // On crée un noeud source pour le lecteur audio
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
        
        //for waveForm
        this.analyserWaveForm = this.analyserNode;
        this.analyserWaveForm.fftSize = 1024;
        this.analyserWaveForm.bufferLength = this.analyserWaveForm.frequencyBinCount;
        this.analyserWaveForm.dataArray = new Uint8Array(
        this.analyserWaveForm.bufferLength
        );
        
    }

    
    animationLoop() {
        // 1 on efface le canvas
        this.canvasFrequencyCtx.clearRect(0, 0, this.canvasFrequency.width, this.canvasFrequency.height);

        // 2 on dessine les objets
        
        // Get the analyser data
        this.analyserNode.getByteFrequencyData(this.dataArray);

        let barWidth = this.canvasFrequency.width / this.bufferLength;
        let barHeight;
        let x = 0;

        // values go from 0 to 256 and the canvas heigt is 100. Let's rescale
        // before drawing. This is the scale factor
        let heightScale = this.canvasFrequency.height / 128;

        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = this.dataArray[i];

            // couleur des barres en fontion du son
            this.canvasFrequencyCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',255,0)';
            barHeight *= heightScale;
            this.canvasFrequencyCtx.fillRect(x, this.canvasFrequency.height - barHeight / 2, barWidth, barHeight / 2);

            // 2 is the number of pixels between bars
            x += barWidth + 1;
        }

        // dessiner le graphe WaveForm
        this.canvasWaveFormCtx.clearRect(0, 0, this.canvasWaveForm.width, this.canvasWaveForm.height);
        this.canvasWaveFormCtx.fillRect(0, 0, this.canvasWaveForm.width, this.canvasWaveForm.height); //remplit le background
        this.analyserWaveForm.getByteTimeDomainData(this.analyserWaveForm.dataArray);
        this.canvasWaveFormCtx.lineWidth = 2;
        this.canvasWaveFormCtx.strokeStyle = "lightgreen";
        this.canvasWaveFormCtx.beginPath();
        
        let sliceWidth = this.canvasWaveForm.width / this.analyserWaveForm.bufferLength;
        let a = 0; 
        for (let j = 0; j < this.analyserWaveForm.bufferLength; j++) {
            let v = this.analyserWaveForm.dataArray[j] / 128;
            let b = (v * this.canvasWaveForm.height) / 2;
            if (j === 0) {
                this.canvasWaveFormCtx.moveTo(a, b);
            } else {
                this.canvasWaveFormCtx.lineTo(a, b);
            }
            a += sliceWidth;
        }
        this.canvasWaveFormCtx.stroke();


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

    // Déinition des écouteurs d'événements
    defineListeners() {
        this.shadowRoot.querySelector("#play").onclick = () => {
            this.player.play();
            this.audioCtx.resume(); // à cause de la politique de Chrome (autoplay) qui bloque le son s'il n'y pas de user interaction
            console.log("mise en route de l'audio");
        }

        this.shadowRoot.querySelector("#pause").onclick = () => {
            this.player.pause();
            console.log("mise en pause de l'audio");
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
            //const tempsActuel = this.player.currentTime * (parseFloat(event.target.value) - 1000 / 60);
            //tempsActuel = parseFloat(event.target.value);
            this.player.currentTime = event.target.value
            console.log("progression =  " + this.player.currentTime);
        }

        this.shadowRoot.querySelector("#volumeKnob").oninput = (event) => {
            this.player.volume = (parseFloat(event.target.value) / 100).toFixed(2);
            //this.player.volume = parseFloat(value, 10);
            //this.player.volume = parseFloat(event);
            console.log("volumeKnob = " + this.player.volume);
        }

        this.shadowRoot.querySelector("#Mute").onclick = (event) => {
            this.player.volume = 0;
            console.log("volume = " + this.player.volume);
        }


    }

    updateProgress() {
        const ProgressListen = this.shadowRoot.querySelector("#progress");
        ProgressListen.value = this.player.currentTime;
        ProgressListen.max = this.player.duration;
        console.log("progression =  " + this.player.currentTime);
        console.log("durée =  " + this.player.duration);
        this.shadowRoot.querySelector("#TempsActuel").innerHTML = (this.player.currentTime);
        this.shadowRoot.querySelector("#Durée").innerHTML = (this.player.duration);
        //const tempsActuel = this.player.currentTime * (parseFloat(event.target.value) - 1000 / 60);
    }


    //fonction pour la balance audio
    balanceAudio() {
        // Create a stereo panner
        this.stereoPanner = this.audioCtx.createStereoPanner();
        this.stereoPanner.pan.value = 0;
        this.stereoPanner.connect(this.audioCtx.destination);
        this.player.connect(this.stereoPanner);

         //écouteur pour la balance droite / gauche 
         this.shadowRoot.querySelector("#balance").oninput = (event) => {
            this.pannerNode.pan.value = event.target.value;
         };
    }
           

    // L'API du Web Component

}

customElements.define("my-player", MyAudioPlayer);
