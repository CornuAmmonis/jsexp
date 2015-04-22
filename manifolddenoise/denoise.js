var ManifoldDenoise = function(config){

    this.canvas = undefined;
    this.canvasQ = undefined;
    this.canvasWidth = undefined;
    this.canvasHeight = undefined;

    this.mRenderer = undefined;
    this.mScene = undefined;
    this.mCamera = undefined;

    this.uiStep = 0 >>> 0; // coerce to uint32
    this.uiTwo  = 2 >>> 0;

    this.mTexture1 = undefined;
    this.mTexture2 = undefined;
    this.mScreenQuad = undefined;

    this.feedbackMaterial = undefined;
    this.screenMaterial = undefined;
    this.debugScreenMaterial = undefined;

    this.image = undefined;

    this.textureWidth = 1024;
    this.textureHeight = 512;

    // Configuration.
    this.softf     = config.softf;
    this.timesteps = config.timesteps;

    this.mUniforms = {
        screenWidth:  {type: "f", value: undefined},
        screenHeight: {type: "f", value: undefined},
        tSource:      {type: "t", value: undefined},
        iSource:      {type: "t", value: undefined},
        step:         {type: "i", value: this.uiStep},
        softf:        {type: "f", value: this.softf}
    };

    this.load = function()
    {
        this.image = THREE.ImageUtils.loadTexture('frog.jpg', THREE.UVMapping, this.init.bind(this))
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
            wrapS:     THREE.RepeatWrapping,
            wrapT:     THREE.RepeatWrapping
        });
    };

    this.updateUniforms = function()
    {
        this.mUniforms.softf.value  = this.softf;
        this.mUniforms.step.value   = this.uiStep;
    };

    this.renderToTarget = function(material, tSource, target)
    {
        this.mScreenQuad.material = material;
        this.mUniforms.tSource.value = tSource;
        this.mRenderer.render(this.mScene, this.mCamera, target, true);
    };

    this.render = function()
    {

        this.updateUniforms();

        // Let's play triple FBO ping pong
        // step:    1-2-3-4-5-6
        // tSource: 1-2-2-3-3-1
        // sSource: 3-3-1-1-2-2
        // target:  2-1-3-2-1-3
        for(var i = 0; i < this.timesteps; ++i) {

            var pStep = this.uiStep % this.uiTwo;

            if (pStep == 0) {
                this.renderToTarget(this.feedbackMaterial, this.mTexture1, this.mTexture1);
            } else if (pStep == 1) {
                this.renderToTarget(this.feedbackMaterial, this.mTexture2, this.mTexture2);
            }

            this.uiStep++;
        }

        this.mScreenQuad.material = this.screenMaterial;
        this.mRenderer.render(this.mScene, this.mCamera);
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
        softf: 1.0,
        timesteps: 2
    });
    var gui = new dat.GUI();

    gui.add(manifoldDenoise, 'softf').min(0.0).max(1.0).step(0.01).name("Softness");
    gui.add(manifoldDenoise, 'timesteps').min(1).max(10).step(1).name("Timesteps");


    gui.remember(manifoldDenoise);

    manifoldDenoise.load();
};