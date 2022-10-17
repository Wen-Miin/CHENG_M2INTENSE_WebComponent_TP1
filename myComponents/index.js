import './libs/webaudio-controls.js'

const getBaseURL = () => {
    return new URL('.', import.meta.url)
}

//const template = document.createElement("template");

//let audioComponent = document.querySelector ("my-player");

class MyAudioPlayer extends HTMLElement {
    // On récupère les éléments du DOM
    constructor() {
        super()
        // Récupération des attributs HTML
        this.value = this.getAttribute('value')
        this.src = this.getAttribute('src')

        // pour les fréquences
        this.mapFreq = new Map()
        this.frequences = [60, 170, 350, 1000, 3500, 10000]
        this.filtres = []

        // On crée un shadow DOM
        this.attachShadow({ mode: 'open' })

        console.log('URL de base du composant : ' + getBaseURL())

        //création de la playlist (musiques dans le dossier assets > audio)
        this.playlist = JSON.parse(this.getAttribute('playlist'))

        //tableau liste des titres de chaque chanson
        this.listeTitres = JSON.parse(this.getAttribute('title'))

        // récupération de l'élement d'une musique
        this.i = 0;
        this.piste = this.playlist[this.i];
        console.log('piste : ' + this.piste);
        this.titre = this.listeTitres[this.i];
        
    }

    // Définition des valeurs initiales
    defineInitialValues() {
        this.player.src = this.src;
        const volumeMax = this.audioCtx.destination.maxGain;
        const volumeKnob = this.shadowRoot.querySelector('#volumeKnob');
        volumeKnob.value = volumeMax * 100;
        this.progression = this.shadowRoot.querySelector('#progression');
        this.currentTimeEl = this.progression.children[0];
        this.progressBarEl = this.progression.children[1];
        this.durationEl = this.progression.children[2];
        this.balanceSlider = this.shadowRoot.querySelector('#balanceSlider');
        this.shadowRoot.querySelector('.durée').innerHTML = this.convertionTemps(this.player.duration);
        this.shadowRoot.querySelector('.titre').innerHTML = this.titre;
        this.shadowRoot.querySelector('.piste').innerHTML = this.player.src;
    }

    connectedCallback() {
        // Appelée automatiquement par le browser
        // quand il insère le web component dans le DOM
        // de la page du parent..

        // On clone le template HTML/CSS (la gui du wc)
        // et on l'ajoute dans le shadow DOM
        //this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.shadowRoot.innerHTML = /*html*/ `
  <style>
  
  .Controller-Wrapper{
    display:flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  
  }
  
  .Input-Wrapper {
  display: flex;
  align-items: start;
  flex-direction: column;
  }
  
  canvas {
      margin: 5px;
      border:1px solid black;
      width: 50%;
      height:150px;
  }
  
   @media (max-width: 600px) {
   
     canvas {
        margin: 5px 10px;
        width: 100%;
        height: 150px;
        display: inline-block;

  }
  
    .Canvas-Wrapper {
    display: block !important;
    align-items: center !important;
    justify-content: center !important;
  }

      }
  
  #root {
    width:100%;
    padding: 15px;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
    margin-bottom: 2em;
  }
  
  .Canvas-Wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  </style>
  
  <div id="root">
  <h2 class="titre"> Titre : ${this.titre}</h2>

<div class="Canvas-Wrapper">
  <canvas id="my-canvas-frequency"></canvas>
  <canvas id="my-canvas-wave-form"></canvas>
</div>

  <br>

<div class="Controller-Wrapper">
  <audio id="myPlayer" src="${this.piste}"" crossorigin="anonymous" controls type="audio/mp3"></audio>
  <br>
  
  <div>
  <div id="progression">
        Progression : 
        <span id="tempsActuel">0:00</span> 
        <input id="progressBar" type="range" value=0 min=0 max=1>
        <span id="durée">0:00</span>
    </div>

    <label>Vitesse de lecture
     0 <input id="vitesseLecture" type="range" min=0.2 max=4 step=0.1 value=1> 4
  </label>
  <br>
  
