var init, load, loadPreset;


var maxStep = 6;

var state_arr = [0, 1, 2, 3, 4, 5];

(function(){

    // Canvas.
    var canvas;
    var canvasQ;
    var canvasWidth;
    var canvasHeight;

    var mRenderer;
    var mScene;
    var mCamera;
    var mUniforms;
    var mStep = 0 >>> 0; // coerce to uint32

    var mTexture1, mTexture2, iSource;
    var mScreenQuad;

    // Configuration.
    var amount = 1.0;
    var mix = 1.0;

    load = function()
    {
        // https://commons.wikimedia.org/wiki/File:Adams_The_Tetons_and_the_Snake_River.jpg
        iSource = THREE.ImageUtils.loadTexture('tetons.jpg', THREE.UVMapping, function() {
            init();
        })
    };

    init = function()
    {
        init_canvas();
        init_controls();
        init_uniforms();
        init_image(iSource);
        init_gl(canvas.clientWidth, canvas.clientHeight);
    };

    var init_canvas = function()
    {
        canvasQ = $('#myCanvas');
        canvas = canvasQ.get(0);
    };

    var init_uniforms = function()
    {
        mUniforms = {
            screenWidth: {type: "f", value: undefined},
            screenHeight: {type: "f", value: undefined},
            sSource: {type: "t", value: undefined},
            iSource: {type: "t", value: undefined},
            amount: {type: "f", value: amount},
            mix: {type: "f", value: mix},
            state: {type: "i", value: undefined}
        };
    };

    var init_gl = function(width, height)
    {
        mRenderer = new THREE.WebGLRenderer({canvas: canvas, preserveDrawingBuffer: true});
        mScene = new THREE.Scene();
        var ws = 0.5;
        mCamera = new THREE.OrthographicCamera(-ws, ws, ws, -ws, -10000, 10000);
        mCamera.position.z = 100;
        mScene.add(mCamera);

        var mWaveletSharpenMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('waveletSharpenFragmentShader').textContent
        });

        mScreenQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 1.0),
            mWaveletSharpenMaterial
        );

        mScene.add(mScreenQuad);

        resize(width, height);

        render();
        requestAnimationFrame(render);
    };

    var init_image = function(iSource)
    {
        iSource.wrapS = THREE.MirroredRepeatWrapping;
        iSource.wrapT = THREE.MirroredRepeatWrapping;
        iSource.needsUpdate = true;
        mUniforms.iSource.value = iSource;
    };

    var getMirrorWrappedRenderTarget = function(width, height)
    {
        var tgt = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});

        tgt.wrapS = THREE.MirroredRepeatWrapping;
        tgt.wrapT = THREE.MirroredRepeatWrapping;
        return tgt;
    };

    var resize = function(width, height)
    {
        // Set the new shape of canvas.
        canvasQ.width(width);
        canvasQ.height(height);

        // Get the real size of canvas.
        canvasWidth = canvasQ.width();
        canvasHeight = canvasQ.height();

        mRenderer.setSize(canvasWidth, canvasHeight);

        var tgtWidth = canvasWidth;
        var tgtHeight = canvasHeight;
        mTexture1 = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight);
        mTexture2 = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight);

        mUniforms.screenWidth.value = tgtWidth;
        mUniforms.screenHeight.value = tgtHeight;
    };

    var updateUniforms = function(step)
    {
        var pass = Math.min(step, maxStep - 1);
        mUniforms.state.value = state_arr[pass];
    };

    var render = function()
    {
        mUniforms.amount.value = amount;
        mUniforms.mix.value = mix;

        for(var i=0; i<maxStep; ++i)
        {
            updateUniforms(mStep);

            if (mStep % 2 == 0) {
                mUniforms.sSource.value = mTexture1;
                mRenderer.render(mScene, mCamera, mTexture2, true);
            } else if (mStep % 2 == 1) {
                mUniforms.sSource.value = mTexture2;
                mRenderer.render(mScene, mCamera, mTexture1, true);
            }

            mStep++;
        }
        mRenderer.render(mScene, mCamera);
        requestAnimationFrame(render);
    };

    var init_controls = function()
    {
        $("#sld_amount").slider({
            value: amount, min: 0.0, max:10.0, step:0.001,
            change: function(event, ui) {$("#amount").html(ui.value); amount = ui.value; mStep = 0;},
            slide: function(event, ui) {$("#amount").html(ui.value); amount = ui.value; mStep = 0;}
        });
        $("#sld_amount").slider("value", amount);

        $("#sld_mix").slider({
            value: mix, min: 0.0, max:1.0, step:0.001,
            change: function(event, ui) {$("#mix").html(ui.value); mix = ui.value; mStep = 0;},
            slide: function(event, ui) {$("#mix").html(ui.value); mix = ui.value; mStep = 0;}
        });
        $("#sld_mix").slider("value", mix);

        $("#notworking").click(function(){
            $("#requirement_dialog").dialog("open");
        });

        $("#requirement_dialog").dialog({
            autoOpen: false
        });
    };

})();
