/* 
 * Gray-Scott
 *
 * A solver of the Gray-Scott model of reaction diffusion.
 *
 * ©2012 pmneila.
 * p.mneila at upm.es
 */
var init, loadPreset, clean, snapshot, fullscreen, alertInvalidShareString, parseShareString, updateShareString, updateStatShader, loadGradientPreset;
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
    var mColors;
    var mColorsNeedUpdate = true;
    var mLastTime = 0;
    var mStep = 0 >>> 0; // coerce to uint32
    var uiThree = 3 >>> 0;

    var mTexture1, mTexture2, mTexture3;
    //var mGSMaterial, mStatMaterial, mScreenMaterial;
    var mScreenQuad;

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
            birth1: 0.278,
            birth2: 0.365,
            survival1:  0.267,
            survival2:  0.445,
            alpha_n: 0.028,
            alpha_m:  0.147
        },{ // Slow Waves
            birth1: 0.011,
            birth2: 0.179,
            survival1:  0,
            survival2:  0.04,
            alpha_n: 1.00062,
            alpha_m:  1.016
        },{ // Twist
            birth1: 0.512,
            birth2: 0.091,
            survival1:  0.01828,
            survival2:  -0.0454,
            alpha_n: 1.01,
            alpha_m:  0.911
        },{ // Spout
            birth1: 0.048,
            birth2: 0.139,
            survival1:  -0.00015,
            survival2:  0.0035,
            alpha_n: 1.001,
            alpha_m:  0.73
        },{ // Anemone
            birth1: 0.026,
            birth2: 0.154,
            survival1:  -0.00006,
            survival2:  0.05,
            alpha_n: 1.001,
            alpha_m:  0.73
        },{ // Logistic
            birth1: 0.026,
            birth2: 0.154,
            survival1:  0.04295,
            survival2:  0.05,
            alpha_n: 1.01,
            alpha_m:  0.73
        },{ // Anisotropic
            birth1: 0.355,
            birth2: 0.2,
            survival1:  0.04295,
            survival2:  0.0475,
            alpha_n: 1.00297,
            alpha_m:  0.73
        },{ // Oregonator
            birth1: 0.019,
            birth2: 0.094,
            survival1:  -0.00038,
            survival2:  0.0001,
            alpha_n: 1.0017,
            alpha_m:  1.064
        },{ // Blink
            birth1: 0.019,
            birth2: 0.094,
            survival1:  -0.02756,
            survival2:  0.024,
            alpha_n: 1.0017,
            alpha_m:  1.064
        },{ // Mini Spouts
            birth1: 0.15,
            birth2: 0.095,
            survival1:  -0.05,
            survival2:  -0.0007,
            alpha_n: 1.00909,
            alpha_m:  0.292
        },{ // Chaotic Spouts
            birth1: 0.029,
            birth2: 0.162,
            survival1:  -0.02688,
            survival2:  -0.0256,
            alpha_n: 1.00909,
            alpha_m:  0.292
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
    var birth1 = presets[0].birth1;
    var birth2 = presets[0].birth2;
    var survival1 = presets[0].survival1;
    var survival2 = presets[0].survival2;
    var alpha_n = presets[0].alpha_n;
    var alpha_m = presets[0].alpha_m;
    var fragmentShaderId = statShaders[0];
    var timesteps = 3;

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
        mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
        mCamera.position.z = 100;
        mScene.add(mCamera);

        mUniforms = {
            screenWidth: {type: "f", value: undefined},
            screenHeight: {type: "f", value: undefined},
            tSource: {type: "t", value: undefined},
            sSource: {type: "t", value: undefined},
            delta: {type: "f", value: 1.0},
            birth1: {type: "f", value: birth1},
            birth2: {type: "f", value: birth2},
            survival1: {type: "f", value: survival1},
            survival2: {type: "f", value: survival2},
            alpha_n: {type: "f", value: alpha_n},
            alpha_m: {type: "f", value: alpha_m},
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
            fragmentShader: document.getElementById('smoothlifeFragmentShader').textContent
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
    }

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
        mTexture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});
        mTexture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            type: THREE.FloatType});
        mTexture3 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2, {
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

        mUniforms.screenWidth.value = canvasWidth/2;
        mUniforms.screenHeight.value = canvasHeight/2;
    };

    var render = function(time)
    {
        var dt = time - mLastTime;
        mLastTime = time;
        mUniforms.delta.value = dt;
        mUniforms.birth1.value = birth1;
        mUniforms.birth2.value = birth2;
        mUniforms.survival1.value = survival1;
        mUniforms.survival2.value = survival2;
        mUniforms.alpha_n.value = alpha_n;
        mUniforms.alpha_m.value = alpha_m;

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

        if(mColorsNeedUpdate)
            updateUniformsColors();

        mScreenQuad.material = mScreenMaterial;
        mRenderer.render(mScene, mCamera);

        requestAnimationFrame(render);
    };

    loadPreset = function(idx)
    {
        birth1 = presets[idx].birth1;
        birth2 = presets[idx].birth2;
        survival1 = presets[idx].survival1;
        survival2 = presets[idx].survival2;
        alpha_n = presets[idx].alpha_n;
        alpha_m = presets[idx].alpha_m;
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
        mUniforms.brush.value = new THREE.Vector2(-10, -10);
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
        $("#sld_curl").slider("value", birth1);
        $("#sld_flux").slider("value", birth2);
        $("#sld_divergence").slider("value", survival1);
        $("#sld_laplacian").slider("value", survival2);
        $("#sld_feedback").slider("value", alpha_n);
        $("#sld_exponent").slider("value", alpha_m);
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
            value: birth1, min: 0.01, max:0.5, step:0.001,
            change: function(event, ui) {$("#curl").html(ui.value); birth1 = ui.value; updateShareString();},
            slide: function(event, ui) {$("#curl").html(ui.value); birth1 = ui.value; updateShareString();}
        });
        $("#sld_curl").slider("value", birth1);

        $("#sld_flux").slider({
            value: birth2, min: 0.01, max:0.5, step:0.001,
            change: function(event, ui) {$("#flux").html(ui.value); birth2 = ui.value; updateShareString();},
            slide: function(event, ui) {$("#flux").html(ui.value); birth2 = ui.value; updateShareString();}
        });
        $("#sld_flux").slider("value", birth2);

        $("#sld_divergence").slider({
            value: survival1, min: 0.01, max:0.5, step:0.001,
            change: function(event, ui) {$("#divergence").html(ui.value); survival1 = ui.value; updateShareString();},
            slide: function(event, ui) {$("#divergence").html(ui.value); survival1 = ui.value; updateShareString();}
        });
        $("#sld_divergence").slider("value", survival1);

        $("#sld_laplacian").slider({
            value: survival2, min: 0.01, max:0.5, step:0.001,
            change: function(event, ui) {$("#laplacian").html(ui.value);survival2 = ui.value; updateShareString();},
            slide: function(event, ui) {$("#laplacian").html(ui.value); survival2 = ui.value; updateShareString();}
        });
        $("#sld_laplacian").slider("value", survival2);

        $("#sld_feedback").slider({
            value: alpha_n, min: 0.01, max:0.5, step:0.001,
            change: function(event, ui) {$("#feedback").html(ui.value);alpha_n = ui.value; updateShareString();},
            slide: function(event, ui) {$("#feedback").html(ui.value); alpha_n = ui.value; updateShareString();}
        });
        $("#sld_feedback").slider("value", alpha_n);

        $("#sld_exponent").slider({
            value: alpha_m, min: 0.01, max:0.5, step:0.001,
            change: function(event, ui) {$("#exponent").html(ui.value);alpha_m = ui.value; updateShareString();},
            slide: function(event, ui) {$("#exponent").html(ui.value); alpha_m = ui.value; updateShareString();}
        });
        $("#sld_exponent").slider("value", alpha_m);

        $("#sld_timesteps").slider({
            value: timesteps, min: 0, max:10, step:1.0,
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

        var newbirth1 = parseFloat(fields[0]);
        var newbirth2 = parseFloat(fields[1]);
        var newTimesteps = parseFloat(fields[2]);
        var newsurvival1 = parseFloat(fields[3]);
        var newsurvival2 = parseFloat(fields[4]);
        var newalpha_n = parseFloat(fields[5]);
        var newalpha_m = parseFloat(fields[6]);
        var newFragmentShaderId = fields[7];


        if(
            isNaN(newbirth1) ||
            isNaN(newbirth2) ||
            isNaN(newsurvival1) ||
            isNaN(newsurvival2) ||
            isNaN(newalpha_n) ||
            isNaN(newalpha_m) ||
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
        birth1 = newbirth1;
        birth2 = newbirth2;
        survival1 = newsurvival1;
        survival2 = newsurvival2;
        alpha_n = newalpha_n;
        alpha_m = newalpha_m;
        timesteps = newTimesteps;
        fragmentShaderId = newFragmentShaderId;
        updateStatShaderById(fragmentShaderId);
        worldToForm();
    };

    updateShareString = function()
    {
        var str = "".concat(birth1, ",", birth2, ",", timesteps, ",", survival1, ",", survival2, ",", alpha_n, ",", alpha_m, ",", fragmentShaderId);

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
