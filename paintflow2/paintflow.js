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
    this.uiThree = 3 >>> 0;

    this.mTexture1 = undefined;
    this.mTexture2 = undefined;
    this.mTexture3 = undefined;
    this.mScreenQuad = undefined;

    this.fluidMaterial = undefined;
    this.screenMaterial = undefined;
    this.paintMaterial = undefined;
    this.debugScreenMaterial = undefined;

    this.image = undefined;

    this.textureWidth = 512;
    this.textureHeight = 512;

    this.paintcolor = [255, 255, 255];

    this.mMinusOnes = new THREE.Vector2(-1, -1);

    this.presets = [
        { // Default
            curlf: 0.256,
            fluxf: 0.128,
            divf:  0.0,
            lapf:  0.04,
            feedf: 1.001,
            expf:  0.2,
            mixf:  0.05,
            offf:  0.0
        }
    ];

    // Configuration.
    this.curlf = this.presets[0].curlf;
    this.fluxf = this.presets[0].fluxf;
    this.divf  = this.presets[0].divf;
    this.lapf  = this.presets[0].lapf;
    this.feedf = this.presets[0].feedf;
    this.expf  = this.presets[0].expf;
    this.mixf  = this.presets[0].mixf;
    this.offf  = this.presets[0].offf;
    this.brushsize  = 50.0;
    this.brushtype  = 0;
    this.timesteps = 2;

    this.mUniforms = {
        screenWidth: {type: "f", value: undefined},
        screenHeight: {type: "f", value: undefined},
        tSource: {type: "t", value: undefined},
        sSource: {type: "t", value: undefined},
        iSource: {type: "t", value: undefined},
        loadImage: {type: "f", value: 1.0},
        mixf:  {type: "f", value: this.mixf},
        curlf: {type: "f", value: this.curlf},
        fluxf: {type: "f", value: this.fluxf},
        divf:  {type: "f", value: this.divf},
        lapf:  {type: "f", value: this.lapf},
        feedf: {type: "f", value: this.feedf},
        expf:  {type: "f", value: this.expf},
        offf:  {type: "f", value: this.offf},
        brushsize: {type: "f", value: this.brushsize},
        brushtype: {type: "i", value: this.brushtype},
        brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
        color: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0)}
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

    this.initGl = function()
    {
        this.image = THREE.ImageUtils.loadTexture('clicktopaint.png');
        this.mRenderer = new THREE.WebGLRenderer({canvas: this.canvas, preserveDrawingBuffer: true});

        this.mScene = new THREE.Scene();
        this.mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
        this.mCamera.position.z = 0;
        this.mScene.add(this.mCamera);

        this.fluidMaterial = new THREE.ShaderMaterial({
            uniforms: this.mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('fluidFragmentShader').textContent
        });
        this.paintMaterial = new THREE.ShaderMaterial({
            uniforms: this.mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('paintFragmentShader').textContent
        });
        this.screenMaterial = new THREE.ShaderMaterial({
            uniforms: this.mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('screenFragmentShader').textContent
        });
        this.debugScreenMaterial = new THREE.ShaderMaterial({
            uniforms: this.mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('debugScreenFragmentShader').textContent
        });

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

        this.mUniforms.screenWidth.value = this.textureWidth;
        this.mUniforms.screenHeight.value = this.textureHeight;
        this.mUniforms.brush.value = this.mMinusOnes;

    };

    this.getWrappedRenderTarget = function(initImage) {
        return new THREE.WebGLRenderTarget(this.textureWidth, this.textureHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format:    THREE.RGBFormat,
            type:      THREE.FloatType,
            wrapS:     THREE.RepeatWrapping,
            wrapT:     THREE.RepeatWrapping
        });
    };

    this.render = function() {
        this.mUniforms.curlf.value = this.curlf;
        this.mUniforms.fluxf.value = this.fluxf;
        this.mUniforms.divf.value  = this.divf;
        this.mUniforms.lapf.value  = this.lapf;
        this.mUniforms.feedf.value = this.feedf;
        this.mUniforms.expf.value  = this.expf;
        this.mUniforms.mixf.value  = this.mixf;
        if (this.offf >= 1.0) {
            this.mUniforms.offf.value  = Math.exp(this.offf - 1.0) - 1.0;
        } else if (this.offf <= -1.0) {
            this.mUniforms.offf.value  = - (Math.exp(- this.offf - 1.0) - 1.0);
        } else {
            this.mUniforms.offf.value = 0.0;
        }
        this.mUniforms.brushsize.value  = this.brushsize;
        this.mUniforms.brushtype.value  = this.brushtype;
        this.mUniforms.color.value = new THREE.Vector4(
            this.paintcolor[0] / 255.0,
            this.paintcolor[1] / 255.0,
            this.paintcolor[2] / 255.0,
            0.0
        );

        // Let's play triple FBO ping pong
        // step:    1-2-3-4-5-6
        // tSource: 1-2-2-3-3-1
        // sSource: 3-3-1-1-2-2
        // target:  2-1-3-2-1-3
        for(var i = 0; i < this.timesteps; ++i) {

            var pStep = this.mStep % this.uiThree;

            if (pStep == 0) {
                this.mScreenQuad.material = this.fluidMaterial;
                this.mUniforms.tSource.value = this.mTexture1;
                this.mUniforms.sSource.value = this.mTexture3;
                this.mRenderer.render(this.mScene, this.mCamera, this.mTexture2, true);
                this.mScreenQuad.material = this.paintMaterial;
                this.mUniforms.tSource.value = this.mTexture2;
                this.mRenderer.render(this.mScene, this.mCamera, this.mTexture1, true);
                this.mUniforms.sSource.value = this.mTexture1;
            } else if (pStep == 1) {
                this.mScreenQuad.material = this.fluidMaterial;
                this.mUniforms.tSource.value = this.mTexture2;
                this.mUniforms.sSource.value = this.mTexture1;
                this.mRenderer.render(this.mScene, this.mCamera, this.mTexture3, true);
                this.mScreenQuad.material = this.paintMaterial;
                this.mUniforms.tSource.value = this.mTexture3;
                this.mRenderer.render(this.mScene, this.mCamera, this.mTexture2, true);
                this.mUniforms.sSource.value = this.mTexture2;
            } else if (pStep == 2) {
                this.mScreenQuad.material = this.fluidMaterial;
                this.mUniforms.tSource.value = this.mTexture3;
                this.mUniforms.sSource.value = this.mTexture2;
                this.mRenderer.render(this.mScene, this.mCamera, this.mTexture1, true);
                this.mScreenQuad.material = this.paintMaterial;
                this.mUniforms.tSource.value = this.mTexture1;
                this.mRenderer.render(this.mScene, this.mCamera, this.mTexture3, true);
                this.mUniforms.sSource.value = this.mTexture3;
            }

            this.mUniforms.brush.value = this.mMinusOnes;

            this.mStep++;
        }

        this.mScreenQuad.material = this.screenMaterial;
        this.mRenderer.render(this.mScene, this.mCamera);
        this.mUniforms.loadImage.value = 0.0;
        requestAnimationFrame(this.render.bind(this));
    };

    this.snapshot = function()
    {
        var dataURL = this.canvas.toDataURL("image/png");
        window.open(dataURL, "name-"+Math.random());
    };

    this.debug = function() {
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

    this.onMouseDown = function(e)
    {
        this.mMouseDown = true;
        this.mUniforms.brush.value = new THREE.Vector2(this.mMouseX/this.canvasWidth, 1-this.mMouseY/this.canvasHeight);
    };

    this.onMouseUp = function(e)
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

};


