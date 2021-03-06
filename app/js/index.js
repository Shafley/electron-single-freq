$(function(){
	var scale = 5;
	var W = 100 * scale;
	var H = 80 * scale;
	var PI = Math.PI;

	var video = $('#video')[0];

    var canvas = $('#canvas')[0];
    var ctxView = canvas.getContext('2d');
    canvas.width = W;
    canvas.heght = H;

    var camera = $('#camera')[0];
    var ctxCamera = camera.getContext('2d');
    camera.width = W;
    camera.height = H;

    navigator.getUserMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);
    if (navigator.getUserMedia) {
        navigator.getUserMedia(
            {video: true },
            function (localMediaStream) {
                video.src = window.URL.createObjectURL(localMediaStream);
            },
            function () {}
        );
    } else {
        alert('getUserMedia Not Support!');
    }

    // 上传图片
    $('.imgs').on('change', function(e){
        var self = $(this)[0];
        var len = self.files.length;

        // if(len !== 4) return;
        if(len === 0) return;

        for(var i = 0; i < len; i++){
            (function(j){
                var fileReader = new FileReader();
                fileReader.readAsDataURL(self.files[j]);
                fileReader.name = parseInt( self.files[j].name );
                fileReader.onload = function(e){
                    var img = new Image();
                    img.onload = function(){
                        $('.photos').prepend(img);

                        W = this.naturalWidth;
                        H = this.naturalHeight;
                        canvas.width = W;
                        canvas.height = H;

                        var obj = {};
                        obj.name = fileReader.name;
                        obj.data = getImgPiexlData(this, this.naturalWidth, this.naturalHeight);
                        tempImgList.push(obj);

                        if(tempImgList.length == len){
                            console.log(tempImgList)
                            for(var k = 0; k < len; k++){
                                var n = tempImgList[k].name;
                                if(n <= 4){
                                    frontImgList.push( tempImgList[k].data );
                                }else if(n <= 8){
                                    backImgList.push( tempImgList[k].data );
                                }else{                                  
                                    objImgList.push( tempImgList[k].data );
                                }
                            }
                        }

                    }
                    img.src = e.target.result;
                }
            })(i)
        }
    });

    var timer;
    function drawVideo(ctx){
    	clearTimeout(timer);
    	ctx.drawImage(video, 0, 0, W, H);
    	timer = setTimeout(function(){
    		drawVideo(ctx);
    	}, 1000 / 60);
    }

    var currentCanvas = canvas;
    var toggle = false;
    $('.toggle').on('click', function(){
    	if(toggle){
    		currentCanvas = canvas;
    		drawVideo(ctxCamera);
			ctxView.clearRect(0, 0, W, H);
    	}else{
    		currentCanvas = camera;
    		drawVideo(ctxView);
    	}
    	toggle = !toggle;
    })

    $('.step-grating').on('click', function(){
    	takePhoto();
    });

    $('.auto-grating').on('click', function(){
    	var timer = setInterval(function(){
    		if(step > setStep){
    			clearInterval(timer);
    		}
    		takePhoto();
    	}, 1000);
    })

    $('#select').on('click', function(){
    	step = 0;
    })

    // 相移步数
    var step = 0;
    // 第几组图    1:标定前   2:标定后   3:物体
    var times = 1;
    var setStep = 4;

    function takePhoto(){
    	step++;
    	if(step > setStep){
    		return;
    	}
    	creatGrating( ctxView, step - 1, getVideoPhoto );
    }

    // 生成光栅: phase = 1, 2, 3, 4
    function creatGrating(ctx, phase, cb){
    	if(toggle){
    		cb();
    		return;
    	}

    	var f = parseInt( $('.freq').val() ) || 1;
    	var w = scale * parseInt( $('.width').val() ) || 100;
    	var h = scale * parseInt( $('.height').val() ) || 80;

    	var img = ctx.createImageData(W, H);

    	for(var i = 0; i < h; i++){
	    	for(var j = 0; j < w * 4; j += 4 ){
	    		var n = i * w * 4 + j;
	    		for(var k = 0; k < 3; k++){
	    			img.data[n+k] = 127.5 + 127.5 * Math.cos( (j / f * 2 +  phase / 2) * PI);
	    		}
	    		img.data[n+3] = 255;
	    	}
    	}

		ctx.clearRect(0, 0, W, H);
    	ctx.putImageData(img, 0, 0, 0, 0, W, H);

    	setTimeout(function(){
    		cb();
    	}, 300)
    }

    var tempImgList = [];
    var frontImgList = [];
    var backImgList = [];
    var objImgList = [];

    // 抓取视频或显示区域的快照, 保存图片像素数据
    function getVideoPhoto(){

    	var img = new Image();
    	img.onload = function(){
    		$('.photos').prepend(img);    		  		
    	}
    	img.src = canvas.toDataURL("image/png");
    	tempImgList.push( getImgPiexlData(img, W, H) );

    	var val = parseInt( $('#select').val() );
    	if(tempImgList.length == 4){
    		if(val == 1){
    			frontImgList = tempImgList;
    		}else if(val == 2){
    			backImgList = tempImgList;
    		}else if(val == 3){
    			objImgList = tempImgList;
    		}
    		tempImgList = [];
    	}
    }

    function getImgPiexlData(img, w, h){
    	var tempCanvas = $('<canvas/>')[0];
    	var tempCtx = tempCanvas.getContext('2d');
    	tempCanvas.width = w;
    	tempCanvas.height = h;
    	tempCtx.drawImage(img, 0, 0);
        var data = tempCtx.getImageData(0, 0, W, H).data
        rgb2grey(data);
        
    	return data;
    }

    function rgb2grey(I){
        var len = I.length;
        for(var i = 0; i< len; i += 4){
            var avar = ( I[i] + I[i+1] + I[i+2] ) / 3;
            I[i] = I[i+1] = I[i+2] = avar;
        }

        return I;
    }

    $('.untiephase').on('click', function(){
    	frontImgList = untiePhase(frontImgList);
    	backImgList = untiePhase(backImgList);
    	objImgList = untiePhase(objImgList);
    })

    // 解相位
    function untiePhase(I){
    	if(!I || !I.length) return;

    	var I1, I2;

    	I1 = imgSubtract( I[3],  I[1] );
    	I2 = imgSubtract( I[0],  I[2] );
    	I = getPhase( I1, I2);

    	showImgData(ctxView, I);

    	return I;
    }

    // 图片相减
    function imgSubtract(I1, I2){
    	if(!I1 || !I1.length || !I2 || !I2.length) return;

    	var I = [];
    	for(var i = 0; i < H; i++){
	    	for(var j = 0; j < W * 4; j += 4 ){
	    		var n = i * W * 4 + j;
	    		for(var k = 0; k < 3; k++){
	    			I[n+k] = I1[n+k] - I2[n+k];
	    		}
	    		I[n+3] = 255;
	    	}
    	}
    	return I;
    }

    function rgb2grey(I){
        var len = I.length;
        for(var i = 0; i< len; i += 4){
            var avar = ( I[i] + I[i+1] + I[i+2] ) / 3;
            I[i] = I[i+1] = I[i+2] = avar;
        }
    }

    // Φ = arctan( I1=(I4 - I2) / I2=(I1 - I3) )
    function getPhase(I1, I2){
    	if(!I1 || !I1.length || !I2 || !I2.length) return;

    	var I = [];
    	for(var i = 0; i < H; i++){
	    	for(var j = 0; j < W * 4; j += 4 ){
	    		var n = i * W * 4 + j;
	    		for(var k = 0; k < 3; k++){

	    			//貌似有点问题，好像是边界判断
	    			// if( I1[n+k] >= 0 && I2[n+k] == 0 ){
	    			// 	I[n+k] = PI / 2;
	    			// }else if( I1[n+k] < 0 && I2[n+k] == 0 ){
	    			// 	I[n+k] = PI * 3 / 2;
	    			// }else if( I1[n+k] >= 0 && I2[n+k] > 0 ){
	    			// 	I[n+k] = Math.atan( I1[n+k] / I2[n+k] )
	    			// }else if( I1[n+k] >= 0 && I2[n+k] < 0 ){
	    			// 	I[n+k] = Math.atan( I1[n+k] / I2[n+k] ) + PI;
	    			// }else if( I1[n+k] < 0 && I2[n+k] < 0 ){
	    			// 	I[n+k] = Math.atan( I1[n+k] / I2[n+k] ) + PI;
	    			// }else{
	    			// 	I[n+k] = Math.atan( I1[n+k] / I2[n+k] ) + 2 * PI;
	    			// }

	    			// 第一二象限  atan2(y, x):返回从 x 轴到点 (x,y) 的角度
	    			if( I2[n+k] >= 0 ){
	    				I[n+k] = Math.atan2( I2[n+k], I1[n+k] );
	    			}else{
	    				I[n+k] = Math.atan2( I2[n+k], I1[n+k] ) + 2 * PI;
	    			}

	    			I[n+k] = I[n+k] / 2 / PI * 255;
	    		}
	    		I[n+3] = 255;
	    	}
    	}

    	return I;
    }

    function showImgData(ctx, data){
    	if(!data || !data.length) return;

    	var imgData = ctx.createImageData(W, H);
    	// 直接赋值不行，并不知道原因，所以用循环,
    	// canvas像素自动向上取整了
    	var len = data.length;
    	var max = 0, min = 0;
    	for(var l = 0; l < len; l += 4){
    		if(data[l] > max){
    			max = data[l];
    		}
    		if(data[l] < min){
    			min = data[l];
    		}
    	}
    	// var max = Math.max.apply(this, data);

    	for(var i = 0; i < len; i += 4){    		
    		for(var j = 0; j < 3; j++){
    			imgData.data[i+j] = Math.round(data[i] - min) / (max - min) * 255;
    		}
    		imgData.data[i+3] = 255;
    	}

    	ctx.clearRect(0, 0, W, H);
    	ctx.putImageData(imgData, 0, 0, 0, 0, W, H);

    	var img = new Image();
    	img.onload = function(){
    		$('.photos').prepend(img);		  		
    	}
    	img.src = canvas.toDataURL("image/png");
    }

    $('.unwrapper').on('click', function(){

        // frontImgList = unwrapping(frontImgList);
        // backImgList = unwrapping(backImgList);
        // objImgList = unwrapping(objImgList);

        frontImgList = unwrappingRotate(frontImgList);
        backImgList = unwrappingRotate(backImgList);
        objImgList = unwrappingRotate(objImgList);
    	
    	if( frontImgList && backImgList && objImgList ){
    		var lenF = frontImgList.length;
    		var lenB = backImgList.length;
    		var lenO = objImgList.length;

    		if( lenF == lenB && lenB == lenO ){
    			for(var i = 0; i < lenF; i += 4){
		    		for(var j = 0; j < 3; j++){
		    			objImgList[i+j] = objImgList[i+j] - frontImgList[i+j];
		    		}
		    	}
		    	showImgData(ctxView, objImgList);
    		}
    	}
    })

    //解包裹
    function unwrapping(I){
    	if(!I || !I.length) return;

    	for(var i = 0; i < H; i++){
	    	var grade = 0;
	    	for(var j = 0; j < W * 4; j += 4 ){
	    		var n = i * W * 4 + j;
	    		var m = Math.abs( I[n] - I[n+4] );

	    		if(m > 128){	    			
	    			grade ++;
	    		}

	    		for(var k = 0; k < 3; k++){
	    			tempImgList[n+k] = I[n+k] + 255 * grade;
	    		}

	    		tempImgList[n+3] = 255;
	    	}
    	}
    	showImgData(ctxView, tempImgList);

    	return tempImgList;
    }

    function unwrappingRotate(I){
        if(!I || !I.length) return;

        var len = I.length;
        var max = 0, min = 0;
        for(var l = 0; l < len; l += 4){
            if(I[l] > max){
                max = I[l];
            }
            if(I[l] < min){
                min = I[l];
            }
        }

        for(var i = 0; i < len; i += 4){            
            for(var j = 0; j < 3; j++){
                I[i+j] = Math.round(I[i] - min) / (max - min) * 2 * PI;
            }
            I[i+3] = 2*PI;
        }

        var PD = [];
        for(var p = 0; p < H; p++){
            var tempArr = [];
            for(var q = 0; q < W; q++){
                tempArr.push( I[p*W*4+4*q] );
            }
            PD.push(tempArr);
        }

        // 对应Matlab:  M = H; N = W;
        var PT = [];
        for(var j = 0; j < H; j++){
            var tmpArr = [];
            for(var k = 0; k < W; k++){
                tempArr[k] = 0;
            }
            PT.push(tempArr);
        }

        var PL = [];
        var l = W * H;
        for(var n = 0; n < 2; n++){
            var tmpArr = [];
            for(var m = 0; m < l; m++){
                tempArr[m] = 0;
            }
            PL.push(tempArr);
        }

        var length = 1;
        PL[0][0] = Math.round(H/2);
        PL[1][0] = Math.round(W/2);
        PT[ PL[0][0] ][ PL[1][0] ] = 1;

        function rotate(){
            var abs = Math.abs;
            while( abs( PD[ PL[0][length] ][ PL[1][length] ] - PD[ PL[0][0] ][ PL[1][0] ] ) > PI ){
                    if( -PI > PD[ PL[0][length] ][ PL[1][length] ] - PD[ PL[0][0] ][ PL[1][0] ] ){
                        PD[ PL[0][length] ][ PL[1][length] ] = PD[ PL[0][length] ][ PL[1][length] ] + 2*PI;
                    }else 
                    if( PD[ PL[0][length] ][ PL[1][length] ] - PD[ PL[0][0] ][ PL[1][0] ] > PI ){
                        PD[ PL[0][length] ][ PL[1][length] ] = PD[ PL[0][length] ][ PL[1][length] ] - 2*PI;
                    }else{                        
                        PD[ PL[0][length] ][ PL[1][length] ] = PD[ PL[0][length] ][ PL[1][length] ];
                    }
            }
        }
        while(length){
            if( PL[0][0] > 1 && ( PT[ PL[0][0] - 1 ][ PL[1][0] ] ) == 0 ){
                length++;
                PL[0][length] = PL[0][0] - 1;
                PL[1][length] = PL[1][0];
                PT[ PL[0][length] ][ PL[1][length] ] = 1;

                rotate();
            }
            if( PL[1][0] > 1 && ( PT[ PL[0][0] ][ PL[1][0] - 1 ] ) == 0 ){
                length++;
                PL[0][length] = PL[0][0];
                PL[1][length] = PL[1][0] - 1;
                PT[ PL[0][length] ][ PL[1][length] ] = 1;

                rotate();
            }
            if( PL[0][0] < H && ( PT[ PL[0][0] + 1 ][ PL[1][0] ] ) == 0 ){
                length++;
                PL[0][length] = PL[0][0] + 1;
                PL[1][length] = PL[1][0];
                PT[ PL[0][length] ][ PL[1][length] ] = 1;

                rotate();
            }            
            if( PL[0][0] < W && ( PT[ PL[0][0] ][ PL[1][0] + 1 ] ) == 0 ){
                length++;
                PL[0][length] = PL[0][0];
                PL[1][length] = PL[1][0] + 1;
                PT[ PL[0][length] ][ PL[1][length] ] = 1;

                rotate();
            }

            var tempPL = [];
            if( length > 1){
                for(var g = 0; g < 2; g++){
                    var tempArr = [];
                    for(var f = 1; f < length; f++){
                        tempArr.push( PL[g][f] );
                    }
                    tempPL.push( tempArr );
                }
                PL = tempPL;
            }
            length--;
        }

        var newI = [];
        for(var e = 0; e < H; e++){
            for(var d = 0; d < W; d++){
                if(PD[e][d] > 2*PI){
                   PD[e][d] = 2*PI;
                }
                // PD[e][d] = PD[e][d] / 2 / PI * 255;

                newI.push( PD[e][d] );
                newI.push( PD[e][d] );
                newI.push( PD[e][d] );
                newI.push( 2*PI );
                // newI.push( 255 );
            }
        }

        showImgData(ctxView, newI);
        return newI;
    }
    

})
