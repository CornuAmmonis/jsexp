var init, loadPreset, clean, snapshot, fullscreen, alertInvalidShareString, parseShareString, updateShareString, mColor;
var mGSMaterial, mStatMaterial, mScreenMaterial;

(function(){

    // Canvas.
    var canvas;
    var canvasQ;
    var canvasWidth;
    var canvasHeight;

    var mMouseX, mMouseY;
    var mMouseDown = false;

    var mRenderer;
    var mScene;
    var mCamera;
    var mUniforms;
    var mColorsNeedUpdate = true;
    var mLastTime = 0;
    var mStep = 0 >>> 0; // coerce to uint32
    var uiThree = 3 >>> 0;

    var mTexture1, mTexture2, mTexture3;
    var mScreenQuad;

    var mMinusOnes = new THREE.Vector2(-1, -1);

    var presets = [
        { // Default
            curlf: 0.256,
            fluxf: 0.128,
            divf:  0,
            lapf:  0.04,
            feedf: 1.001,
            expf:  0.2
        },{ // Slow Waves
            curlf: 0.011,
            fluxf: 0.179,
            divf:  0,
            lapf:  0.04,
            feedf: 1.00062,
            expf:  1.016
        },{ // Twist
            curlf: 0.512,
            fluxf: 0.091,
            divf:  0.01828,
            lapf:  -0.0454,
            feedf: 1.01,
            expf:  0.911
        },{ // Spout
            curlf: 0.048,
            fluxf: 0.139,
            divf:  -0.00015,
            lapf:  0.0035,
            feedf: 1.001,
            expf:  0.73
        },{ // Anemone
            curlf: 0.026,
            fluxf: 0.154,
            divf:  -0.00006,
            lapf:  0.05,
            feedf: 1.001,
            expf:  0.73
        },{ // Logistic
            curlf: 0.026,
            fluxf: 0.154,
            divf:  0.04295,
            lapf:  0.05,
            feedf: 1.01,
            expf:  0.73
        },{ // Anisotropic
            curlf: 0.355,
            fluxf: 0.2,
            divf:  0.04295,
            lapf:  0.0475,
            feedf: 1.00297,
            expf:  0.73
        },{ // Oregonator
            curlf: 0.019,
            fluxf: 0.094,
            divf:  -0.00038,
            lapf:  0.0001,
            feedf: 1.0017,
            expf:  1.064
        },{ // Blink
            curlf: 0.019,
            fluxf: 0.094,
            divf:  -0.02756,
            lapf:  0.024,
            feedf: 1.0017,
            expf:  1.064
        },{ // Mini Spouts
            curlf: 0.15,
            fluxf: 0.095,
            divf:  -0.05,
            lapf:  -0.0007,
            feedf: 1.00909,
            expf:  0.292
        },{ // Chaotic Spouts
            curlf: 0.029,
            fluxf: 0.162,
            divf:  -0.02688,
            lapf:  -0.0256,
            feedf: 1.00909,
            expf:  0.292
        }
    ];

    var statShaders = [
        "paintFragmentShader"
    ];

    // Configuration.
    var curlf = presets[0].curlf;
    var fluxf = presets[0].fluxf;
    var divf = presets[0].divf;
    var lapf = presets[0].lapf;
    var feedf = presets[0].feedf;
    var expf = presets[0].expf;
    var fragmentShaderId = statShaders[0];
    var timesteps = 2;

    init = function()
    {
        init_canvas();
        init_color();
        init_controls();
        init_gl(canvas.clientWidth, canvas.clientHeight);
        init_presets();

    };

    var init_canvas = function()
    {
        canvasQ = $('#myCanvas');
        canvas = canvasQ.get(0);

        canvas.onmousedown = onMouseDown;
        canvas.onmouseup = onMouseUp;
        canvas.onmousemove = onMouseMove;
    }

    var init_gl = function(width, height)
    {
        mRenderer = new THREE.WebGLRenderer({canvas: canvas, preserveDrawingBuffer: true});

        mScene = new THREE.Scene();
        mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);
        mCamera.position.z = 0;
        mScene.add(mCamera);

        mUniforms = {
            screenWidth: {type: "f", value: undefined},
            screenHeight: {type: "f", value: undefined},
            tSource: {type: "t", value: undefined},
            sSource: {type: "t", value: undefined},
            delta: {type: "f", value: 1.0},
            curlf: {type: "f", value: curlf},
            fluxf: {type: "f", value: fluxf},
            divf: {type: "f", value: divf},
            lapf: {type: "f", value: lapf},
            feedf: {type: "f", value: feedf},
            expf: {type: "f", value: expf},
            brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
            color: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0)}
        };

        var defaultFragmentShader = statShaders[0];

        mGSMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('gsFragmentShader').textContent
        });
        mStatMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById(defaultFragmentShader).textContent
        });
        mScreenMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('screenFragmentShader').textContent
        });

        fragmentShaderId = defaultFragmentShader;

        var plane = new THREE.PlaneGeometry(1.0, 1.0);
        mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
        mScene.add(mScreenQuad);

        mColorsNeedUpdate = true;

        resize(width, height);

        render(0);
        mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
        mLastTime = new Date().getTime();
        requestAnimationFrame(render);
    };

    var init_presets = function()
    {
        document.ex.scene.value = 0;
    };

    var resize = function(width, height)
    {
        // Set the new shape of canvas.
        canvasQ.width(width);
        canvasQ.height(height);

        // Get the real size of canvas.
        canvasWidth = canvasQ.width();
        canvasHeight = canvasQ.height();

        var textureWidth = canvasWidth/2;
        var textureHeight = canvasHeight/2;

        mRenderer.setSize(canvasWidth, canvasHeight);

        // TODO: Possible memory leak?
        mTexture1 = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});
        mTexture2 = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});
        mTexture3 = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});
        mTexture1.wrapS = THREE.RepeatWrapping;
        mTexture1.wrapT = THREE.RepeatWrapping;
        mTexture2.wrapS = THREE.RepeatWrapping;
        mTexture2.wrapT = THREE.RepeatWrapping;
        mTexture3.wrapS = THREE.RepeatWrapping;
        mTexture3.wrapT = THREE.RepeatWrapping;

        mUniforms.screenWidth.value = textureWidth;
        mUniforms.screenHeight.value = textureHeight;
    };

    var render = function(time)
    {
        var dt = time - mLastTime;
        mLastTime = time;
        mUniforms.delta.value = dt;
        mUniforms.curlf.value = curlf;
        mUniforms.fluxf.value = fluxf;
        mUniforms.divf.value = divf;
        mUniforms.lapf.value = lapf;
        mUniforms.feedf.value = feedf;
        mUniforms.expf.value = expf;

        // Let's play triple FBO ping pong
        // step:    1-2-3-4-5-6
        // tSource: 1-2-2-3-3-1
        // sSource: 3-3-1-1-2-2
        // target:  2-1-3-2-1-3
        for(var i=0; i<timesteps; ++i)
        {

            var pStep = mStep % uiThree;

            if (pStep == 0) {
                mScreenQuad.material = mGSMaterial;
                mUniforms.tSource.value = mTexture1;
                mUniforms.sSource.value = mTexture3;
                mRenderer.render(mScene, mCamera, mTexture2, true);
                mScreenQuad.material = mStatMaterial;
                mUniforms.tSource.value = mTexture2;
                mRenderer.render(mScene, mCamera, mTexture1, true);
                mUniforms.sSource.value = mTexture1;
            } else if (pStep == 1) {
                mScreenQuad.material = mGSMaterial;
                mUniforms.tSource.value = mTexture2;
                mUniforms.sSource.value = mTexture1;
                mRenderer.render(mScene, mCamera, mTexture3, true);
                mScreenQuad.material = mStatMaterial;
                mUniforms.tSource.value = mTexture3;
                mRenderer.render(mScene, mCamera, mTexture2, true);
                mUniforms.sSource.value = mTexture2;
            } else if (pStep == 2) {
                mScreenQuad.material = mGSMaterial;
                mUniforms.tSource.value = mTexture3;
                mUniforms.sSource.value = mTexture2;
                mRenderer.render(mScene, mCamera, mTexture1, true);
                mScreenQuad.material = mStatMaterial;
                mUniforms.tSource.value = mTexture1;
                mRenderer.render(mScene, mCamera, mTexture3, true);
                mUniforms.sSource.value = mTexture3;
            }

            mUniforms.brush.value = mMinusOnes;

            mStep++;
        }

        if(mColorsNeedUpdate) {
            mUniforms.color.value = new THREE.Vector4(mColor.r, mColor.g, mColor.b, 0.0);
            mColorsNeedUpdate = false;
        }

        mScreenQuad.material = mScreenMaterial;
        mRenderer.render(mScene, mCamera);

        requestAnimationFrame(render);
    };

    loadPreset = function(idx)
    {
        curlf = presets[idx].curlf;
        fluxf = presets[idx].fluxf;
        divf = presets[idx].divf;
        lapf = presets[idx].lapf;
        feedf = presets[idx].feedf;
        expf = presets[idx].expf;
        worldToForm();
    };

    var onMouseMove = function(e)
    {
        var ev = e ? e : window.event;

        mMouseX = ev.pageX - canvasQ.offset().left; // these offsets work with
        mMouseY = ev.pageY - canvasQ.offset().top; //  scrolled documents too

        if(mMouseDown)
            mUniforms.brush.value = new THREE.Vector2(mMouseX/canvasWidth, 1-mMouseY/canvasHeight);
    };

    var onMouseDown = function(e)
    {
        var ev = e ? e : window.event;
        mMouseDown = true;

        mUniforms.brush.value = new THREE.Vector2(mMouseX/canvasWidth, 1-mMouseY/canvasHeight);
    };

    var onMouseUp = function(e)
    {
        mMouseDown = false;
    };

    clean = function()
    {
        mUniforms.brush.value = new THREE.Vector2(-10, -10);
        init_gl(canvas.clientWidth, canvas.clientHeight);
    };

    snapshot = function()
    {
        var dataURL = canvas.toDataURL("image/png");
        window.open(dataURL, "name-"+Math.random());
    };

    var worldToForm = function()
    {
        $("#sld_curl").slider("value", curlf);
        $("#sld_flux").slider("value", fluxf);
        $("#sld_divergence").slider("value", divf);
        $("#sld_laplacian").slider("value", lapf);
        $("#sld_feedback").slider("value", feedf);
        $("#sld_exponent").slider("value", expf);
        $("#sld_timesteps").slider("value", timesteps);
    };

    var init_color = function()
    {
        $('.color').colorPicker({
            color: 'rgb(255, 255, 255)',
            renderCallback: function() {
                mColor = this.color.colors.rgb;
                mColorsNeedUpdate = true;
                updateShareString();
            }
        });
        mColor = { r: 1.0, g: 1.0, b: 1.0 };
    };

    var init_controls = function()
    {
        $("#sld_curl").slider({
            value: curlf, min: 0.01, max:0.512, step:0.001,
            change: function(event, ui) {$("#curl").html(ui.value); curlf = ui.value; updateShareString();},
            slide: function(event, ui) {$("#curl").html(ui.value); curlf = ui.value; updateShareString();}
        });
        $("#sld_curl").slider("value", curlf);

        $("#sld_flux").slider({
            value: fluxf, min: 0.085, max:0.2, step:0.001,
            change: function(event, ui) {$("#flux").html(ui.value); fluxf = ui.value; updateShareString();},
            slide: function(event, ui) {$("#flux").html(ui.value); fluxf = ui.value; updateShareString();}
        });
        $("#sld_flux").slider("value", fluxf);

        $("#sld_divergence").slider({
            value: divf, min: -0.05, max:0.05, step:0.00001,
            change: function(event, ui) {$("#divergence").html(ui.value); divf = ui.value; updateShareString();},
            slide: function(event, ui) {$("#divergence").html(ui.value); divf = ui.value; updateShareString();}
        });
        $("#sld_divergence").slider("value", divf);

        $("#sld_laplacian").slider({
            value: lapf, min: -0.05, max:0.05, step:0.0001,
            change: function(event, ui) {$("#laplacian").html(ui.value);lapf = ui.value; updateShareString();},
            slide: function(event, ui) {$("#laplacian").html(ui.value); lapf = ui.value; updateShareString();}
        });
        $("#sld_laplacian").slider("value", lapf);

        $("#sld_feedback").slider({
            value: feedf, min: 0.9998, max:1.01, step:0.00001,
            change: function(event, ui) {$("#feedback").html(ui.value);feedf = ui.value; updateShareString();},
            slide: function(event, ui) {$("#feedback").html(ui.value); feedf = ui.value; updateShareString();}
        });
        $("#sld_feedback").slider("value", feedf);

        $("#sld_exponent").slider({
            value: expf, min: 0.01, max:2.0, step:0.001,
            change: function(event, ui) {$("#exponent").html(ui.value);expf = ui.value; updateShareString();},
            slide: function(event, ui) {$("#exponent").html(ui.value); expf = ui.value; updateShareString();}
        });
        $("#sld_exponent").slider("value", expf);

        $("#sld_timesteps").slider({
            value: timesteps, min: 0, max:32, step:1.0,
            change: function(event, ui) {$("#timesteps").html(ui.value); timesteps = ui.value; updateShareString();},
            slide: function(event, ui) {$("#timesteps").html(ui.value); timesteps = ui.value; updateShareString();}
        });
        $("#sld_timesteps").slider("value", timesteps);

        $('#share').keypress(function (e) {
            if (e.which == 13) {
                parseShareString();
                return false;
            }
        });

        $("#btn_clear").button({
            icons : {primary : "ui-icon-document"},
            text : false
        });
        $("#btn_snapshot").button({
            icons : {primary : "ui-icon-image"},
            text : false
        });

        $("#notworking").click(function(){
            $("#requirement_dialog").dialog("open");
        });
        $("#requirement_dialog").dialog({
            autoOpen: false
        });
    };

    alertInvalidShareString = function()
    {
        $("#share").val("Invalid string!");
        setTimeout(updateShareString, 1000);
    };

    parseShareString = function()
    {
        var str = $("#share").val();
        var fields = str.split(",");

        if(fields.length != 7)
        {
            alertInvalidShareString();
            return;
        }

        var newCurlf = parseFloat(fields[0]);
        var newFluxf = parseFloat(fields[1]);
        var newTimesteps = parseFloat(fields[2]);
        var newDivf = parseFloat(fields[3]);
        var newLapf = parseFloat(fields[4]);
        var newFeedf = parseFloat(fields[5]);
        var newExpf = parseFloat(fields[6]);

        if(
            isNaN(newCurlf) ||
            isNaN(newFluxf) ||
            isNaN(newDivf) ||
            isNaN(newLapf) ||
            isNaN(newFeedf) ||
            isNaN(newExpf) ||
            isNaN(newTimesteps))
        {
            alertInvalidShareString();
            return;
        }

        curlf = newCurlf;
        fluxf = newFluxf;
        divf = newDivf;
        lapf = newLapf;
        feedf = newFeedf;
        expf = newExpf;
        timesteps = newTimesteps;
        worldToForm();
    };

    updateShareString = function()
    {
        var str = "".concat(curlf, ",", fluxf, ",", timesteps, ",", divf, ",", lapf, ",", feedf, ",", expf);
        $("#share").val(str);
    };

})();
