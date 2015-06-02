/*
         x     y     z     w     x     y     z     w     x     y     z     w     x     y     z     w
 isrc -> x0 -> y0 -> x1 -> y1 -> x2 -> y2 -> x3 -> y3 -> x4 -> y4 -> x5 -> y5 -> x6 -> y6 -> x7 -> y7

 */

var Renderer = function(config){

    this.canvas = undefined;
    this.canvasQ = undefined;
    this.canvasWidth = undefined;
    this.canvasHeight = undefined;

    this.mRenderer = undefined;
    this.mScene = undefined;
    this.mCamera = undefined;

    this.uiStep = 0 >>> 0; // coerce to uint32

    this.time = new Date().getTime();

    this.mTexture0 = undefined;
    this.mTexture1 = undefined;
    this.mTexture2 = undefined;
    this.mTexture3 = undefined;
    this.mTexture4 = undefined;
    this.mTexture5 = undefined;
    this.mTexture6 = undefined;
    this.mTexture7 = undefined;
    this.mTexture8 = undefined;
    this.mTexture9 = undefined;
    this.debugTexture = undefined;
    this.mScreenQuad = undefined;

    this.mccabeMaterial = undefined;
    this.debugMaterial  = undefined;
    this.noiseMaterial  = undefined;
    this.pass0Material  = undefined;
    this.pass1Material  = undefined;
    this.pass2Material  = undefined;
    this.pass3Material  = undefined;
    this.screenMaterial = undefined;
    this.standardScreenMaterial = undefined;

    this.textureWidth = 1024;
    this.textureHeight = 1024;

    // Configuration.
    this.hard     = config.hard;
    this.rate     = config.rate;
    this.sharp    = config.sharp;
    this.exponent = config.exponent;
    this.scale    = config.scale;
    this.stddev   = config.stddev;
    this.hystj    = config.hystj;
    this.hystk    = config.hystk;
    this.feed     = config.feed;
    this.blurl    = config.blurl;

    this.debug = false;

    this.mUniforms = {
        screenWidth:  {type: "f", value: undefined},
        screenHeight: {type: "f", value: undefined},
        sSource:      {type: "t", value: undefined},
        bSource0:     {type: "t", value: undefined},
        bSource1:     {type: "t", value: undefined},
        bSource2:     {type: "t", value: undefined},
        bSource3:     {type: "t", value: undefined},
        iSource:      {type: "t", value: undefined},
        hard:         {type: "f", value: this.hard},
        rate:         {type: "f", value: this.rate},
        sharp:        {type: "f", value: this.sharp},
        exponent:     {type: "f", value: this.exponent},
        scale:        {type: "f", value: this.scale},
        stddev:       {type: "f", value: this.stddev},
        hystj:        {type: "f", value: this.hystj},
        hystk:        {type: "f", value: this.hystk},
        feed:         {type: "f", value: this.feed},
        blurl:        {type: "f", value: this.blurl}
    };

    this.updateUniforms = function()
    {
        this.mUniforms.hard.value     = this.hard;
        this.mUniforms.rate.value     = this.rate;
        this.mUniforms.sharp.value    = this.sharp;
        this.mUniforms.exponent.value = this.exponent;
        this.mUniforms.scale.value    = this.scale;
        this.mUniforms.stddev.value   = this.stddev;
        this.mUniforms.hystj.value    = this.hystj;
        this.mUniforms.hystk.value    = this.hystk;
        this.mUniforms.blurl.value    = this.blurl;
        this.mUniforms.feed.value     = this.feed;
    };

    this.init = function()
    {
        this.initCanvas();
        this.initGl();
        this.render();
    };

    this.initCanvas = function()
    {
        this.canvasQ = $('#myCanvas');
        this.canvas = this.canvasQ.get(0);

        window.addEventListener('resize', this.onResize.bind(this), false );
    };

    this.getMaterial = function(vertexShaderId, fragmentShaderId)
    {
        return new THREE.ShaderMaterial({
            uniforms: this.mUniforms,
            vertexShader: document.getElementById(vertexShaderId).textContent,
            fragmentShader: document.getElementById(fragmentShaderId).textContent
        });
    };

    this.initGl = function()
    {
        this.mRenderer = new THREE.WebGLRenderer({canvas: this.canvas, preserveDrawingBuffer: true});

        this.mScene = new THREE.Scene();
        this.mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
        this.mCamera.position.z = 0;
        this.mScene.add(this.mCamera);

        this.standardScreenMaterial = this.getMaterial('standardVertexShader', 'standardScreenFragmentShader');
        this.screenMaterial = this.getMaterial('standardVertexShader', 'screenFragmentShader');
        this.mccabeMaterial = this.getMaterial('standardVertexShader', 'mccabeFragmentShader');
        this.debugMaterial  = this.getMaterial('standardVertexShader', 'debugFragmentShader');
        this.noiseMaterial  = this.getMaterial('standardVertexShader', 'noiseFragmentShader');
        this.pass0Material  = this.getMaterial('gaussianPyramidVertexShader0', 'gaussianPyramidFragmentShader0');
        this.pass1Material  = this.getMaterial('gaussianPyramidVertexShader1', 'gaussianPyramidFragmentShader123');
        this.pass2Material  = this.getMaterial('gaussianPyramidVertexShader2', 'gaussianPyramidFragmentShader123');
        this.pass3Material  = this.getMaterial('gaussianPyramidVertexShader3', 'gaussianPyramidFragmentShader123');

        var plane = new THREE.PlaneGeometry(1.0, 1.0);
        this.mScreenQuad = new THREE.Mesh(plane, this.screenMaterial);
        this.mScene.add(this.mScreenQuad);

        // Set the new shape of canvas.
        this.canvasQ.width(this.getCanvasWidth());
        this.canvasQ.height(this.getCanvasHeight());

        // Get the real size of canvas.
        this.canvasWidth = this.canvasQ.width();
        this.canvasHeight = this.canvasQ.height();

        this.mRenderer.setSize(this.canvasWidth, this.canvasHeight);

        this.mTexture0 = this.getWrappedRenderTarget();
        this.mTexture1 = this.getWrappedRenderTarget();
        this.mTexture2 = this.getWrappedRenderTarget();
        this.mTexture3 = this.getWrappedRenderTarget();
        this.mTexture4 = this.getWrappedRenderTarget();
        this.mTexture5 = this.getWrappedRenderTarget();
        this.mTexture6 = this.getWrappedRenderTarget();
        this.mTexture7 = this.getWrappedRenderTarget();
        this.mTexture8 = this.getWrappedRenderTarget();
        this.mTexture9 = this.getWrappedRenderTarget();
        this.debugTexture = this.getWrappedRenderTarget();

        this.mUniforms.screenWidth.value = this.textureWidth;
        this.mUniforms.screenHeight.value = this.textureHeight;

    };

    this.getWrappedRenderTarget = function()
    {
        return new THREE.WebGLRenderTarget(this.textureWidth, this.textureHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format:    THREE.RGBAFormat,
            type:      THREE.FloatType,
            wrapS:     THREE.RepeatWrapping,
            wrapT:     THREE.RepeatWrapping
        });
    };

    this.renderToTarget = function(material, iSource, sSource, target)
    {
        this.mScreenQuad.material = material;
        this.mUniforms.iSource.value = iSource;
        this.mUniforms.sSource.value = sSource;
        this.mRenderer.render(this.mScene, this.mCamera, target, true);
    };

    this.renderToFinalTarget = function(material, iSource, bSource0, bSource1, bSource2, bSource3, target)
    {
        this.mScreenQuad.material = material;
        this.mUniforms.iSource.value = iSource;
        this.mUniforms.bSource0.value = bSource0;
        this.mUniforms.bSource1.value = bSource1;
        this.mUniforms.bSource2.value = bSource2;
        this.mUniforms.bSource3.value = bSource3;
        this.mRenderer.render(this.mScene, this.mCamera, target, true);
    };

    this.renderToScreen = function(material, iSource, bSource0, bSource1, bSource2, bSource3)
    {
        this.mScreenQuad.material = material;
        this.mUniforms.iSource.value = iSource;
        this.mUniforms.bSource0.value = bSource0;
        this.mUniforms.bSource1.value = bSource1;
        this.mUniforms.bSource2.value = bSource2;
        this.mUniforms.bSource3.value = bSource3;
        this.mRenderer.render(this.mScene, this.mCamera);
    };

    this.render = function()
    {
        this.updateUniforms();
        var imageTexture;

        if (this.uiStep == 0) {
            this.renderToTarget(this.noiseMaterial, this.mTexture0, this.mTexture1, this.mTexture0);
            this.renderToTarget(this.noiseMaterial, this.mTexture0, this.mTexture1, this.mTexture9);
        }
        if (this.uiStep % 2 == 0) {
            this.renderToTarget(this.pass0Material, this.mTexture0, this.mTexture1, this.mTexture2);
            this.renderToTarget(this.pass1Material, this.mTexture2, this.mTexture3, this.mTexture4);
            this.renderToTarget(this.pass2Material, this.mTexture4, this.mTexture5, this.mTexture6);
            this.renderToTarget(this.pass3Material, this.mTexture6, this.mTexture7, this.mTexture8);
            this.renderToFinalTarget(this.mccabeMaterial, this.mTexture0, this.mTexture2, this.mTexture4, this.mTexture6, this.mTexture8, this.mTexture9);
            if (this.debug) {
                this.renderToFinalTarget(this.debugMaterial, this.mTexture0, this.mTexture2, this.mTexture4, this.mTexture6, this.mTexture8, this.debugTexture);
                imageTexture = this.debugTexture;
            } else {
                imageTexture = this.mTexture9;
            }
        } else {
            this.renderToTarget(this.pass0Material, this.mTexture9, this.mTexture2, this.mTexture1);
            this.renderToTarget(this.pass1Material, this.mTexture1, this.mTexture4, this.mTexture3);
            this.renderToTarget(this.pass2Material, this.mTexture3, this.mTexture6, this.mTexture5);
            this.renderToTarget(this.pass3Material, this.mTexture5, this.mTexture8, this.mTexture7);
            this.renderToFinalTarget(this.mccabeMaterial, this.mTexture9, this.mTexture1, this.mTexture3, this.mTexture5, this.mTexture7, this.mTexture0);
            if (this.debug) {
                this.renderToFinalTarget(this.debugMaterial, this.mTexture9, this.mTexture1, this.mTexture3, this.mTexture5, this.mTexture7, this.debugTexture);
                imageTexture = this.debugTexture;
            } else {
                imageTexture = this.mTexture0;
            }
        }

        var screenMaterial = this.debug ? this.standardScreenMaterial : this.screenMaterial;
        if (this.uiStep % 2 == 0) {
            this.renderToScreen(screenMaterial, imageTexture, this.mTexture2, this.mTexture4, this.mTexture6, this.mTexture8);
        } else {
            this.renderToScreen(screenMaterial, imageTexture, this.mTexture1, this.mTexture3, this.mTexture5, this.mTexture7);
        }

        this.uiStep++;
        requestAnimationFrame(this.render.bind(this));
    };

    this.resetCounter = function() {
        this.uiStep = 0 >>> 0;
    };

    this.snapshot = function()
    {
        var dataURL = this.canvas.toDataURL("image/jpeg");
        window.open(dataURL, "name-"+Math.random());
    };

    this.toggleDebug = function()
    {
        this.debug = !this.debug;
    };

    this.onResize = function()
    {

        // Set the new shape of canvas.
        this.canvasQ.width(this.getCanvasWidth());
        this.canvasQ.height(this.getCanvasHeight());

        // Get the real size of canvas.
        this.canvasWidth = this.canvasQ.width();
        this.canvasHeight = this.canvasQ.height();

        this.mRenderer.setSize(this.canvasWidth, this.canvasHeight);

    };

    this.getCanvasWidth = function()
    {
        return window.innerWidth;
    };

    this.getCanvasHeight = function()
    {
        return window.innerHeight;
    };

};