  <label for="balance"> Balance : </label>
  Gauche
  <input type="range" min="-1" max="1" step="0.1" value="0" id="balanceSlider" /> Droite
  </div>
  <br>
  <br>
<div>
  <button id="previous"> <img src="./myComponents/assets/imgs/backward-icon.png" height="30" width="30"> </img> </br> Previous </button> 
  <button id="play"> <img src="http://www.i2clipart.com/cliparts/0/2/f/c/clipart-windows-media-player-play-button-updated-512x512-02fc.png" height="30" width="30"> </img> </br> Play </button> 
  <button id="pause"> <img src= "https://pixabay.com/static/uploads/photo/2014/04/02/10/22/pause-303651_960_720.png" height="30" width="30"> </br> Pause </img> </button>
  <button id="recule10"> <img src= "https://www.clker.com/cliparts/z/d/S/G/q/a/windows-media-player-skip-back-button-hi.png" height="30" width="30"> </img></br> -10s </button>
  <button id="avance10"> <img src= "http://www.clker.com/cliparts/r/g/H/t/P/o/windows-media-player-skip-forward-button-hi.png" height="30" width="30"> </br> +10s </button>
  <button id="replay"><img src= "https://www.freeiconspng.com/uploads/restore-icon-png-10.png" height="30" width="30"> </br> Replay </img></button>
  <button id="mute"> <img src= "https://freesvg.org/img/mute-2.png" height="30" width="30"> </br> Mute </img></button>
  <button id="next"> <img src="./myComponents/assets/imgs/forward-icon.png" height="30" width="30"> </img> </br> Next </button> 

