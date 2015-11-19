//====================================================================================
//     The MIT License (MIT)
//
//     Copyright (c) 2011 Kapparock LLC
//
//     Permission is hereby granted, free of charge, to any person obtaining a copy
//     of this software and associated documentation files (the "Software"), to deal
//     in the Software without restriction, including without limitation the rights
//     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//     copies of the Software, and to permit persons to whom the Software is
//     furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in
//     all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//     THE SOFTWARE.
//====================================================================================
(function($){
	/* use this when embed directly into the html file */
	/*
	var mainContainer = $('#'+'<@=MAIN_CONTAINER_ID@>');
	var currentElement = $('#'+'<@=CURRENT_ELEMENT_ID@>');
	var rootURL='<@=ROOT_URL@>';
	* */
	/* use this when embed directly into the html file */
	
	/* use this when using seperate JS file */
	var scriptTags = document.getElementsByTagName("script");
	var src=scriptTags[scriptTags.length-1].src;
	//var mainContainerId = unescape(src).split("mainContainerId=")[1].split("&")[0];
	var mainContainerId = 'kappaio-lighting-widget';
	var rootURL = unescape(src).split("rootURL=")[1].split("&")[0];
	var mainContainer = $('#'+mainContainerId);
	
	/* use this when using seperate JS file */
	//=============================================
	// helper functions
	//=============================================
	var IE = !!/msie/i.exec( window.navigator.userAgent );
	var getStrCopy = function (str, copies) {
		var newStr = str;
		copies = (copies > 0) ? copies : 1;
		while (--copies) newStr += str;
		return newStr;
	};	
	var convertDecToBase = function ( dec, base, length, padding ) {
		padding = padding || '0' ;
		var num = dec.toString( base );
		length = length || num.length;
		if (num.length !== length) {
			if (num.length < length) num = getStrCopy( padding, (length - num.length)) + num;
			else throw new Error("convertDecToBase(): num(" + num + ").length > length(" + length + ") too long.");
		}
		return num;
	};
	
	function matMult(a,b,transpose)
	{
		if(typeof(transpose)=='undefined') transpose = false;
		var res=[];		
		var ar = a.length, ac = a[0].length, br = b.length, bc = b[0].length;
		var r,c,d;	
		if (transpose===true) {
			r = bc;
			c = ar;
		} else {
			r = ar;
			c = bc;
		}
		for (var i=0 ; i<r ; i++) {
			res[i] = new Array(c);
			for (var j=0; j<c; j++) {
				res[i][j] = 0;
				for (var k=0; k<ac; k++) {
					if (transpose===true) { 
						res[i][j] += a[j][k] * b[k][i];	
					} else {					
						res[i][j] += a[i][k] * b[k][j];	
					}					
				}
			}		
		}
		return res;
	}
	
	function rgbTohsl(R,G,B)
	{
		var r0 = ( R / 255 );                    
		var g0 = ( G / 255 );
		var b0 = ( B / 255 );
		var var_Min = Math.min( r0, g0, b0 );   
		var var_Max = Math.max( r0, g0, b0 );   
		var del_Max = var_Max - var_Min;           
		var H,S,L, del_R,del_G,del_B;
		L = ( var_Max + var_Min ) / 2;
		if ( del_Max == 0 )                    
		{
		   H = 0;                               
		   S = 0;
		} else {
   			if ( L < 0.5 ) S = del_Max / ( var_Max + var_Min );
   			else           S = del_Max / ( 2 - var_Max - var_Min );
   			del_R = (((var_Max - r0) / 6) + (del_Max / 2)) / del_Max;
   			del_G = (((var_Max - g0) / 6) + (del_Max / 2)) / del_Max;
   			del_B = (((var_Max - b0) / 6) + (del_Max / 2)) / del_Max;
   			if      ( r0 == var_Max ) H = del_B - del_G;
   			else if ( g0 == var_Max ) H = ( 1 / 3 ) + del_R - del_B;
   			else if ( b0 == var_Max ) H = ( 2 / 3 ) + del_G - del_R;
   			if ( H < 0 ) H += 1;
   			if ( H > 1 ) H -= 1;
		}
		return [H,S,L];
	}
	var CiexyYTosrgb = function(x,y,Y) {	
		var z = 1-x-y;
		var X = Y/y * x;
		var Z = Y/y * z;
		function postproc(i0)
		{
			i0 = i0 /100;
			if ( i0 > 0.0031308 ) i0 = 1.055 * ( Math.pow(i0 , (1 / 2.4) ) ) - 0.055;
			else  i0 = 12.92 * i0; 
			i0 = i0 * 255;
			if (i0 > 255) return 255;
			else if (i0 < 0) return 0;
			else return i0;  
		}
		var Cxsr = [[3.2406, -1.5372, -0.4986],	[-0.9689, 1.8758, 0.0415],	[0.0557, -0.2040, 1.0570 ]];	
		var u = matMult(Cxsr, [[X],[Y],[Z]], true)[0];		
		return [postproc(u[0]),postproc(u[1]),postproc(u[2]) ];
	};

	var srgbToCiexyY = function(R,G,B)
	{
		function preproc(c)
		{
			var c0 = c / 255;
			if (c0 > 0.04045 ) c0 = Math.pow(( ( c0 + 0.055 ) / 1.055 ) , 2.4);
			else  c0 = c0 / 12.92;
			return c0 * 100;
		};
	
		var rgb0 = [[preproc(R)],[preproc(G)],[preproc(B)]];
		var Csrx = [[0.4124,0.3576,0.1805], [0.2126,0.7152,0.0722],	[0.0193,0.1192,0.9505]];
		var u = matMult(Csrx, rgb0,true)[0];
		var v = u[0] + u[1] + u[2];
		return [u[0]/v,u[1]/v,u[1]];
	};

	function rgbToxyY(R,G,B)
	{
		var rgb = [[R/2.55],[G/2.55],[B/2.55]];
		var C = [[0.488718000000000,0.310680300000000,0.200601700000000],
				[0.176204400000000,0.812984700000000,0.010810900000000],
                [0                ,0.010204800000000,0.989795200000000]]
		var u = matMult(C,rgb,true)[0];		
		var v = (u[0] + u[1] + u[2]);
		return [u[0]/v, u[1]/v, u[1]];		
	}
	function xyYTorgb(x,y,Y)
	{
		var z = 1-x-y;
		var X = Y/y * x;
		var Z = Y/y * z;
		var D = [[2.370674008679002,  -0.900040295098105,  -0.470633713580897],
  				[-0.513884786703178,   1.425303483840379 ,  0.088581302862799],
   				[0.005298158115283,  -0.014694895461096,   1.009396737345812]]
		var u = matMult( D, [[X],[Y],[Z]],true )[0];
		var postproc = function(i)
		{
			i = i * 2.55;
			return i;
		}
		var res = [postproc(u[0]),  postproc(u[1]), postproc(u[2])];
		return res;
	}
	function hslTorgb(H,S,L)
	{
		var Hue_2_RGB = function( v1, v2, vH )             //Function Hue_2_RGB
		{
		   if ( vH < 0 ) vH += 1;
		   if ( vH > 1 ) vH -= 1;
		   if ( ( 6 * vH ) < 1 ) return ( v1 + ( v2 - v1 ) * 6 * vH );
		   if ( ( 2 * vH ) < 1 ) return ( v2 );
		   if ( ( 3 * vH ) < 2 ) return ( v1 + ( v2 - v1 ) * ( ( 2 / 3 ) - vH ) * 6 );
		   return ( v1 );
		};
		var R,G,B, var_1,var_2;
		if ( S == 0 )                       
		{
		   R = L * 255;                      
		   G = L * 255;
		   B = L * 255;
		} else 	{
			if ( L < 0.5 ) 	var_2 = L * ( 1 + S );
			else        	var_2 = ( L + S ) - ( S * L );
			var_1 = 2 * L - var_2;
			R = 255 * Hue_2_RGB( var_1, var_2, H + ( 1 / 3 ) ); 
			G = 255 * Hue_2_RGB( var_1, var_2, H );
			B = 255 * Hue_2_RGB( var_1, var_2, H - ( 1 / 3 ) );
		}
		return [R,G,B];
	};
	function hslToxyY(h,s,l)
	{
		var rgb = hslTorgb(h,s,l);
		var xyY = rgbToxyY(rgb[0],rgb[1],rgb[2]);
		return xyY;
	}

	function getY(xy)
	{	
		xy = [xy[0], xy[1]];		
		var lRef = 0.5;
		
		var tr = [	{M:[[0.083376291507258,-1.547089124499483],[ 4.911004626708141,1.373070065811514]],h:[[-0.0102,0.9898]],v:[[0.3107],[0.8130]],d:0.0102},
				  	{M:[[4.446192473938725,-1.699102592780682],[-0.904532809705256,1.575700655472448]],h:[[-0.9898,0.0102]],v:[[0.2006],[0.0108]],d:0.9898},
					{M:[[2.152675100755095,-0.295401646558364],[-0.472853669022213,1.311500163544145]],h:[[0   ,-0.9796]],  v:[[0.2006],[0.0108]],d:0.9898}];		
		function calY(xy,M,h,v,d)
		{
			var z = 1 - xy[0] - xy[1];
			var xyT = [[xy[0]],[xy[1]]];
			var top = z - matMult(h, matMult(M, xyT)),
				bot = d - matMult(h, matMult(M, v ));
			return xy[1] * bot/top*100;
		}		
		var tuple={rgb:[0,0,0],hsl:[0,0,0], Y:0, dl:1}, tuples=[];
		
		tr.forEach(function(m){
			var Y =calY(xy,m.M,m.h,m.v,m.d);
			var rgb = xyYTorgb(xy[0],xy[1],Y);
			var hsl = rgbTohsl(rgb[0],rgb[1],rgb[2]);
			//var dl = abs(hsl[2] -lRef);
			if (Math.abs(hsl[2] - lRef) < lRef/1000)
				if (Math.abs(hsl[0] - 0.5) < lRef/1000 || Math.abs(hsl[0] - 0.8333333) < lRef/1000 ||Math.abs(hsl[0] - 0.1666666) < lRef/1000)
					tuples.push({rgb:rgb, hsl:hsl, Y:Y});
				else
					tuples.unshift({rgb:rgb, hsl:hsl, Y:Y});
		});
		return tuples;
	}
	function getHSL(xy) { return getY(xy)[0].hsl; }


	function draggable(element, onmove, onstart, onstop) {
        onmove = onmove || function () { };
        onstart = onstart || function () { };
        onstop = onstop || function () { };
        var doc = document;
        var dragging = false;
        var offset = {};
        var maxHeight = 0;
        var maxWidth = 0;
        var hasTouch = ('ontouchstart' in window);

        var duringDragEvents = {};
        duringDragEvents["selectstart"] = prevent;
        duringDragEvents["dragstart"] = prevent;
        duringDragEvents["touchmove mousemove"] = move;
        duringDragEvents["touchend mouseup"] = stop;

        function prevent(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.returnValue = false;
        }

        function move(e) {
            if (dragging) {
                // Mouseup happened outside of window
                if (IE && doc.documentMode < 9 && !e.button) {
                    return stop();
                }

                var touches = e.originalEvent && e.originalEvent.touches;
                var pageX = touches ? touches[0].pageX : e.pageX;
                var pageY = touches ? touches[0].pageY : e.pageY;

                var dragX = Math.max(0, Math.min(pageX - offset.left, maxWidth));
                var dragY = Math.max(0, Math.min(pageY - offset.top, maxHeight));

                if (hasTouch) {
                    // Stop scrolling in iOS
                    prevent(e);
                }
                onmove.apply(element, [dragX, dragY, e]);
            }
        }

        function start(e) {
			var rightclick = (e.which) ? (e.which == 3) : (e.button == 2);
            if (!rightclick && !dragging) {
                if (onstart.apply(element, arguments) !== false) {
                    dragging = true;
                    maxHeight = $(element).height();
                    maxWidth = $(element).width();
                    offset = $(element).offset();

                    $(doc).bind(duringDragEvents);
                    $(doc.body).addClass("sp-dragging");

                    if (!hasTouch) {
                        move(e);
                    }
                    prevent(e);
                }
            }
        }

        function stop() {
            if (dragging) {
                $(doc).unbind(duringDragEvents);
                $(doc.body).removeClass("sp-dragging");
                onstop.apply(element, arguments);
            }
            dragging = false;
        }
        $(element).bind("touchstart mousedown", start);
    }
	//========================================================================================
	//****************************************************************************************
	// Chromaticity in terms of hue and saturation 
	//****************************************************************************************
	//========================================================================================
	var ChromaticityMap2 = Backbone.View.extend({
		tagName:'div',
		currentHue: 0,
		currentSat: 0,
		setColor: function(h,s)
		{
			this.currentHue = h;
			this.currentSat = s;
			this.setCursorPos();
		},
		setCursorPos: function()
		{
			var x0 = this.width * this.currentHue - $(this.cursor).width();
			var y0 = this.height * this.currentSat -$(this.cursor).height() ;
			$(this.cursor).css('top',y0+'px').css('left',x0+'px');
		},
		render: function()
		{
			var width = this.width;
			var height = this.height;
		    this.cursor = $('<div/>').addClass('cp-cursor').appendTo(this.el);
	   		this.canvas = $('<canvas/>')
						.addClass('cp-canvas')
						.css('width','100%')
						.css('height','100%')
						.appendTo(this.el)[0];
			var canvas = this.canvas;
			if (canvas.getContext) {
				var ctx = canvas.getContext("2d"),
				 	imageData = ctx.createImageData(width, height),
				 	ys = [];
				for (var i = 0; i < width * height ; i++) {
					var pixelIndex = (i -1) * 4,
						h = (i % width)/(width),
						s = (Math.floor(i/width)/height),
					 	rgb = hslTorgb(h,s,0.5),
						xyY = srgbToCiexyY(rgb[0],rgb[1],rgb[2]),
					 	rgb = CiexyYTosrgb(xyY[0],xyY[1],1 + 99*(1-s));
	        		imageData.data[pixelIndex    ] = rgb[0];  // red   color
	        		imageData.data[pixelIndex + 1] = rgb[1];  // green color
	        		imageData.data[pixelIndex + 2] = rgb[2];  // blue  color
	        		imageData.data[pixelIndex + 3] = 255;
				}
	        ctx.putImageData(imageData, 0, 0, 0, 0, width, height);	
	      }
		var onStart = $.proxy(function() {
			var body = document.body;
			$(this.el).data('doc_css', $(body).css('cursor'));
			$(body).css('cursor','pointer');
		},this);
		var onStop = $.proxy(function()
		{
			$(document.body).css('cursor',$(this.el).data('doc_css'));	
			var i = {'xyY':hslToxyY(this.currentHue,this.currentSat,0.5),'hsl': [this.currentHue, this.currentSat]};
			this.onDragstop(i);
		}, this);	
		draggable(this.el, $.proxy(function(dx,dy,e) {
			var coord = $(this.canvas).offset();
			this.setColor(dx/this.width, dy/this.height);
		}, this),onStart,onStop);
	      return this;
		},
		initialize: function(config){
			config = config || {};
			//console.log('config : ' + config['height']);
			this.height = config['height'] || 180;
			this.width  = config['width'] || 320;
			this.onDragstop = config['onDragstop']  || function(i){};
			_.bindAll(this, 'render', 'setCursorPos','setColor');
			$(this.el).css('position','relative')
					.css('display','inline-block')
					.css('height',this.height)
					.css('width', this.width)
					;
		}
	});
	//========================================================================================
	
	var Endpoint1 = Backbone.Model.extend({
		urlRoot: function () 
		{
			return rootURL + '/api/devices/' + this.remote.nwkaddr + '/endpoints/' + this.remote.endpoint;
		},
		initialize: function(eptInfo) 
		{	
			this.eptInfo = eptInfo;
			this.remote = eptInfo;	
		},
		request: function(leaf, data) 
		{
			this.url = function(){ return this.urlRoot() + '/' + leaf};
			this.fetch({data:data});
		}
	});
	//====================================================================
	// Partial ZLL Initiator, only do scan, identify and reset
	//====================================================================
	var sendZDOCommand = function(cmd, param, callback) {
		$.ajax({
			url: rootURL + '/api/devices/0000/endpoints/00/'+ cmd,
			data:param,
			dataType: "json",
			beforeSend: function( xhr ) {
				xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
			}
			}).done(callback);
	};
	var ZLLInitiatorModel = Backbone.Model.extend({
		urlRoot: function () {
			return rootURL + '/api/interpan/zllinitiator';
		},
		initialize: function(eptInfo) {	this.remote = eptInfo;	},
		request: function(leaf, data) {
			this.url = function(){ return this.urlRoot() + '/' + leaf};
			this.fetch({data:data});
		}
	});
	var DiscoverButton = Backbone.View.extend({
		state:'normal',
		events: {'click span': 'handleClick'},
		sendCommand: function() {
			this.model.request('scan');
		},
		render: function() {
		},
		setNormal: function()
		{
			$(this.el).children('span').text('Discover Bulbs');
			this.state = 'normal';
		},
		setWaiting: function()
		{
			this.state = 'waiting';
			this.remaining = 20; //  500ms per increment
			this.sendCommand();
			this.handleWaiting();
		},
		handleClick:function()
		{
			if (this.state == 'waiting')
			{
				return;
			}
			this.setWaiting();
		},
		handleWaiting:function()
		{
			this.thinking = this.thinking ? this.thinking : ['.','..','...','... .','... ..','... ...'];
			if (this.remaining > 0)
			{
				this.remaining--;
				var msg = this.thinking.shift();
				this.thinking.push(msg);
				$(this.el).children('span').text(msg);
				setTimeout(this.handleWaiting, 500);
			} else { 
				this.setNormal();
			}
		},
		handle: function() {
			if (this.state == 'waiting') {
				this.remaining = 0;
			}
		},
		initialize: function(config) {
			_.bindAll(this, 'render', 'sendCommand','handle','handleClick','handleWaiting','setNormal','setWaiting'); 
			this.model = config['model'];
			this.model.bind('change',this.handle,this);
			$(this.el).html('<span class="btn btn-default" style="width:100%"></span>').appendTo(config['wrapper']);
			this.setNormal();
		}		
	});
	
	var ZLLIdButton = Backbone.View.extend({
		events: {'click span': 'sendCommand'},
		sendCommand: function() {
			this.model.request('identify',this.devInfo);
		},
		render: function() {
			//markup = "btn btn btn-default";
			$(this.el).html('<span class="btn btn-default">Identify</span>');
			return this;
		},

		initialize: function(config) {
			_.bindAll(this, 'render', 'sendCommand'); 
			$(this.el).html('<span class="btn btn-default" style="width:100%">Identify</span>').appendTo(config['wrapper']);
			this.model = config['model'];
			this.devInfo =  config['devInfo'];
		}		
	});

	var ZLLResetButton = Backbone.View.extend({
		tagName: 'div',
		events: {'click span': 'sendCommand'},
		sendCommand: function() {
			this.model.request('reset',this.devInfo);
		},
		render: function() {
			//markup = "btn btn btn-default";
			$(this.el).html('<span class="btn btn-default">Reset</span>');
			return this;
		},

		initialize: function(config) {
			_.bindAll(this, 'render', 'sendCommand'); 
			$(this.el).html('<span class="btn btn-default" style="width:100%">Reset</span>').appendTo(config['wrapper']);
			this.model = config['model'];
			this.devInfo = config['devInfo'];
		}		
	});
	var HAPUnlinkButton = Backbone.View.extend({
		events: {'click span': 'sendCommand'},
		sendCommand: function() {
			sendZDOCommand('Mgmt_Leave_req', this.devInfo, function(data){});
			setTimeout('location.reload()', 1500);
		},
		initialize: function(config) {
			_.bindAll(this, 'render', 'sendCommand'); 
			this.model = config['model'];
			this.devInfo = this.model.eptInfo;
			$(this.el).html('<span class="btn btn-default" style="width:100%">Unlink</span>').appendTo(config['wrapper']);;
		}		
	});
	var HAPIdButton = Backbone.View.extend({
		events: {'click span': 'sendCommand'},
		sendCommand: function() {
			this.model.request('identify', {'identifytime': '0001'});
			setTimeout($.proxy(function()
				{
				this.model.request('identify', {'identifytime': '0000'});
			},this), 2000);
		},
		initialize: function(config) 
		{
			_.bindAll(this, 'render', 'sendCommand'); 
			this.model = config['model'];	
			$(this.el).html('<span class="btn btn-default" style="width:100%">Identify</span>').appendTo(config['wrapper']);
		}		
	});
	var ColorView = Backbone.View.extend({
		tagName:'div',
		xy:[0,0],
		hs:[0,0],
		initialized:false,
		sendCommand: function() {
			var xy = {x: this.xy[0], y: this.xy[1]};
			this.model.request('color',{x : convertDecToBase(parseInt(xy.x * 65279),16,4),
										y : convertDecToBase(parseInt(xy.y * 65279),16,4),
										rate: '0004'});
		},
		render: function() {
			if (this.disable) { 
				$(this.el).css('position','relative')
						  .html('<div style="width:'+ this.canvas_area['width'] +'px; height: '+ this.canvas_area['height']+'px" class="cp-canvas"><span>Color Is Not Supported</span></div>')
				return this;
			}
			this.chromMap = new ChromaticityMap2({
			'width' : this.canvas_area['width'],
			'height': this.canvas_area['height'],
			'onDragstop': $.proxy(function(i) {
					this.xy = i.xyY;
					this.hs = i.hsl;
					this.sendCommand();
				}, this)
			});
			var chromeMap = this.chromMap;
			$(chromeMap.render().el).appendTo($(this.el));
			return this;
		},
		handle: function(){
			this.model.attributes.clusters.forEach(function(thisView) { 
				return function(clus, idx, ar){
					if (clus.id == '0300') 	{
						var settled = false;
						clus.attributes.forEach(function(attr, index, ar){
							if (attr.id=='0003') thisView.x = parseInt("0x"+attr.value)/65279;
							if (attr.id=='0004') thisView.y = parseInt("0x"+attr.value)/65279;
							if (attr.id=='0002') {
								var t = parseInt("0x"+attr.value);
								if ( t > 0) setTimeout(function(){thisView.model.request('states');}, t*100);
								else settled = true;	
							}
						});
						if (settled == true) {
							var xy = [(thisView.x * 65279).toFixed(0), (thisView.y * 65279).toFixed(0)];
							console.log('readback : ' +  xy);
							if (thisView.initialized===false) {
								var hsl = getHSL([thisView.x,thisView.y]);
								thisView.initialized = true;
								thisView.chromMap.setColor(hsl[0],hsl[1]);
							}	
						}
					}
			}}(this));	
		},
		initialize: function(config) {
			this.canvas_area = config['canvas_area'] || {'width': 342, 'height':180};
			this.model = config['model'];
			//$(this.el).css('width',342).css('height',185)
			$(this.el).css('width',this.canvas_area.width).css('height',this.canvas_area.height+5);
			this.render();
			$(this.el).appendTo(config['wrapper']);
			if (_.contains(this.model.eptInfo.simpleDescriptor.inClusterList, '0300') == false) {
				this.disable = true;
				return;
			}
			_.bindAll(this, 'render','sendCommand','handle');
			this.model.bind("change", this.handle, this);
		}
	});
	var LevelView1 = Backbone.View.extend({
		tagName:'div',
		level: 254,
		initialize: function(config) 
		{
			_.bindAll(this, 'render','sendCommand','handle','postSend');	
			var EndpointModel = config['model'];
			this.model = EndpointModel;			
			this.render();		
			$(this.el).on('change',this.sendCommand).appendTo(config['wrapper']);
			
			this.model.bind("change", this.handle, this);
			this.timer = 0;
		},
		postSend: function() {
			this.timer = 15; // in unit of 1/10 sec
		},
		handle: function() {
			if (this.timer > 0)
			{
				this.timer--;
				//console.log(this.timer);
				setTimeout(this.handle, 100);
				return;
			}
			this.model.attributes.clusters.forEach(function(thisView) { 
				return function(clus, idx, ar){
					if (clus.id == '0008') 	{
						var settled = false;
						clus.attributes.forEach(function(attr, index, ar){
							if (attr.id=='0000') thisView.level = parseInt("0x"+attr.value);
							if (attr.id=='0001') {
								var t = parseInt("0x"+attr.value);
								if ( t > 0) setTimeout(function(){thisView.model.request('states');}, t*100);
								else settled = true;				
							}	
						});
						if (settled == true) $(thisView.el).val(thisView.level);
					}
			}}(this));
		},
		render: function() {		
			var setup = function(thisView){
				return function() {
					$(thisView.el).noUiSlider({start: thisView.level , step: 1, connect: 'lower',range: {'min': 0,'max': 254}});
				}
			}(this);
			
			if (typeof($.fn.noUiSlider) != 'function') {
				console.log('wait for slider...');
				setTimeout(setup, 1000);
			} else {
				setup();
			}
			return this;
		},
		sendCommand: function(e) {
			e.stopPropagation();

			this.level = parseInt($(this.el).val());
			var levelHex = ((this.level < 16) ? '0':'') + this.level.toString(16);
			this.model.request('level', { val : levelHex , rate : '0004'});
			this.postSend();
		}
	});
	var ColorButton = Backbone.View.extend({
		tagName: 'div',
		state  : 'hiding',
		events: {'click span': 'sendCommand'},	
		sendCommand: function(e) 
		{
			//this.model.request('toggle');
			e.stopPropagation();
			if (this.state == 'hiding') {
				this.state = 'showing';
				this.button.text('-');
				this.cb.show();
			} else {
				this.state = 'hiding';
				this.button.text('+');
				this.cb.hide();
			}				
		},
		render: function() 
		{
			//this.button =  $('<span class="btn-state btn-primary">+</span>').appendTo($(this.el));
		},
		handle: function(){
			this.model.attributes.clusters.forEach(
			//function(thisView) { 
				$.proxy(function(clus, idx, ar){
					var thisView = this;
					if (clus.id == '0300' && _.contains(thisView.model.eptInfo.simpleDescriptor.inClusterList, '0300')) 	{
						clus.attributes.forEach(function(attr, index, ar){
							if (attr.id=='0003') thisView.x = parseInt("0x"+attr.value)/65279;
							if (attr.id=='0004') thisView.y = parseInt("0x"+attr.value)/65279;
						});
						var hsl = getHSL([thisView.x,thisView.y]);
						var rgb = hslTorgb(hsl[0],hsl[1],0.75 + 0.25*(1 - hsl[1]));
						var clr = 'rgb('+Math.round(rgb[0])+','+Math.round(rgb[1])+','+Math.round(rgb[2])+')';
						thisView.button.css('background-color', clr);
					}
			},this));	
		},
		initialize: function(config) 
		{
			_.bindAll(this, 'render', 'sendCommand','handle'); 		
			var EndpointModel = config['model'];			
			this.model = EndpointModel ? EndpointModel: new Backbone.Model();
			this.model.bind("change", this.handle, this);
			this.button =  $('<span class="btn-state btn-primary" style="border-color:#777;color:#777">+</span>').appendTo($(this.el));
			if (config['color']) 
			{
				this.button.css('background-color',config['color']);
			}
			$(this.el).appendTo(config['wrapper']);
			this.cb = {show:function(){},hide:function(){}};
			
		}		
	});
	var ToggleView1 = Backbone.View.extend({
		tagName: 'div',
		state  : '00',
		events: {'click span': 'sendCommand'},
		sendCommand: function() 
		{
			this.model.request('toggle');
		},
		render: function() 
		{
			if (this.state == '01') { 
				$(this.el).html('<span class="btn-state btn-primary">On/Off</span>'); 
			} else {					  
				$(this.el).html('<span class="btn-state btn-default">On/Off</span>');
			}
		},
		handle: function(){
			this.model.attributes.clusters.forEach($.proxy(function(clus, idx, ar)
			{
				if (clus.id == '0006') 	
				{
					this.state = clus.attributes[0].value;
				}
			}, this));		
			this.render();
		},
		initialize: function(config) 
		{
			_.bindAll(this, 'render', 'sendCommand','handle'); 
			this.render();
			var EndpointModel = config['model'];			
			this.model = EndpointModel;
			this.model.bind("change", this.handle, this);
			$(this.el).appendTo(config['wrapper']);
		}		
	});

	var NVModel = Backbone.Model.extend({
		url: rootURL + '/api/appdata',
		defaults: {state:'pwr',data:{}},
		getAllData: function()
		{
			$.ajax({
				url: this.url,
				method:'GET',
				processData:true,				
				dataType: "json",
				beforeSend: function( xhr ) {
					xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
				}
			}).done($.proxy(function(data) {
				this.set({data:data.data,state:'normal'});
			},this));
		},
		saveData: function(kv) 
		{
			var data = this.get('data');
			data[kv[0]] = kv[1];
			this.i = this.i ? this.i : 0;
			//staleGuard make sure all the listeners are fired
			this.set({data:data, staleGuard:this.i++});

			$.ajax({
				url: this.url,
				data:{key:kv[0], value:kv[1]},
				method:'POST',
				processData:true,				
				dataType: "json",
				beforeSend: function( xhr ) {
					xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
				}
			}).done($.proxy(function(data) {
				//console.log(JSON.stringify(data));
				//this.getAllData();
			},this));
		},

		initialize: function() 
		{	
			_.bindAll(this,'getAllData','saveData');	
			this.getAllData();
		},
	}); 	
	var LabelBox = Backbone.View.extend({
		nameText:'Light-Bulb',
		state:'normal',
		toEditMode:function()
		{
			this.state = 'editing';			
			this.display.css('display','none');		
			this.edit.css('display','inline-block').attr('value',this.nameText);	
			this.edit.focus();
			this.edit.select();
		},
		toNormalMode:function()
		{
			this.state = 'normal';
			this.display.css('display','inline-block');		
			this.edit.css('display','none');

			if (this.edit.val() != this.nameText)
			{
				this.nameModel.saveData([this.requestKey,this.edit.val() ]);
			}
		},
		handle:function(e){
			//console.log($(e.target).parent().attr('id'));
			//e.stopPropagation();
			if (this.state == 'normal') 
			{						
				this.toEditMode();
			} 
		},
		update:function()
		{
			var data = this.nameModel.get('data');
			this.nameText = this.nameModel.get('data')[this.requestKey];
			this.display.text(this.nameText);
		},
		initialize: function(config) 
		{
			_.bindAll(this,'handle','toEditMode','toNormalMode','update');
			this.model = config['model'];
			this.nameModel = config['nameModel'];
			this.id = 'label-box-' + this.model.eptInfo.ieeeAddr;
			this.el = $('<span></span>').appendTo(config['wrapper']).attr('id',this.id);
			
			this.requestKey = 'kappaio-lighting-widget-' + this.model.eptInfo.ieeeAddr + '-' + this.model.eptInfo.endpoint + '-name';

			
			
			if (config['editable']) {
				this.el.attr('class','editable');
				var data = this.nameModel.get('data');
				if (data[this.requestKey]) 
				{
					this.nameText = data[this.requestKey];
				} else {
					this.nameText = 'Light Bulb';
					//this.nameModel.saveData([this.requestKey,'Light Bulb']);
				}
						
				this.display = $('<p>'+ this.nameText + '</p>').appendTo(this.el);		
				this.edit = $('<input type="text">').appendTo(this.el).css('display','none');	
				this.el.click($.proxy(this.handle,this));
				this.el.bind('keypress',  $.proxy(function(e){
					if (this.state=='normal')
					{
						return;
					}
					if (e.type != 'keypress' || e.which != 13)
					{
						return;
					}
					this.toNormalMode();
				}, this));
				$(document).click($.proxy(function(e)
				{
					if ($(e.target).parent().attr('id') == this.id) return;
					if (this.state=='normal')
					{
						return;
					}
					this.toNormalMode();
				},this));
			} else {
				this.el.attr('class','noneditable');
				var data = this.nameModel.get('data');
				if (data[this.requestKey]) 
				{
					this.nameText = data[this.requestKey];
				} else {
					this.nameText = 'Light Bulb';
				}
				this.display = $('<p>'+ this.nameText + '</p>').appendTo(this.el);
			}
			this.nameModel.bind('change',this.update,this);
		}
	});

	var compactEnclosureList = Backbone.View.extend({	
		render: function()
		{	
			var eptModelList = this.eptModelList;
			//var namingModel = this.namingModel;
			for (i in eptModelList)
			{
				var outter = $('<div class="enclose-outter-row"></div>').appendTo(this.el);
				this.width = this.width? this.width : outter.width();
				var showHide;				
				var supportColor = _.contains(eptModelList[i].eptInfo.simpleDescriptor.inClusterList, '0300');
				{
					var enclose = 	$('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);		
					var ratio = {};
					
					if (supportColor) {
						ratio = {lb:'70%',tv:'20%'};
					} else {
						ratio = {lb:'80%',tv:'20%'};
					}
					new LabelBox({
						model:   eptModelList[i],
						nameModel: this.namingModel,
						wrapper: $('<div/>').appendTo(enclose).css('width',ratio.lb),
					});	
					
					if (supportColor) {
						showHide = new ColorButton({
							model:   eptModelList[i],
							wrapper: $('<div/>').appendTo(enclose).css('width','10%'),
						});
					}
					new ToggleView1({
						model:   eptModelList[i],
						wrapper: $('<div/>').appendTo(enclose).css('width','20%'),
					});
				}
				if (supportColor) {
					var enclose = 	$('<div class="enclose-inner-row" style="display:none; width:'+this.width +'px"></div>').appendTo(outter);
					new ColorView({
						model:   eptModelList[i],
						wrapper: $('<div/>').appendTo(enclose).css('width','100%'),
						canvas_area: {'width': this.width - 20, 'height':240},
					});
					showHide.cb = {
						show: $.proxy(function(){this.css('display','inline-block');},enclose),
						hide: $.proxy(function(){this.css('display','none');},enclose)
					};
				}
				{
					var enclose = $('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);
					new LevelView1({
						model:   eptModelList[i],
						wrapper: $('<div/>').appendTo(enclose).css('width','100%'),
					});
				}
				eptModelList[i].request('states');
			}
		},
		initialize: function(config)
		{
			_.bindAll(this,'render');	
			config['wrapper'].append(this.el);
			if (config['width']) this.width = config['width'];
			this.eptModelList = config['model'].get('endpointModelList');
			this.namingModel = config['namingModel'];
			this.render();
		}
	});
	var InfoDisp1 = Backbone.View.extend({
		initialize:function(config)
		{
			//this.model = config['model'];
			this.el = config['wrapper'];
			//var eptInfo = this.model.eptInfo;
			//var sd = eptInfo.simpleDescriptor;
			var addEntry = $.proxy(function(kv)
			{
				$('<span style="width:30%">'+ kv[0] +' : </span>').appendTo(this.el);
				$('<span style="width:70%">'+ kv[1] +'</span>').appendTo(this.el);
			},this);
			var items = config['items'];
			for (var i in items)
			{
				addEntry(items[i]);
			}

		}
	});
	var Manager = Backbone.View.extend({
		header: function()
		{
			var outter = $('<div class="enclose-outter-row"></div>').appendTo(this.el);
			this.width = this.width? this.width : outter.width();
			var enclose = 	$('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);
			$('<div style="width:30%;font-weight:bold">MY LAMPS</div>').appendTo(enclose);
			new DiscoverButton({
					model:  this.zllInitModel,
					wrapper: $('<div/>').appendTo(enclose).css('width','70%'),
			});
		},
		render: function()
		{	
			var eptModelList = this.eptModelList;
			var namingModel = this.namingModel;
			
			for (i in eptModelList)
			{		
				var outter = $('<div class="enclose-outter-row"></div>').appendTo(this.el);
				this.width = this.width? this.width : outter.width();				
				var eptInfo = eptModelList[i].eptInfo;
				var sd = eptInfo.simpleDescriptor;
				var enclose = 	$('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);
				new LabelBox({
					model:   eptModelList[i],
					nameModel: namingModel,
					wrapper: $('<div/>').appendTo(enclose).css('width','90%'),
					editable:true,
				});
				var showHide = new ColorButton({
					model:   eptModelList[i],
					wrapper: $('<div/>').appendTo(enclose).css('width','10%'),
					color:'rgb(232,228,218)',
				});
				
				var infoEnclose = $('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);
				new InfoDisp1({
					//model:   eptModelList[i],
					wrapper: $('<div/>').appendTo(infoEnclose).css('width','100%').css('margin-right','4%'),
					items:[['IEEE Addr' , eptInfo.ieeeAddr],
						['Nwk-Addr' , eptInfo.nwkaddr] ,
						['Endpoint' , eptInfo.endpoint],
						['Profile ID' , sd.profileId],
						['Device ID' , sd.deviceId]
					]
				});
				
				var btnEnclose = $('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);
				new HAPIdButton({
					model:   eptModelList[i],
					wrapper: $('<div/>').appendTo(btnEnclose).css('width','48%').css('margin-right','4%'),
				});
				new HAPUnlinkButton({
					model:   eptModelList[i],
					wrapper: $('<div/>').appendTo(btnEnclose).css('width','48%'),
				});
				showHideGrp = [infoEnclose, btnEnclose];
				showHideGrp.forEach(function(el){el.css('display','none');});
				showHide.cb = {
					show:$.proxy(function(){this.forEach(function(el){el.css('display','inline-block');});},showHideGrp),
					hide:$.proxy(function(){this.forEach(function(el){el.css('display','none');});},showHideGrp),
				};	
			}
		},
		initialize: function(config)
		{
			_.bindAll(this,'render');	
			config['wrapper'].append(this.el);
			if (config['width']) this.width = config['width'];
			this.eptModelList = config['model'].get('endpointModelList');
			this.namingModel = config['namingModel'];
			this.zllInitModel = new ZLLInitiatorModel();
			this.render();
		}
	});
	
	var DiscoverView = Backbone.View.extend({
		header: function()
		{
			var outter = $('<div class="enclose-outter-row"></div>').appendTo(this.el);
			this.width = this.width? this.width : outter.width();
			var enclose = 	$('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(outter);
			new DiscoverButton({
					model:  this.zllInitModel,
					wrapper: $('<div/>').appendTo(enclose).css('width','100%'),
			});
		},
		render: function()
		{	
			var eptModelList = this.eptModelList;
			var namingModel = this.namingModel;
			var zllInitModel = this.zllInitModel;
			var devList = zllInitModel.attributes.devList;
			
			for (var i in devList)
			{				
				var devInfo = devList[i];
				var inList = false;
				$(this.el).children('div.item').each(function()
				{
					if ($(this).data('id') == devInfo.ieeeAddr)
					inList = true;
				});
				var inNetwork = false; 
				for (var i in eptModelList)
				{
					//var info = this.endpointList[i];
					if (devInfo.ieeeAddr ==  eptModelList[i].eptInfo.ieeeAddr) 
					{
						inNetwork = true;
						break;
					}
				};
				if (inList || inNetwork)
				{
					if (inList) console.log('in list, skipping ' + devInfo.ieeeAddr);
					if (inNetwork) console.log('in network, skipping ' + devInfo.ieeeAddr);
					continue;
				}
				var listArea = $('<div class="enclose-outter-row item"></div>').appendTo(this.el).data('id',devInfo.ieeeAddr);
				var infoEnclose = 	$('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(listArea);
				var status;
				if (devInfo.factoryNew == '1')
				{
					status = 'Factory New';
				} else {
					status = 'Joined To Other Network'; 
				}
				new InfoDisp1({
					model:   eptModelList[i],
					wrapper: $('<div/>').appendTo(infoEnclose).css('width','100%'),
					items:[	['IEEE Addr',devInfo.ieeeAddr],
							['Channel', devInfo.channel],
							['Status',status]
					],
				});
				var btnEnclose = $('<div class="enclose-inner-row" style="width:'+this.width +'px"></div>').appendTo(listArea);
				new ZLLIdButton({
					model:   zllInitModel,
					wrapper: $('<div/>').appendTo(btnEnclose).css('width','48%').css('margin-right','4%'),
					devInfo: devInfo,
				});
				new ZLLResetButton({
					model:   zllInitModel,
					wrapper: $('<div/>').appendTo(btnEnclose).css('width','48%'),
					devInfo: devInfo,
				});
			}
			
		},
		initialize: function(config)
		{
			_.bindAll(this,'render');	
			config['wrapper'].append(this.el);
			if (config['width']) this.width = config['width'];
			this.eptModelList = config['model'].get('endpointModelList');
			this.namingModel = config['namingModel'];
			this.zllInitModel = new ZLLInitiatorModel();
			this.zllInitModel.bind('change',this.render,this);
			this.header();
		}
	});
	//======================================================================================
	var MainPanel = Backbone.View.extend({
		el:$(mainContainer),
		initialize: function()
		{
			_.bindAll(this,'getHANState','render','toNormal');					
			this.panel = $('<div class="wd-container kappaio-lighting-widget"></div>').appendTo($(this.el));			
			this.model = new Backbone.Model;
			this.model.bind('change',this.render,this);
			this.state = 'pwr';
			this.namingModel = new NVModel();
			this.namingModel.on('change:state',this.toNormal);
		},
		toNormal:function()
		{
			if (this.state == 'pwr') {		
				this.state = 'normal';
				this.getHANState();
				console.log('state = ' + this.state + ' go to normal');
			} else {
				console.log('state = ' + this.state + ' do nothing');
			}
		},
		getHANState: function()
		{
			$.ajax({
				url: rootURL + '/api/thisdevice',
				dataType: "json",
				beforeSend: function( xhr ) 
				{
					xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
				}
				}).done($.proxy( function( data ) {
					var ctx = this;
					var x = ctx.model.get('endpointModelList');
					x = x ? x : [];	
					data.assocs.forEach(function(dev){
						dev.endpoints.forEach(function(ept){
							if (ept.paired != true) 
								return; 
							var sd = ept.simpleDescriptor;
							if (sd.profileId == "c05e" || sd.profileId == "0104") 						
							{
								var lightObj = {nwkaddr: dev.id, 
												ieeeAddr: dev.ieee_id, 
												endpoint: ept.id, 
												type: 'Lamp', 
												simpleDescriptor: sd};
								var ept = new Endpoint1(lightObj);
								x.push(ept);
							} 
						});			    		
					});
					this.model.set({'endpointModelList': x});
				}, this));
		},
		render:function()
		{
			this.discoverPanel = this.discoverPanel ? this.discoverPanel : $('<div class="wd-row wd-contents scroll-autohide" style="display:none;overflow-x:hidden;height:90%"></div>').appendTo($(this.panel));
			new DiscoverView({ 
				wrapper: this.discoverPanel, 
				model  : this.model,
				namingModel: this.namingModel,
				width: $(this.panel).width() -12,
			});
			this.bulbWrapper = this.bulbWrapper ? this.bulbWrapper : $('<div class="wd-row wd-contents scroll-autohide" style="display:inline-block;overflow-x:hidden;height:90%"></div>').appendTo($(this.panel));
			this.bulbWrapper.scroll(function(e){
				e.stopPropagation();
			});
			new compactEnclosureList({ 
				wrapper: this.bulbWrapper, 
				model  : this.model,
				namingModel: this.namingModel,
				width: $(this.panel).width() -12, //padding takes 12px
			});
			this.zllPanel = this.zllPanel ? this.zllPanel : $('<div class="wd-row wd-content scroll-autohide" style="display:none;overflow-x:hidden;height:90%"></div>').appendTo($(this.panel));
			new Manager({ 
				wrapper: this.zllPanel, 
				model  : this.model,
				namingModel: this.namingModel,
				width: $(this.panel).width() -12,
			});

			this.btnRow = $('<div class="wd-row wd-content" style="position:absolute;bottom:-3px"></div>').appendTo($(this.panel));
			this.mainBtn = $('<span class="btn btn-default" style="width:32%;margin-right:2%;background-color:#ebebeb">Main</span>').appendTo(this.btnRow);
			this.lampBtn = $('<span class="btn btn-default" style="width:32%;margin-right:2%">Manage</span>').appendTo(this.btnRow);
			this.discBtn = $('<span class="btn btn-default" style="width:32%">Discover</span>').appendTo(this.btnRow);
			
			this.panelGrp = [[this.mainBtn,this.bulbWrapper],
							 [this.lampBtn,this.zllPanel],
							 [this.discBtn,this.discoverPanel]];
			
			this.panelGrp.forEach(function(v,i,grp){
				v[0].click($.proxy(function(e){
					e.stopPropagation();
					var v = this.v;
					var grp = this.grp;
					if (v[1].css('display') != 'inline-block') {
						grp.forEach(function(v){
							v[1].css('display','none');

							v[0].css('background-color','#ffffff');
						});
						v[1].css('display', 'inline-block');
						v[0].css('background-color','#ebebeb');
						
					}	
				},{grp:grp,v:v}));	
			});
	
			//setTimeout($.proxy(function(){this.trigger('click');},this.mainBtn), 100); // wft???
			var isTouch = function is_touch_device() {
				return !!('ontouchstart' in window);
			}();
			if (isTouch) {
				//this.bulbWrapper.attr('class','wd-row wd-contents');
				//this.zllPanel.attr('class','wd-row wd-contents');
				this.panelGrp.forEach(function(v,i,grp){
					v[1].attr('class','wd-row wd-contents');
				});
			}
		}	
	 });
	var mainPanel = new MainPanel();
	
}(jQuery))