window.onload = function() {
    var paintFlow = new PaintFlow();
    var gui = new dat.GUI();

    gui.addColor(paintFlow, 'paintcolor').name("Paint Color");
    gui.add(paintFlow, 'brushsize').min(1).max(128).step(1).name("Brush Size");
    gui.add(paintFlow, 'mixf').min(0.0).max(1.0).step(0.001).name("Mixing");
    gui.add(paintFlow, 'offf').min(-10.0).max(10.0).step(0.1).name("Displacement");
    gui.add(paintFlow, 'curlf').min(0.01).max(0.512).step(0.001).name("Curl");
    gui.add(paintFlow, 'fluxf').min(0.085).max(0.512).step(0.001).name("Flux");
    gui.add(paintFlow, 'divf').min(-0.1).max(0.1).step(0.001).name("Divergence");
    gui.add(paintFlow, 'lapf').min(-0.1).max(0.1).step(0.001).name("Laplacian");
    gui.add(paintFlow, 'feedf').min(0.9998).max(1.01).step(0.001).name("Amplification");
    gui.add(paintFlow, 'expf').min(0.01).max(2.0).step(0.01).name("Curl Exponent");
    gui.add(paintFlow, 'timesteps').min(0).max(32).step(1).name("Speed");

    gui.add(paintFlow, 'snapshot').name("Screenshot");
    gui.add(paintFlow, 'debug').name("Fluid View");
    gui.remember(paintFlow);

    paintFlow.load();
};
