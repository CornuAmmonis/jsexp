/* 
 * Gray-Scott
 *
 * A solver of the Gray-Scott model of reaction diffusion.
 *
 * ©2012 pmneila.
 * p.mneila at upm.es
 */
var init, loadPreset, clean, snapshot, fullscreen, alertInvalidShareString, parseShareString, updateShareString, updateStatShader, loadGradientPreset;
var mGSMaterial, mStatMaterial, mScreenMaterial, mGeometryMaterial;

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
    var mFinalScene;
    var mCamera;
    var mUniforms;
    var mColors;
    var mColorsNeedUpdate = true;
    var mLastTime = 0;
    var mStep = 0 >>> 0; // coerce to uint32
    var uiThree = 3 >>> 0;
    var uiTwo = 2 >>> 0;

    var mTexture1, mTexture2, mTexture3, mTexture4, mTexture5;
    var mScreenQuad, mSphere;

    var mMinusOnes = new THREE.Vector2(-1, -1);

    var gradient_presets = [
        // Default
        [0,"#000000",0.2,"#282532",0.5,"#7D7A8E",0.8,"#BCB9B9",1,"#EDEDED"],
        // Spectrum
        [0,"#FF0000",0.25,"#FCFF00",0.5,"#00FF84",0.75,"#0267FF",1,"#CC00FF"],
        // Hot/Cold
        [0,"#FFD21C",0.4,"#FF0000",0.5,"#161616",0.6,"#1E6BDF",1,"#C9E1FA"],
        // Greyscale
        [0,"#000000",0.25,"#484848",0.5,"#747474",0.75,"#CCCCCC",1,"#FFFFFF"],
        // Plastic
        [0,"#000000",0.5,"#FFFFFF",0.6,"#484848",0.75,"#D0D0D0",1,"#FFFFFF"],
        // Rainbow
        [0,"#FF0000",0.25,"#F6FF00",0.5,"#2ECA2E",0.75,"#0012FF",1,"#BA1BC0"],
        // Black/White
        [0,"#000000",0.25,"#FFFFFF",0.5,"#000000",0.75,"#FFFFFF",1,"#000000"],
        // Chrome
        [0,"#2988CC",0.5,"#FFFFFF",0.51,"#935000",0.75,"#E3AC42",1,"#FFFFFF"],
        // Caramel
        [0,"#000000",0.15,"#404040",0.5,"#C26E09",0.9,"#E3AC42",1,"#FFFFFF"],
        // Magma
        [0,"#000000",0.4,"#404040",0.7,"#AD3838",0.85,"#FC561C",1.0,"#FFE400"],
        // Heat
        [0,"#000000",0.25,"#190087",0.5,"#A600CF",0.75,"#FF0202",1,"#FFE71B"]
    ]

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
        "anisoStatFragmentShader",
        "pLaplaceFragmentShader",
        "magnitudeFragmentShader",
        "orientationFragmentShader",
        "crossProductFragmentShader",
        "magnitudeGlobalNormFragmentShader",
        "rangeFragmentShader"
    ];

    // Configuration.
    var curlf = presets[0].curlf;
    var fluxf = presets[0].fluxf;
    var divf = presets[0].divf;
    var lapf = presets[0].lapf;
    var feedf = presets[0].feedf;
    var expf = presets[0].expf;
    var fragmentShaderId = statShaders[0];
    var timesteps = 8;

    init = function()
    {
        init_canvas();
        init_gradient();
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
        mFinalScene = new THREE.Scene();

        var ws = 0.5;
        mCamera = new THREE.OrthographicCamera(-ws, ws, ws, -ws, -10000, 10000);
        mCamera.position.z = 100;
        mFinalCamera = new THREE.OrthographicCamera(-ws, ws, ws, -ws, -10000, 10000);
        mFinalCamera.position.z = 100;
        mScene.add(mCamera);
        mFinalScene.add(mFinalCamera);

        mUniforms = {
            screenWidth: {type: "f", value: undefined},
            screenHeight: {type: "f", value: undefined},
            tSource: {type: "t", value: undefined},
            sSource: {type: "t", value: undefined},
            gSource: {type: "t", value: undefined},
            delta: {type: "f", value: 1.0},
            curlf: {type: "f", value: curlf},
            fluxf: {type: "f", value: fluxf},
            divf: {type: "f", value: divf},
            lapf: {type: "f", value: lapf},
            feedf: {type: "f", value: feedf},
            expf: {type: "f", value: expf},
            brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
            color1: {type: "v4", value: new THREE.Vector4(0, 0, 0, 0)},
            color2: {type: "v4", value: new THREE.Vector4(0, 1, 0, 0.25)},
            color3: {type: "v4", value: new THREE.Vector4(1, 1, 0, 0.5)},
            color4: {type: "v4", value: new THREE.Vector4(1, 0, 0, 0.75)},
            color5: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0.1)}
        };
        mColors = [mUniforms.color1, mUniforms.color2, mUniforms.color3, mUniforms.color4, mUniforms.color5];
        $("#gradient").gradient("setUpdateCallback", onUpdatedColor);

        var defaultFragmentShader = statShaders[0];

        mGSMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('ginzbergLandauFragmentShader').textContent
        });
        mStatMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById(defaultFragmentShader).textContent
        });
        mGeometryMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('standardVertexShader').textContent,
            fragmentShader: document.getElementById('geometryFragmentShader').textContent
        });
        mScreenMaterial = new THREE.ShaderMaterial({
            uniforms: mUniforms,
            vertexShader: document.getElementById('zNormXformVertexShader').textContent,
            fragmentShader: document.getElementById('screenFragmentShader').textContent
        });
        mScreenMaterial.transparent = true;
        mScreenMaterial.depthTest = false;
        mScreenMaterial.side = THREE.DoubleSide;
        mScreenMaterial.blending = THREE.NormalBlending;

        fragmentShaderId = defaultFragmentShader;

        //var plane = new THREE.PlaneGeometry(1.0, 1.0);
        //mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
        //mScene.add(mScreenQuad);

        mScreenQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 1.0, 100, 100),
            mScreenMaterial
        );
        mSphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry( 0.5, 7 ),
            mScreenMaterial
        );
        mScene.add(mScreenQuad);
        mFinalScene.add(mSphere);

        mColorsNeedUpdate = true;
        updateUniformsColors();

        resize(width, height);

        render(0);
        mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
        mLastTime = new Date().getTime();
        requestAnimationFrame(render);
    };

    var init_presets = function()
    {
        document.ex.scene.value = 0;
        document.shader.scene.value = 0;
        document.gradient.scene.value = 0;
    };

    var getWrappedRenderTarget = function(width, height)
    {
        var tgt = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});

        tgt.wrapS = THREE.RepeatWrapping;
        tgt.wrapT = THREE.RepeatWrapping;
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

        // TODO: Possible memory leak?
        var tgtWidth = canvasWidth/2;
        var tgtHeight = canvasHeight/2;
        mTexture1 = getWrappedRenderTarget(tgtWidth, tgtHeight);
        mTexture2 = getWrappedRenderTarget(tgtWidth, tgtHeight);
        mTexture3 = getWrappedRenderTarget(tgtWidth, tgtHeight);
        mTexture4 = getWrappedRenderTarget(tgtWidth, tgtHeight);
        mTexture5 = getWrappedRenderTarget(tgtWidth, tgtHeight);

        mUniforms.screenWidth.value = tgtWidth;
        mUniforms.screenHeight.value = tgtHeight;
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
            var gStep = mStep % uiTwo;

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

            if (gStep == 0) {
                mUniforms.gSource.value = mTexture4;
                mScreenQuad.material = mGeometryMaterial;
                mRenderer.render(mScene, mCamera, mTexture5, true);
                mUniforms.gSource.value = mTexture5;
            } else {
                mUniforms.gSource.value = mTexture5;
                mScreenQuad.material = mGeometryMaterial;
                mRenderer.render(mScene, mCamera, mTexture4, true);
                mUniforms.gSource.value = mTexture4;
            }

            mUniforms.brush.value = mMinusOnes;

            mStep++;
        }

        if (mColorsNeedUpdate) {
            updateUniformsColors();
        }

        mScreenQuad.material = mScreenMaterial;
        mRenderer.render(mFinalScene, mCamera);

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

    var updateUniformsColors = function()
    {
        var values = $("#gradient").gradient("getValuesRGBS");
        for(var i=0; i<values.length; i++)
        {
            var v = values[i];
            mColors[i].value = new THREE.Vector4(v[0], v[1], v[2], v[3]);
        }

        mColorsNeedUpdate = false;
    };

    updateStatShader = function(idx)
    {
        var elId = statShaders[idx];
        updateStatShaderById(elId);
    };

    var updateStatShaderById = function(shaderId)
    {
        mStatMaterial = new THREE.ShaderMaterial({
            uniforms: mStatMaterial.uniforms,
            vertexShader: mStatMaterial.vertexShader,
            fragmentShader: document.getElementById(shaderId).textContent
        });
        fragmentShaderId = shaderId;
        updateShareString();
    }

    var onUpdatedColor = function()
    {
        mColorsNeedUpdate = true;
        updateShareString();
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
        init_gl(canvas.clientWidth, canvas.clientHeight);
    };

    snapshot = function()
    {
        var dataURL = canvas.toDataURL("image/png");
        window.open(dataURL, "name-"+Math.random());
    };

    // resize canvas to fullscreen, scroll to upper left
    // corner and try to enable fullscreen mode and vice-versa
    fullscreen = function() {

        var canv = $('#myCanvas');
        var elem = canv.get(0);

        if(isFullscreen())
        {
            // end fullscreen
            if (elem.cancelFullscreen) {
                elem.cancelFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }

        if(!isFullscreen())
        {
            // save current dimensions as old
            window.oldCanvSize = {
                width : canv.width(),
                height: canv.height()
            };

            // adjust canvas to screen size
            // this should be just a resize but some issue with mouse/brush in fullscreen
            // makes resize not initialize properly
            //resize(screen.width, screen.height);
            init_gl(screen.width, screen.height);

            // scroll to upper left corner
            $('html, body').scrollTop(canv.offset().top);
            $('html, body').scrollLeft(canv.offset().left);

            // request fullscreen in different flavours
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        }
    };

    var isFullscreen = function()
    {
        return document.mozFullScreenElement ||
            document.webkitCurrentFullScreenElement ||
            document.fullscreenElement;
    };

    $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(ev) {
        // restore old canvas size
        if(!isFullscreen()) {
            // this should be just a resize but some issue with mouse/brush in fullscreen
            // makes resize not initialize properly
            //resize(window.oldCanvSize.width, window.oldCanvSize.height);
            init_gl(window.oldCanvSize.width, window.oldCanvSize.height);
        }
    });

    var worldToForm = function()
    {
        $("#sld_curl").slider("value", curlf);
        $("#sld_flux").slider("value", fluxf);
        $("#sld_divergence").slider("value", divf);
        $("#sld_laplacian").slider("value", lapf);
        $("#sld_feedback").slider("value", feedf);
        $("#sld_exponent").slider("value", expf);
        $("#sld_timesteps").slider("value", timesteps);
        document.shader.scene.value = getFragmentShaderIdByString(fragmentShaderId);
    };

    var init_gradient = function()
    {

        $("#gradient").gradient({
            values: [
                [0,    '#000000'],
                [0.25, '#190087'],
                [0.5,  '#A600CF'],
                [0.75, '#FF0202'],
                [1.0,  '#FFE71B']
            ]
        });
        loadGradientPreset(0);

        // KLUDGE!
        colorPicker.offsetX = -512;
        colorPicker.offsetY = -256;

        document.getElementById("gradient").onselectstart = function () {return false;};
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
            value: timesteps, min: 0, max:128, step:1.0,
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
        $("#btn_fullscreen").button({
            icons : {primary : "ui-icon-arrow-4-diag"},
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

    var isInvalidFragmentShaderId = function(str)
    {
        return getFragmentShaderIdByString(str) == -1;
    };

    var getFragmentShaderIdByString = function(str)
    {
        for (var shaderId in statShaders) {
            if (str == statShaders[shaderId]) {
                return shaderId;
            }
        }
        return -1;
    };

    parseShareString = function()
    {
        var str = $("#share").val();
        var fields = str.split(",");

        if(fields.length != 18)
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
        var newFragmentShaderId = fields[7];


        if(
            isNaN(newCurlf) ||
            isNaN(newFluxf) ||
            isNaN(newDivf) ||
            isNaN(newLapf) ||
            isNaN(newFeedf) ||
            isNaN(newExpf) ||
            isNaN(newTimesteps) ||
            isInvalidFragmentShaderId(newFragmentShaderId))
        {
            alertInvalidShareString();
            return;
        }

        var newValues = [];
        for(var i=0; i<5; i++)
        {
            var v = [parseFloat(fields[8+2*i]), fields[8+2*i+1]];

            if(isNaN(v[0]))
            {
                alertInvalidShareString();
                return;
            }

            // Check if the string is a valid color.
            if(! /^#[0-9A-F]{6}$/i.test(v[1]))
            {
                alertInvalidShareString();
                return;
            }

            newValues.push(v);
        }

        $("#gradient").gradient("setValues", newValues);
        curlf = newCurlf;
        fluxf = newFluxf;
        divf = newDivf;
        lapf = newLapf;
        feedf = newFeedf;
        expf = newExpf;
        timesteps = newTimesteps;
        fragmentShaderId = newFragmentShaderId;
        updateStatShaderById(fragmentShaderId);
        worldToForm();
    };

    updateShareString = function()
    {
        var str = "".concat(curlf, ",", fluxf, ",", timesteps, ",", divf, ",", lapf, ",", feedf, ",", expf, ",", fragmentShaderId);

        var values = $("#gradient").gradient("getValues");
        for(var i=0; i<values.length; i++)
        {
            var v = values[i];
            str += "".concat(",", v[0], ",", v[1]);
        }
        $("#share").val(str);
    };

    loadGradientPreset = function(idx)
    {
        var newValues = [];
        for(var i=0; i<5; i++)
        {
            var v = [gradient_presets[idx][2*i], gradient_presets[idx][2*i+1]];
            newValues.push(v);
        }

        $("#gradient").gradient("setValues", newValues);
    }

})();
