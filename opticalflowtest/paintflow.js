var PaintFlow = function(){

    this.canvas = undefined;
    this.canvasQ = undefined;
    this.canvasWidth = undefined;
    this.canvasHeight = undefined;

    this.mMouseX = undefined;
    this.mMouseY = undefined;
    this.mMouseDown = false;

    this.mRenderer = undefined;
    this.mScene = undefined;
    this.mCamera = undefined;
    
    this.mStep = 0 >>> 0; // coerce to uint32
    this.uiFour = 4 >>> 0;

    this.mTexture1 = undefined;
    this.mTexture2 = undefined;
    this.mTexture3 = undefined;
    this.mTexture4 = undefined;
    this.mScreenQuad = undefined;

    this.fluidShaderId = 'frustratedFlockingFluidFragmentShader';
    this.feedbackMaterial = undefined;
    this.screenMaterial = undefined;
    this.paintMaterial = undefined;
    this.debugScreenMaterial = undefined;

    this.image = undefined;

    this.textureWidth = 1024;
    this.textureHeight = 512;

    this.paintcolor = "#980000";

    this.mMinusOnes = new THREE.Vector2(-1, -1);

    this.presets = [
        { // Default
            curlf:  0.256,
            fluxf:  0.128,
            divf:   0.01,
            lapf:   0.04,
            feedf:  1.001,
            expf:   0.2,
            mixf:   0.85,
            offf:   0.0,
            sofff:  1.0,
            scalef: 5.0,
            flockf: 0.5,
            frustf: 0.4,
            contf:  0.0
        }
    ];

    // Configuration.
    this.curlf  = this.presets[0].curlf;
    this.fluxf  = this.presets[0].fluxf;
    this.divf   = this.presets[0].divf;
    this.lapf   = this.presets[0].lapf;
    this.feedf  = this.presets[0].feedf;
    this.expf   = this.presets[0].expf;
    this.mixf   = this.presets[0].mixf;
    this.offf   = this.presets[0].offf;
    this.flockf = this.presets[0].flockf;
    this.frustf = this.presets[0].frustf;
    this.sofff  = this.presets[0].sofff;
    this.scalef = this.presets[0].scalef;
    this.contf  = this.presets[0].contf;
    this.brushsize  = 50.0;
    this.brushtype  = 0;
    this.timesteps = 2;

    this.mUniforms = {
        screenWidth: {type: "f", value: undefined},
        screenHeight: {type: "f", value: undefined},
        tSource: {type: "t", value: undefined},
        tSource2: {type: "t", value: undefined},
        sSource: {type: "t", value: undefined},
        iSource: {type: "t", value: undefined},
        loadImage: {type: "f", value: 1.0},
        mixf   : {type: "f", value: this.mixf},
        curlf  : {type: "f", value: this.curlf},
        fluxf  : {type: "f", value: this.fluxf},
        divf   : {type: "f", value: this.divf},
        lapf   : {type: "f", value: this.lapf},
        feedf  : {type: "f", value: this.feedf},
        expf   : {type: "f", value: this.expf},
        offf   : {type: "f", value: this.offf},
        flockf : {type: "f", value: this.flockf},
        frustf : {type: "f", value: this.frustf},
        sofff  : {type: "f", value: this.sofff },
        scalef : {type: "f", value: this.scalef},
        contf  : {type: "f", value: this.contf},
        brushsize: {type: "f", value: this.brushsize},
        brushtype: {type: "i", value: this.brushtype},
        brush: {type: "v2", value: this.mMinusOnes},
        color: {type: "v4", value: new THREE.Vector4(0.588, 0, 0, 0)}
    };

    this.load = function()
    {
        this.image = THREE.ImageUtils.loadTexture('clicktopaint.png', THREE.UVMapping, this.init.bind(this))
    };

    this.init = function()
    {
        this.mUniforms.iSource.value = this.image;
        this.initCanvas();
        this.initGl();
        this.render();
    };

    this.initCanvas = function()
    {
        this.canvasQ = $('#myCanvas');
        this.canvas = this.canvasQ.get(0);

        this.canvas.onmousedown = this.onMouseDown.bind(this);
        this.canvas.onmouseup   = this.onMouseUp.bind(this);
        this.canvas.onmousemove = this.onMouseMove.bind(this);

        window.addEventListener( 'resize', this.onResize.bind(this), false );
    };

    this.getMaterial = function(fragmentShaderId)
    {
        return new THREE.ShaderMaterial({
            uniforms: this.mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById(fragmentShaderId).textContent
        });
    };

    this.initGl = function()
    {
        this.mRenderer = new THREE.WebGLRenderer({canvas: this.canvas});

        this.mScene = new THREE.Scene();
        this.mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
        this.mCamera.position.z = 0;
        this.mScene.add(this.mCamera);

        this.feedbackMaterial = this.getMaterial(this.fluidShaderId);
        this.paintMaterial = this.getMaterial('paintFragmentShader');
        this.screenMaterial = this.getMaterial('screenFragmentShader');
        this.debugScreenMaterial = this.getMaterial('debugScreenFragmentShader');

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

        this.mTexture1 = this.getWrappedRenderTarget();
        this.mTexture2 = this.getWrappedRenderTarget();
        this.mTexture3 = this.getWrappedRenderTarget();
        this.mTexture4 = this.getWrappedRenderTarget();

        this.mUniforms.screenWidth.value = this.textureWidth;
        this.mUniforms.screenHeight.value = this.textureHeight;
        this.mUniforms.brush.value = this.mMinusOnes;

    };

    this.getWrappedRenderTarget = function()
    {
        var rt = new THREE.WebGLRenderTarget(this.textureWidth, this.textureHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format:    THREE.RGBFormat,
            type:      THREE.FloatType,
            wrapS:     THREE.RepeatWrapping,
            wrapT:     THREE.RepeatWrapping
        });
        this.mRenderer.clearTarget(rt, true, true, true);
        return rt;
    };

    this.updateUniforms = function()
    {
        this.mUniforms.curlf.value  = this.curlf;
        this.mUniforms.fluxf.value  = this.fluxf;
        this.mUniforms.divf.value   = this.divf;
        this.mUniforms.lapf.value   = this.lapf;
        this.mUniforms.feedf.value  = this.feedf;
        this.mUniforms.expf.value   = this.expf;
        this.mUniforms.flockf.value = this.flockf;
        this.mUniforms.frustf.value = this.frustf;
        this.mUniforms.sofff.value  = this.sofff;
        this.mUniforms.scalef.value = this.scalef;
        this.mUniforms.contf.value  = 1.0 + 0.005 * this.contf;
        this.mUniforms.mixf.value   = Math.exp(10 * (this.mixf - 1.0));
        if (this.offf >= 1.0) {
            this.mUniforms.offf.value  = Math.exp(this.offf - 1.0) - 1.0;
        } else if (this.offf <= -1.0) {
            this.mUniforms.offf.value  = - (Math.exp(- this.offf - 1.0) - 1.0);
        } else {
            this.mUniforms.offf.value = 0.0;
        }
        this.mUniforms.brushsize.value  = this.brushsize;
        this.mUniforms.brushtype.value  = this.brushtype;
        var color = this.parseColorString(this.paintcolor);
        this.mUniforms.color.value = new THREE.Vector4(
            color[0] / 255.0,
            color[1] / 255.0,
            color[2] / 255.0,
            0.0
        );
    };

    this.renderToTarget = function(material, tSource, tSource2, sSource, target)
    {
        this.mScreenQuad.material = material;
        this.mUniforms.tSource.value = tSource;
        this.mUniforms.tSource2.value = tSource2;
        this.mUniforms.sSource.value = sSource;
        this.mRenderer.render(this.mScene, this.mCamera, target, true);
    };

    this.render = function()
    {

        this.updateUniforms();

        for(var i = 0; i < this.timesteps; ++i) {

            var pStep = this.mStep % this.uiFour;

            if (pStep == 0) {
                this.renderToTarget(this.feedbackMaterial, this.mTexture1, this.mTexture2, this.mTexture3, this.mTexture4);
                this.renderToTarget(this.paintMaterial,    this.mTexture4, this.mTexture1, this.mTexture3, this.mTexture2);
            } else if (pStep == 1) {
                this.renderToTarget(this.feedbackMaterial, this.mTexture4, this.mTexture1, this.mTexture2, this.mTexture3);
                this.renderToTarget(this.paintMaterial,    this.mTexture3, this.mTexture4, this.mTexture2, this.mTexture1);
            } else if (pStep == 2) {
                this.renderToTarget(this.feedbackMaterial, this.mTexture3, this.mTexture4, this.mTexture1, this.mTexture2);
                this.renderToTarget(this.paintMaterial,    this.mTexture2, this.mTexture3, this.mTexture1, this.mTexture4);
            } else if (pStep == 3) {
                this.renderToTarget(this.feedbackMaterial, this.mTexture2, this.mTexture3, this.mTexture4, this.mTexture1);
                this.renderToTarget(this.paintMaterial,    this.mTexture1, this.mTexture2, this.mTexture4, this.mTexture3);
            }

            this.mUniforms.brush.value = this.mMinusOnes;

            this.mStep++;
        }

        this.mScreenQuad.material = this.screenMaterial;
        this.mRenderer.render(this.mScene, this.mCamera);
        this.mUniforms.loadImage.value = 0.0; // only load image on first frame
        requestAnimationFrame(this.render.bind(this));
    };

    this.snapshot = function()
    {
        var dataURL = this.canvas.toDataURL("image/jpeg");
        window.open(dataURL, "name-"+Math.random());
    };

    this.debug = function()
    {
        var temp = this.debugScreenMaterial;
        this.debugScreenMaterial = this.screenMaterial;
        this.screenMaterial = temp;
    };

    this.onMouseMove = function(e)
    {
        var ev = e ? e : window.event;

        this.mMouseX = ev.pageX - this.canvasQ.offset().left; // these offsets work with
        this.mMouseY = ev.pageY - this.canvasQ.offset().top; //  scrolled documents too

        if(this.mMouseDown) {
            this.mUniforms.brush.value = new THREE.Vector2(this.mMouseX / this.canvasWidth, 1 - this.mMouseY / this.canvasHeight);
        }
    };

    this.onMouseDown = function()
    {
        this.mMouseDown = true;
        this.mUniforms.brush.value = new THREE.Vector2(this.mMouseX/this.canvasWidth, 1-this.mMouseY/this.canvasHeight);
    };

    this.onMouseUp = function()
    {
        this.mMouseDown = false;
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

    this.parseColorString = function(colorString)
    {
        var m = colorString.match(/^#([0-9a-f]{6})$/i)[1];
        if( m ) {
            return [
                parseInt(m.substr(0,2),16),
                parseInt(m.substr(2,2),16),
                parseInt(m.substr(4,2),16)
            ];
        } else {
            return [255, 255, 255];
        }
    };

    this.updateFluidShader = function(shaderId) {
        this.feedbackMaterial = this.getMaterial(shaderId);
    };

};

var swappableControllers = [];

var swappableControllerUniforms = {
    'smokeFluidFragmentShader' : [
        {id: 'curlf',  name: 'Curl',          min: -2.0,   max: 2.0,  step: 0.001},
        {id: 'fluxf',  name: 'Flux',          min: -0.5,   max: 0.5,  step: 0.001},
        {id: 'divf',   name: 'Divergence',    min: -1,     max: 1,    step: 0.001},
        {id: 'lapf',   name: 'Laplacian',     min: -0.1,   max: 0.1,  step: 0.001},
        {id: 'feedf',  name: 'Amplification', min: 0.9998, max: 1.01, step: 0.001},
        {id: 'expf',   name: 'Curl Exponent', min: 0.0,    max: 3.0,  step: 0.001}
    ],
    'frustratedFlockingFluidFragmentShader' : [
        {id: 'flockf', name: 'Flocking',      min: -0.6,   max: 0.6,  step: 0.001},
        {id: 'frustf', name: 'Frustration',   min: -0.6,   max: 0.6,  step: 0.001},
        {id: 'fluxf',  name: 'Flux',          min: -0.5,   max: 0.5,  step: 0.001},
        {id: 'divf',   name: 'Divergence',    min: -0.6,   max: 0.6,  step: 0.001},
        {id: 'lapf',   name: 'Laplacian',     min: -0.1,   max: 0.1,  step: 0.001},
        {id: 'feedf',  name: 'Amplification', min: 0.9998, max: 1.01, step: 0.001}
    ],
    'simplexNoiseFragmentShader' : [
        {id: 'scalef', name: 'Simplex Scale', min: 0.0,    max: 100.0, step: 0.1},
        {id: 'sofff',  name: 'Y Offset',      min: 0.0,    max: 1.0,   step: 0.001}
    ]
};

var updateUI = function(shaderId, gui, paintFlow) {
    swappableControllers.forEach( function (controller) {
        gui.remove(controller);
    });
    swappableControllers = [];
    var uniformsToSwap = swappableControllerUniforms[shaderId];
    uniformsToSwap.forEach( function (params) {
        swappableControllers.push(
            gui.add(paintFlow, params.id)
                .min(params.min)
                .max(params.max)
                .step(params.step)
                .name(params.name)
        );
    });
    paintFlow.updateFluidShader(shaderId);
};

window.onload = function() {
    var paintFlow = new PaintFlow();
    var gui = new dat.GUI();

    gui.add(paintFlow, 'timesteps').min(0).max(10).step(1).name("Speed");
    gui.add(paintFlow, 'snapshot').name("Screenshot");
    gui.add(paintFlow, 'debug').name("Fluid View");
    gui.add(paintFlow, 'fluidShaderId', {
        'Frustrated Flocking': 'frustratedFlockingFluidFragmentShader',
        'Smoke': 'smokeFluidFragmentShader'
    }).name("Fluid Type").onChange(function(shaderId){updateUI(shaderId, gui, paintFlow)});
    updateUI('frustratedFlockingFluidFragmentShader', gui, paintFlow);

    gui.remember(paintFlow);

    paintFlow.load();
};
