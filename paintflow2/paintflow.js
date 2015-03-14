var PaintFlow = function(){

    // Canvas.
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
    this.mUniforms = {
        screenWidth: {type: "f", value: undefined},
        screenHeight: {type: "f", value: undefined},
        tSource: {type: "t", value: undefined},
        sSource: {type: "t", value: undefined},
        curlf: {type: "f", value: this.curlf},
        fluxf: {type: "f", value: this.fluxf},
        divf:  {type: "f", value: this.divf},
        lapf:  {type: "f", value: this.lapf},
        feedf: {type: "f", value: this.feedf},
        expf:  {type: "f", value: this.expf},
        brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
        color: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0)}
    };
    
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

    this.textureWidth = 512;
    this.textureHeight = 512;

    this.paintcolor = [255, 255, 255];

    this.mMinusOnes = new THREE.Vector2(-1, -1);

    this.presets = [
        { // Default
            curlf: 0.256,
            fluxf: 0.128,
            divf:  0,
            lapf:  0.04,
            feedf: 1.001,
            expf:  0.2
        }
    ];

    // Configuration.
    this.curlf = this.presets[0].curlf;
    this.fluxf = this.presets[0].fluxf;
    this.divf  = this.presets[0].divf;
    this.lapf  = this.presets[0].lapf;
    this.feedf = this.presets[0].feedf;
    this.expf  = this.presets[0].expf;
    this.timesteps = 2;

    this.init = function()
    {
        this.initCanvas();
        this.initGl();
    };

    this.initCanvas = function()
    {
        this.canvasQ = $('#myCanvas');
        this.canvas = this.canvasQ.get(0);

        this.canvas.onmousedown = this.onMouseDown.bind(this);
        this.canvas.onmouseup   = this.onMouseUp.bind(this);
        this.canvas.onmousemove = this.onMouseMove.bind(this);
    };

    this.initGl = function()
    {
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
        this.canvasQ.width(this.canvas.clientWidth);
        this.canvasQ.height(this.canvas.clientHeight);

        // Get the real size of canvas.
        this.canvasWidth = this.canvasQ.width();
        this.canvasHeight = this.canvasQ.height();

        this.mRenderer.setSize(this.canvasWidth, this.canvasHeight);

        this.mTexture1 = this.getWrappedRenderTarget();
        this.mTexture2 = this.getWrappedRenderTarget();
        this.mTexture3 = this.getWrappedRenderTarget();

        this.mUniforms.screenWidth.value = this.textureWidth;
        this.mUniforms.screenHeight.value = this.textureHeight;
        this.mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);

        //this.render(0);
        //requestAnimationFrame(this.render);
    };

    this.getWrappedRenderTarget = function() {
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

};


window.onload = function() {
    var paintFlow = new PaintFlow();
    var gui = new dat.GUI();

    gui.add(paintFlow, 'curlf').min(0.01).max(0.512).step(0.001);
    gui.add(paintFlow, 'fluxf').min(0.085).max(0.512).step(0.001);
    gui.add(paintFlow, 'divf').min(-0.1).max(0.1).step(0.001);
    gui.add(paintFlow, 'lapf').min(-0.1).max(0.1).step(0.001);
    gui.add(paintFlow, 'feedf').min(0.9998).max(1.01).step(0.001);
    gui.add(paintFlow, 'expf').min(0.01).max(2.0).step(0.01);
    gui.add(paintFlow, 'timesteps').min(0).max(32).step(1);
    gui.addColor(paintFlow, 'paintcolor');
    gui.add(paintFlow, 'snapshot');
    gui.add(paintFlow, 'debug');

    paintFlow.init();
    paintFlow.render();
};
