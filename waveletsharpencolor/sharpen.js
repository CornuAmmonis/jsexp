var init, load, loadPreset;

var mWaveletSharpenMaterial, mScreenMaterial;

/* State table
 hpass:  0 1 2 1 2 d d
 lpass:  1 2 1 2 1 1 d
 level:  0 1 2 3 4 d d
 state:  2 2 2 2 2 1 0
 */

var maxStep = 10;
var hpass_arr = [0, 1, 2, 1, 2, 1, 2, 1, 1, 1];
var lpass_arr = [1, 2, 1, 2, 1, 2, 1, 2, 2, 2];
var level_arr = [1, 2, 3, 4, 5, 6, 7, 8, 0, 0];
var state_arr = [0, 1, 1, 1, 1, 1, 1, 1, 2, 3];

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

    var mTexture0a, mTexture0b, mTexture1a, mTexture1b, mTexture2a, mTexture2b, iSource;
    var mScreenQuad;

    var presets = [
        { // Default
            amount: 1.0,
            radius: 3.0
        }
    ];

    // Configuration.
    var amount = presets[0].amount;
    var radius = presets[0].radius;

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
        //init_presets();

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
            sSource0: {type: "t", value: undefined},
            sSource1: {type: "t", value: undefined},
            sSource2: {type: "t", value: undefined},
            iSource: {type: "t", value: undefined},
            amount: {type: "f", value: amount},
            radius: {type: "f", value: radius},
            hpass: {type: "i", value: undefined},
            lpass: {type: "i", value: undefined},
            level: {type: "i", value: undefined},
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

        mWaveletSharpenMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('waveletSharpenFragmentShader').textContent
        });
        mScreenMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('screenFragmentShader').textContent
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

    var init_presets = function()
    {
        document.ex.scene.value = 0;
    };

    var init_image = function(iSource)
    {
        iSource.wrapS = THREE.MirroredRepeatWrapping;
        iSource.wrapT = THREE.MirroredRepeatWrapping;
        iSource.needsUpdate = true;
        mUniforms.iSource.value = iSource;
    };

    var getMirrorWrappedRenderTarget = function(width, height, attachmentNumber)
    {
        var tgt = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});

        tgt.wrapS = THREE.MirroredRepeatWrapping;
        tgt.wrapT = THREE.MirroredRepeatWrapping;
        tgt.attachmentNumber = attachmentNumber;
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
        mTexture0a = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight, 0);
        mTexture0b = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight, 0);
        mTexture1a = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight, 1);
        mTexture1b = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight, 1);
        mTexture2a = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight, 2);
        mTexture2b = getMirrorWrappedRenderTarget(tgtWidth, tgtHeight, 2);

        mUniforms.screenWidth.value = tgtWidth;
        mUniforms.screenHeight.value = tgtHeight;
    };

    var updateUniforms = function(step)
    {
        var pass = Math.min(step, maxStep - 1);
        mUniforms.hpass.value = hpass_arr[pass];
        mUniforms.lpass.value = lpass_arr[pass];
        mUniforms.level.value = level_arr[pass];
        mUniforms.state.value = state_arr[pass];
        if (step < maxStep) {
            console.log(pass + " "
                    + hpass_arr[pass] + " "
                    + lpass_arr[pass] + " "
                    + level_arr[pass] + " "
                    + state_arr[pass] );
        }
    };

    var render = function()
    {
        mUniforms.radius.value = radius;
        mUniforms.amount.value = amount;
        mScreenQuad.material = mWaveletSharpenMaterial;

        for(var i=0; i<maxStep; ++i)
        {
            updateUniforms(mStep);

            if (mStep % 2 == 0) {
                mUniforms.sSource0.value = mTexture0a;
                mUniforms.sSource1.value = mTexture1a;
                mUniforms.sSource2.value = mTexture2a;
                mRenderer.render(mScene, mCamera, [mTexture0b, mTexture1b, mTexture2b] , true);
            } else if (mStep % 2 == 1) {
                mUniforms.sSource0.value = mTexture0b;
                mUniforms.sSource1.value = mTexture1b;
                mUniforms.sSource2.value = mTexture2b;
                mRenderer.render(mScene, mCamera, [mTexture0a, mTexture1a, mTexture2a] , true);
            }

            mStep++;
        }

        mScreenQuad.material = mScreenMaterial;
        mRenderer.render(mScene, mCamera);
        requestAnimationFrame(render);
    };

    loadPreset = function(idx)
    {
        amount = presets[idx].amount;
        radius = presets[idx].radius;
        worldToForm();
    };

    var worldToForm = function()
    {
        $("#sld_amount").slider("value", amount);
        $("#sld_radius").slider("value", radius);
    };

    var init_controls = function()
    {
        $("#sld_radius").slider({
            value: radius, min: 0.0, max:5.0, step:0.01,
            change: function(event, ui) {$("#radius").html(ui.value); radius = ui.value; mStep = 0;},
            slide: function(event, ui) {$("#radius").html(ui.value); radius = ui.value; mStep = 0;}
        });
        $("#sld_radius").slider("value", radius);

        $("#sld_amount").slider({
            value: amount, min: 0.0, max:3.0, step:0.01,
            change: function(event, ui) {$("#amount").html(ui.value); amount = ui.value; mStep = 0;},
            slide: function(event, ui) {$("#amount").html(ui.value); amount = ui.value; mStep = 0;}
        });
        $("#sld_amount").slider("value", amount);

        $("#notworking").click(function(){
            $("#requirement_dialog").dialog("open");
        });

        $("#requirement_dialog").dialog({
            autoOpen: false
        });
    };

})();