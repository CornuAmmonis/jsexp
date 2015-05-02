var ManifoldDenoise = function(config){

    this.canvas = undefined;
    this.canvasQ = undefined;
    this.canvasWidth = undefined;
    this.canvasHeight = undefined;

    this.mRenderer = undefined;
    this.mScene = undefined;
    this.mCamera = undefined;

    this.uiStep = 0 >>> 0; // coerce to uint32
    this.uiMax  = 1 >>> 0;

    this.uiChannel = 0 >>> 0;

    this.mTexture1 = undefined;
    this.mTexture2 = undefined;
    this.mTexture3 = undefined;
    this.mTexture4 = undefined;
    this.mTexture5 = undefined;
    this.mTexture6 = undefined;
    this.mTexture7 = undefined;
    this.mScreenQuad = undefined;

    this.feedbackMaterial = undefined;
    this.sliceMaterial = undefined;
    this.screenMaterial = undefined;

    this.image = undefined;

    this.textureWidth = 1024;
    this.textureHeight = 1024;

    // Configuration.
    this.amount = config.amount;
    this.mix    = config.mix;
    this.exps   = config.exps;
    this.detail = config.detail;

    this.mUniforms = {
        screenWidth:  {type: "f", value: undefined},
        screenHeight: {type: "f", value: undefined},
        sSource:      {type: "t", value: undefined},
        sSource0:     {type: "t", value: undefined},
        sSource1:     {type: "t", value: undefined},
        sSource2:     {type: "t", value: undefined},
        iSource:      {type: "t", value: undefined},
        step:         {type: "i", value: this.uiStep},
        chan:         {type: "i", value: this.uiChannel},
        amount:       {type: "f", value: this.amount},
        mix:          {type: "f", value: this.mix},
        detail:       {type: "f", value: this.detail},
        exps:         {type: "f", value: this.exps}
    };

    this.load = function()
    {
        // Collared Aracari -- Parque Nacional Darién, Panama -- 2008 February
        // https://commons.wikimedia.org/wiki/File:Pteroglossus-torquatus-001.jpg#/media/File:Pteroglossus-torquatus-001.jpg
        this.image = THREE.ImageUtils.loadTexture('toucan.jpg', THREE.UVMapping, this.init.bind(this))
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

        window.addEventListener('resize', this.onResize.bind(this), false );
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
        this.mRenderer = new THREE.WebGLRenderer({canvas: this.canvas, preserveDrawingBuffer: true});

        this.mScene = new THREE.Scene();
        this.mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
        this.mCamera.position.z = 0;
        this.mScene.add(this.mCamera);

        this.feedbackMaterial = this.getMaterial('feedbackFragmentShader');
        this.sliceMaterial = this.getMaterial('sliceFragmentShader');
        this.screenMaterial = this.getMaterial('screenFragmentShader');

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
        this.mTexture5 = this.getWrappedRenderTarget();
        this.mTexture6 = this.getWrappedRenderTarget();
        this.mTexture7 = this.getWrappedRenderTarget();

        this.mUniforms.screenWidth.value = this.textureWidth;
        this.mUniforms.screenHeight.value = this.textureHeight;

    };

    this.getWrappedRenderTarget = function()
    {
        return new THREE.WebGLRenderTarget(this.textureWidth, this.textureHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format:    THREE.RGBFormat,
            type:      THREE.FloatType,
            wrapS:     THREE.MirroredRepeatWrapping,
            wrapT:     THREE.MirroredRepeatWrapping
        });
    };

    this.updateUniforms = function()
    {
        this.mUniforms.amount.value = this.amount;
        this.mUniforms.exps.value   = this.exps;
        this.mUniforms.mix.value    = this.mix;
    };

    this.renderToTarget = function(sSource, target)
    {
        this.mScreenQuad.material = this.feedbackMaterial;
        this.mUniforms.sSource.value = sSource;
        this.mRenderer.render(this.mScene, this.mCamera, target, true);
    };

    this.sliceTarget = function(sSource0, sSource1, sSource2, target)
    {
        this.mScreenQuad.material = this.sliceMaterial;
        this.mUniforms.sSource0.value = sSource0;
        this.mUniforms.sSource1.value = sSource1;
        this.mUniforms.sSource2.value = sSource2;
        this.mRenderer.render(this.mScene, this.mCamera, target, true);
    };

    this.render = function()
    {
        if (this.uiStep < this.uiMax) {
            this.updateUniforms();

            this.mUniforms.step.value = 0;

            this.mUniforms.chan.value = 0;
            this.renderToTarget(this.mTexture1, this.mTexture2);
            this.mUniforms.chan.value = 1;
            this.renderToTarget(this.mTexture1, this.mTexture3);
            this.mUniforms.chan.value = 2;
            this.renderToTarget(this.mTexture1, this.mTexture4);

            this.mUniforms.step.value = 1;

            this.renderToTarget(this.mTexture2, this.mTexture5);
            this.renderToTarget(this.mTexture3, this.mTexture6);
            this.renderToTarget(this.mTexture4, this.mTexture7);

            this.sliceTarget(this.mTexture5, this.mTexture6, this.mTexture7, this.mTexture1);

            this.uiStep++;
        }
        this.mUniforms.detail.value = this.detail;
        this.mUniforms.sSource.value = this.mTexture1;
        this.mScreenQuad.material = this.screenMaterial;
        this.mRenderer.render(this.mScene, this.mCamera);
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

    this.debug = function()
    {
        var temp = this.debugScreenMaterial;
        this.debugScreenMaterial = this.screenMaterial;
        this.screenMaterial = temp;
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

var swappableControllers = [];

var swappableControllerUniforms = {};

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
    var manifoldDenoise = new ManifoldDenoise({
        amount: 5.0,
        mix: 1.0,
        exps: 3.0,
        detail: 0.0
    });
    var gui = new dat.GUI();

    gui.add(manifoldDenoise, 'mix').min(0.0).max(1.0).step(0.01).name("Mix").onChange(manifoldDenoise.resetCounter.bind(manifoldDenoise));
    gui.add(manifoldDenoise, 'amount').min(0.0).max(20.0).step(0.01).name("Hardness").onChange(manifoldDenoise.resetCounter.bind(manifoldDenoise));
    gui.add(manifoldDenoise, 'exps').min(0.0).max(5.0).step(0.01).name("Exponent").onChange(manifoldDenoise.resetCounter.bind(manifoldDenoise));
    gui.add(manifoldDenoise, 'detail').min(0.0).max(3.0).step(0.01).name("Enhance Detail");

    manifoldDenoise.load();
};