window.onload = function() {
    var renderer = new Renderer({
        hard: 40.0,
        rate: 100.0,
        sharp: 0.4,
        exponent: 2.0,
        stddev: 4.0,
        scale: 0.012,
        hystj: 0.0,
        hystk: 4.0,
        blurl: 4.0,
        feed: 0.0
    });
    var gui = new dat.GUI();

    gui.add(renderer, 'hard').min(0.0).max(50.0).step(0.01).name("Softmin Curve");
    gui.add(renderer, 'sharp').min(0.0).max(20.0).step(0.01).name("Sign Curve");
    gui.add(renderer, 'exponent').min(-5.0).max(5.0).step(0.01).name("Scale Exponent");
    gui.add(renderer, 'scale').min(0.001).max(1.0).step(0.001).name("Prescale");
    gui.add(renderer, 'rate').min(0.0).max(100.0).step(0.01).name("Rate");
    gui.add(renderer, 'stddev').min(0.0).max(10.0).step(0.01).name("Std Deviation");
    gui.add(renderer, 'hystj').min(-10.0).max(10.0).step(0.01).name("Hysteresis Scale");
    gui.add(renderer, 'hystk').min(-40.0).max(40.0).step(0.01).name("Hysteresis Delta");
    gui.add(renderer, 'feed').min(-0.1).max(0.1).step(0.001).name("Sparsify Color");
    gui.add(renderer, 'blurl').min(0.0).max(7.0).step(0.01).name("Debug View Ctrl");
    gui.add(renderer, 'toggleDebug').name("Debug View");
    gui.add(renderer, 'resetCounter').name("Reset");
    gui.add(renderer, 'snapshot').name("Screenshot");

    renderer.init();
};