  <webaudio-knob id="volumeKnob" 
    src="myComponents/assets/imgs/LittlePhatty.png" 
    value=100 min=0 max=100 step=0.01 
    diameter="35" 
    tooltip="Volume: %d">
  </webaudio-knob>
    </div>

  
  <br>
  <br>

<div class="Input-Wrapper">
  <div><input id="freq60" type="range" min="0" max="100" value="0" step="1" />  60Hz    <br></div>
  <div><input id="freq170" type="range" min="0" max="100" value="0" step="1" /> 170Hz   <br></div>
  <div><input id="freq350" type="range" min="0" max="100" value="0" step="1" />  350Hz   <br></div>
  <div><input id="freq1000" type="range" min="0" max="100" value="0" step="1" />  1000Hz  <br></div>
  <div><input id="freq3500" type="range" min="0" max="100" value="0" step="1" />  3500Hz  <br></div>
  <div><input id="freq10000" type="range" min="0" max="100" value="0" step="1" />  10000Hz <br></div>
</div>
</div> 
  `
        // fix relative URLs
        this.fixRelativeURLs()

        this.player = this.shadowRoot.querySelector('#myPlayer')
        //this.player.src = this.getAttribute("src");

        // récupérer le canvas pour le dessin du son
        this.canvasFrequency = this.shadowRoot.querySelector(
            '#my-canvas-frequency'
        )
        this.canvasWaveForm = this.shadowRoot.querySelector(
            '#my-canvas-wave-form'
        )
        this.canvasFrequencyCtx = this.canvasFrequency.getContext('2d')
        this.canvasWaveFormCtx = this.canvasWaveForm.getContext('2d')

        // Récupération du contexte WebAudio
        this.audioCtx = new AudioContext()

        // on définit les écouteurs etc.
        this.defineListeners()

        // On construit un graphe webaudio pour capturer
        // le son du lecteur et pouvoir le traiter
        // en insérant des "noeuds" webaudio dans le graphe
        this.buildAudioGraph()

        // on démarre l'animation
        requestAnimationFrame(() => {
            this.animationLoop()
        })

        // mise à jour de la barre de progression
        this.updateProgress()
    }

    // Fonction pour construire les graphes webaudio
    buildAudioGraph() {
        // On crée un noeud source pour le lecteur audio
        let audioContext = this.audioCtx

        let playerNode = audioContext.createMediaElementSource(this.player)

        // Create an analyser node
        this.analyserNode = audioContext.createAnalyser()

        // Try changing for lower values: 512, 256, 128, 64...
        this.analyserNode.fftSize = 512
        this.bufferLength = this.analyserNode.frequencyBinCount
        this.dataArray = new Uint8Array(this.bufferLength)

        const interval = setInterval(() => {
            if (this.audioContext) {
                this.frequences.forEach((freq) => {
                    const val = this.audioContext.createBiquadFilter(
                        this.player
                    )
                    val.frequency.value = freq
                    val.type = 'peaking'
                    val.player.value = 0
                    this.filters.push(val)
                })
                clearInterval(interval)
            }
        }, 500)

        // lecteur audio -> analyser -> haut parleurs
        playerNode.connect(this.analyserNode)
        this.analyserNode.connect(audioContext.destination)

        //for waveForm
        this.analyserWaveForm = this.analyserNode
        this.analyserWaveForm.fftSize = 1024
        this.analyserWaveForm.bufferLength = this.analyserWaveForm.frequencyBinCount
        this.analyserWaveForm.dataArray = new Uint8Array(
            this.analyserWaveForm.bufferLength
        )

        //pour balance
        // create source and gain node
        //var source = audioContext.createMediaElementSource(this.player);
        this.pannerNode = audioContext.createStereoPanner()

        // connect nodes together
        playerNode.connect(this.pannerNode)
        this.pannerNode.connect(audioContext.destination)

        // node pour les fréquences
        /*
        let currentNode = playerNode;
        for (let filter of this.mapFreq.values()) {
            currentNode.connect(filter);
            currentNode = filter;
        }

        this.playerNode.connect(this.filtres[0])

        for (let i = 0; i < this.filtres.length - 1; i++) {
            this.filters[i].connect(this.filters[i + 1])
        }

        this.filtres[this.filtres.length - 1].connect(this.pannerNode)
        */
    }

    animationLoop() {
        // 1 on efface le canvas
        this.canvasFrequencyCtx.clearRect(
            0,
            0,
            this.canvasFrequency.width,
            this.canvasFrequency.height
        )

        // 2 on dessine les objets

        // Get the analyser data
        this.analyserNode.getByteFrequencyData(this.dataArray)

        let barWidth = this.canvasFrequency.width / this.bufferLength
        let barHeight
        let x = 0

        // values go from 0 to 256 and the canvas heigt is 100. Let's rescale
        // before drawing. This is the scale factor
        let heightScale = this.canvasFrequency.height / 128

        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = this.dataArray[i]

            // couleur des barres en fontion du son
            this.canvasFrequencyCtx.fillStyle =
                'rgb(' + (barHeight + 100) + ',255,0)'
            barHeight *= heightScale
            this.canvasFrequencyCtx.fillRect(
                x,
                this.canvasFrequency.height - barHeight / 2,
                barWidth,
                barHeight / 2
            )

            // 2 is the number of pixels between bars
            x += barWidth + 1
        }

        // dessiner le graphe WaveForm
        this.canvasWaveFormCtx.clearRect(
            0,
            0,
            this.canvasWaveForm.width,
            this.canvasWaveForm.height
        )
        this.canvasWaveFormCtx.fillRect(
            0,
            0,
            this.canvasWaveForm.width,
            this.canvasWaveForm.height
        ) //remplit le background
        this.analyserWaveForm.getByteTimeDomainData(
            this.analyserWaveForm.dataArray
        )
        this.canvasWaveFormCtx.lineWidth = 2
        this.canvasWaveFormCtx.strokeStyle = 'lightgreen'
        this.canvasWaveFormCtx.beginPath()

        let sliceWidth =
            this.canvasWaveForm.width / this.analyserWaveForm.bufferLength
        let a = 0
        for (let j = 0; j < this.analyserWaveForm.bufferLength; j++) {
            let v = this.analyserWaveForm.dataArray[j] / 128
            let b = (v * this.canvasWaveForm.height) / 2
            if (j === 0) {
                this.canvasWaveFormCtx.moveTo(a, b)
            } else {
                this.canvasWaveFormCtx.lineTo(a, b)
            }
            a += sliceWidth
        }
        this.canvasWaveFormCtx.stroke()

        // 3 on deplace les objets

        // 4 On demande au navigateur de recommencer l'animation
        requestAnimationFrame(() => {
            this.animationLoop()
        })
    }

    fixRelativeURLs() {
        const elems = this.shadowRoot.querySelectorAll(
            'webaudio-knob, webaudio-slider, webaudio-switch, img'
        )
        elems.forEach((e) => {
            const path = e.src
            if (path.startsWith('.')) {
                e.src = getBaseURL() + path
            }
        })
    }

    // Déinition des écouteurs d'événements
    defineListeners() {
        this.shadowRoot.querySelector('#play').onclick = () => {
            this.player.play()
            //this.shadowRoot.querySelector(".durée").innerHTML = this.convertionTemps(this.player.duration);
            this.audioCtx.resume() // à cause de la politique de Chrome (autoplay) qui bloque le son s'il n'y pas de user interaction
            console.log("mise en route de l'audio")
        }

        this.shadowRoot.querySelector('#pause').onclick = () => {
            this.player.pause()
            console.log("mise en pause de l'audio")
        }

        this.shadowRoot.querySelector('#recule10').onclick = () => {
            this.player.currentTime -= 10
            console.log(
                'reculé de 10, temps à ' +
                this.convertionTemps(this.player.currentTime)
            )
        }

        this.shadowRoot.querySelector('#avance10').onclick = () => {
            this.player.currentTime += 10
            console.log(
                'avancé de 10, temps à ' +
                this.convertionTemps(this.player.currentTime)
            )
        }

        this.shadowRoot.querySelector('#replay').onclick = () => {
            this.player.currentTime = 0
            console.log(
                'replay , remise à ' +
                this.convertionTemps(this.player.currentTime)
            )
        }

        this.shadowRoot.querySelector('#vitesseLecture').oninput = (event) => {
            this.player.playbackRate = parseFloat(event.target.value)
            console.log('vitesse =  ' + this.player.playbackRate)
        }

        this.shadowRoot.querySelector('#volumeKnob').oninput = (event) => {
            this.player.volume = (parseFloat(event.target.value) / 100).toFixed(
                2
            )
            console.log('volumeKnob = ' + this.player.volume)
        }

        this.shadowRoot.querySelector('#mute').onclick = () => {
            this.player.volume = 0
            this.volumeKnob = 0
            console.log('volume = ' + this.player.volume)
        }

        //this.progressBar = this.shadowRoot.querySelector('#progressBar');
        //écouteur pour la durée d'une musique
        this.player.addEventListener('loadedmetadata', () => {
            //this.shadowRoot.querySelector("#progress") = this.player.duration;
            this.duration = this.player.duration
            this.progressBar = document.getElementsByClassName('#progressBar')
            this.progressBar.max = this.player.duration //durée de la musique
            this.progressBar.value = this.player.currentTime //position de la barre de progression
            this.progressBar.step = 0.1 //pas de la barre de progression
            //const secondes = ParseInt('${this.duration % 60}', 10);
            //const minutes = ParseInt('${(this.duration/60) % 60}', 10);
            //this.duration.textContent = '${minutes}:${secondes}';
            console.log(
                'durée de la musique : ' +
                this.convertionTemps(this.player.duration)
            )
            console.log(
                'temps actuel : ' +
                this.convertionTemps(this.player.currentTime)
            )
        })

        //this.shadowRoot.querySelector("#progressBar").oninput = (event) => {
        //    //const tempsActuel = this.player.currentTime * (parseFloat(event.target.value) - 1000 / 60);
        //    //tempsActuel = parseFloat(event.target.value);
        //    this.player.currentTime = event.target.value
        //    console.log("progression =  " + this.player.currentTime);
        //}

        ////écouteur pour la balance droite / gauche
        this.shadowRoot.querySelector('#balanceSlider').oninput = (evt) => {
            this.pannerNode.pan.value = evt.target.value
            this.audioContext.currentTime
            console.log(
                'balance modifiée, valeur : ' + this.pannerNode.pan.value
            )
        }

        // écouteur pour le bouton previous
        this.shadowRoot.querySelector('#previous').onclick = (evt) => {
            this.i--
            if (this.i < 0) {
                this.i = this.playlist.length - 1
            }
            console.log('source avant ' + this.player.src)
            console.log('piste ' + this.playlist[this.i])

            console.log('previous titre')
            //this.player.piste = this.playlist[this.i];
            this.piste = this.playlist[this.i]
            this.titre = this.listeTitres[this.i]
            console.log('nouvel piste ' + this.piste)
            console.log('nouveau titre ' + this.titre)

            try {
                this.player.src = this.piste
                this.player.titre = this.titre
                this.shadowRoot.querySelector('.titre').innerHTML =
                    'Titre : ' + this.titre
            } catch (e) {
                console.log('erreur : ' + e)
            }

            this.player.play()
        }

        // écouteur pour le bouton next
        this.shadowRoot.querySelector('#next').onclick = () => {
            this.i++
            if (this.i > this.playlist.length - 1) {
                this.i = 0
            }
            console.log('source avant ' + this.player.src)
            console.log('piste ' + this.playlist[this.i])

            console.log('next titre')
            //this.player.piste = this.playlist[this.i];
            this.piste = this.playlist[this.i]
            this.titre = this.listeTitres[this.i]
            console.log('nouvel piste ' + this.piste)
            console.log('nouveau titre ' + this.titre)

            try {
                this.player.src = this.piste
                this.shadowRoot.querySelector('.titre').innerHTML =
                    'Titre : ' + this.titre
            } catch (e) {
                console.log('erreur : ' + e)
            }

            this.player.play()
        }

        // tourne en boucle
        this.player.addEventListener('ended', () => {
            //this.playing = false;
            this.i++
            if (this.i > this.playlist.length - 1) {
                this.i = 0
            }
            //this.player.piste = this.playlist[this.i];
            this.piste = this.playlist[this.i]
            this.titre = this.listeTitres[this.i]
            try {
                this.player.src = this.piste
                this.shadowRoot.querySelector('.titre').innerHTML =
                    'Titre : ' + this.titre
            } catch (e) {
                console.log('erreur : ' + e)
            }
            this.player.play()
        })

        // écouteur pour les sliders de fréquences
        this.shadowRoot.querySelector('#freq60').oninput = (evt) => {
            this.biquadFilterNode.frequency.value = evt.target.value
            console.log(
                'fréquence modifiée, valeur : ' +
                this.biquadFilterNode.frequency.value
            )
        }
    }

    // fonction pour connaitre la durée de la musique en minutes et secondes
    convertionTemps(temps) {
        let minutes = Math.floor(temps / 60)
        let secondes = Math.floor(temps - minutes * 60)
        if (secondes < 10) {
            secondes = '0' + secondes
        }
        return minutes + ':' + secondes
    }

    // fonction pour passer à la musique précédente
    previousTitre() {
        this.i--
        if (this.i < 0) {
            this.i = this.playlist.length - 1
        }
        //this.playlist[this.i];
        this.player.piste = this.playlist[this.i]
        this.piste = this.playlist[this.i]
        this.title = this.listeTitres[this.i]
        this.player.play()
    }

    updateProgress() {
        //const ProgressListen = this.shadowRoot.querySelector("#progressBar");
        //ProgressListen.value = this.player.currentTime;
        //ProgressListen.max = this.player.duration;
        //console.log("progression =  " + this.player.currentTime);
        //console.log("durée =  " + this.player.duration);
        //this.shadowRoot.querySelector("#tempsActuel").innerHTML = (this.player.currentTime);
        //this.shadowRoot.querySelector("#Durée").innerHTML = (this.player.duration);
        //const tempsActuel = this.player.currentTime * (parseFloat(event.target.value) - 1000 / 60);
    }

    //fonction pour events
    //attachEvent() {
    //    this.player.addEventListener("click", this.clickToPlay.bind(this));
    //}
    //
    //
    //async clickToPlay() {
    //    if (this.audioCtx.state === "suspended") {
    //        await this.audioCtx.resume();
    //    }
    //
    //    if (this.playing) {
    //        return this.audioCtx.pause();
    //        this.playing = false;
    //    } else {
    //        await this.audioCtx.play();
    //        this.playing = true;
    //    }
    //}

    // L'API du Web Component
}

customElements.define('my-player', MyAudioPlayer)
