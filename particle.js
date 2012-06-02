var SCREEN_WIDTH = 600;
var SCREEN_HEIGHT = 600;
var PSIZE = parseInt( window.location.search.substring(1) ) || 4;
var DEG2RAD = (Math.PI/180)
var SPAWN_RATE = 0.1;
var SPAWN_SPECIAL = false;
var FPS = 30;
var canvas;
var g;


var GRID_X = Math.floor(SCREEN_WIDTH/PSIZE);
var GRID_Y = Math.floor(SCREEN_HEIGHT/PSIZE);

var NULL 	= -1;
var PLANT 	= 0;
var WATER 	= 1;
var FIRE 	= 2;
var SOLID	= 3;

var currentParticle  = WATER;
var currentSize		 = 1;

function Particle() {
	this.x 		= 0
	this.y 		= 0;
	this.xVel 	= 0;
	this.yVel 	= 0;
	this.RGB	= [255,255,255];
	this.alive	= true;
	this.type	= NULL;
	this.id		= 0;
}
Particle.prototype.draw = function() {
	g.fillStyle="rgba("+this.RGB[0]+", "+this.RGB[1]+", "+this.RGB[2]+", 1)";	
	g.fillRect(this.x*PSIZE, this.y*PSIZE, PSIZE, PSIZE);		
};
Particle.prototype.getNearbyParticles = function() {
	var result = [];
	var point = Engine.checkCollision(this.x-1, this.y-1);
	if( point != NULL ) result.push( point ); 
	point = Engine.checkCollision(this.x, this.y-1);
	if( point != NULL ) result.push( point );
	point = Engine.checkCollision(this.x+1, this.y-1);
	if( point != NULL ) result.push( point );
	point = Engine.checkCollision(this.x-1, this.y);
	if( point != NULL ) result.push( point );
	point = Engine.checkCollision(this.x+1, this.y);
	if( point != NULL ) result.push( point );
	point = Engine.checkCollision(this.x-1, this.y+1);
	if( point != NULL ) result.push( point );
	point = Engine.checkCollision(this.x, this.y+1);
	if( point != NULL ) result.push( point );
	point = Engine.checkCollision(this.x+1, this.y+1);
	if( point != NULL ) result.push( point );
	
	return result;
}
Particle.prototype.getDistance = function( p ) {
	return Math.sqrt((p.x-this.x)*(p.x-this.x) + (p.y-this.y)*(p.y-this.y));
}


Particle.prototype.restrain = function() {
	if( this.x < 0 ) {
		this.x = 0;
		this.xv = Math.floor( -this.xv * 0.5 );
	}
	if( this.x > Math.floor(SCREEN_WIDTH/PSIZE) ) {
		this.x = Math.floor(SCREEN_WIDTH/PSIZE)-1;
		this.xv = Math.floor( -this.xv * 0.5 );
	}
	if( this.y < 0 ) {
		this.y = 0;
		this.yVel = 0;
	}
	if( this.y >= Math.floor(SCREEN_HEIGHT/PSIZE) ) {
		this.y = Math.floor(SCREEN_HEIGHT/PSIZE)-1;
		this.yVel = 0;
	}
}
function WaterParticle(x, y){
	this.x = x;
	this.y = y;
	this.RGB = [0, 0, 255];
	this.type = WATER;
	this.onFire = false;
		
	this.simulate = function() {
		this.yVel++;
		var moveY = this.yVel;
		var nx = this.x;
		var ny = this.y;
		var left = Engine.checkCollision( nx-1, ny );
		var right = Engine.checkCollision( nx+1, ny);
		if( Math.random() < 0.3 && ny != GRID_Y-1 ) {
			if( left == NULL && right == NULL) {
				if( Math.random() < 0.5 ) nx++;
				else nx--;
			}
			else if( right == NULL ) {
				nx++;
			}
			else if( left == NULL ) {
				nx--;
		}
		}
		
		while( moveY != 0 ) {
			var dy = 0;
			if( moveY > 0) { dy =  1; }
			else if( moveY < 0) { dy = -1; }
			
			var otherParticle = Engine.checkCollision( nx, ny+dy );
			if( otherParticle != NULL ) { 
				this.yVel = 0;
				break;				
			}
			ny = ny + dy;
			moveY -= dy;
		}	
		
		this.x = nx;
		this.y = ny;
		this.restrain();
		
	}
}
WaterParticle.prototype = new Particle();

function FireParticle( x, y ){
	this.x = x;
	this.y = y;
	this.RGB = [255, 191, 0];
	this.swayFactor = 3;
	this.originalX = x;
	this.steam = false;
	this.type = FIRE;
	
	this.simulate = function () {
		this.yVel = -2;
		
		var randomSway = this.x-this.originalX;
		if( randomSway <= -this.swayFactor ) this.x++;
		else if( randomSway >= this.swayFactor ) this.x--;
		else this.x += Math.floor( Math.random()*3 )-1;
		
		if( !this.steam  ) {
			if( this.RGB[1] >= 0 ){
				this.RGB[1] -= 12;
			}
			else if(this.RGB[0] > 0) {
				this.RGB[0] -= 10;
			} 
			else if( this.RGB[0] == 0 ) {
				this.alive = false;
			}
		}
		
		if( this.y <= 0 ) this.alive = false;
		if( this.x < 1 || this.x > GRID_X-1 ) this.alive = false;
		
		var moveY = this.yVel;
		var ny = this.y;
		while( moveY != 0 ) {
			var dy = 0;
			if( moveY > 0) { dy =  1; }
			else if( moveY < 0) { dy = -1; }
			
			var c = Engine.checkCollision( this.x, ny+dy );
			if( c != NULL && Engine.particleArray[c] && Engine.particleArray[c].type == SOLID && !this.steam) { 
				this.alive = false;
				break;				
			}
			if( c != NULL && Engine.particleArray[c] && Engine.particleArray[c].type == PLANT && !this.steam){
				//console.log("Lighting: "+this.x + "," + (ny+dy).toString() );
				Engine.particleArray[c].onFire = true;
				this.alive = false;		
				break;				
			}
			if( c != NULL && Engine.particleArray[c] && Engine.particleArray[c].type == WATER ){
				this.RGB = [100,100,255];
				this.steam = true;
				Engine.particleArray[c].alive = false;
				break;				
			}
			ny = ny + dy;
			moveY -= dy;
		}
		
		this.y = ny;	
	}
}
FireParticle.prototype = new Particle();

function PlantParticle(x, y) {
	this.x = x;
	this.y = y;
	this.RGB = [0, 255, 0];
	this.type = PLANT;
	this.life = 100;
	this.spread = Math.floor( Math.random()*4 );
	
	
	this.simulate = function(){
		
		if( this.spread > 0 && Math.random() < 0.25 ) {
			var randomLoc = [0,0];
			var r = Math.random();
			if ( r < 0.33 ) randomLoc = [this.x+1, this.y];
			else if( r<0.66 )  randomLoc = [this.x, this.y-1];
			else randomLoc = [this.x-1, this.y];
			
			var c = Engine.checkCollision( randomLoc[0], randomLoc[1] );
			if( c == NULL ) {
				Engine.addParticle( randomLoc[0], randomLoc[1], PLANT );				
			}
			
			this.spread--;
		}
		
		var c = Engine.checkCollision( this.x, this.y-1 );
		if( c != NULL && Engine.particleArray[c] &&  Engine.particleArray[c].type == WATER ) {
			this.spread++;
			Engine.particleArray[c].alive = false;
		}
		c = Engine.checkCollision( this.x-1, this.y );
		if( c != NULL && Engine.particleArray[c] &&  Engine.particleArray[c].type == WATER ) {
			this.spread++;
			Engine.particleArray[c].alive = false;
		}
		c = Engine.checkCollision( this.x+1, this.y );
		if( c != NULL && Engine.particleArray[c] &&  Engine.particleArray[c].type == WATER ) {
			this.spread++;
			Engine.particleArray[c].alive = false;
		}
		
		if( this.onFire ) {
			
			this.life -= 20;
			this.RGB[1] -= 10;
			this.RGB[0] += 50
			if( this.RGB[0] >= 255 ) {
				this.RGB[0] -= 20;
			}
			
			if( this.life <= 0 ) {
				// Spread the fire
				var nearbyParticles = this.getNearbyParticles();
				for( i in nearbyParticles ) {
					//console.log("Working on : "+nearbyParticles[i]);
					var op = Engine.particleArray[ nearbyParticles[i] ];
					if( op && op.type == PLANT && !op.onFire && this.getDistance(op) < 2 && Math.random() < 0.5 ) {					
						Engine.particleArray[ nearbyParticles[i] ].onFire = true;
						
						//console.log("Igniting from " + this.getDistance( Engine.particleArray[ nearbyParticles[i] ] ) );
						//console.log("Igniiting nearby: " + Engine.particleArray[ nearbyParticles[i] ].x + "," + Engine.particleArray[ nearbyParticles[i] ].y + "from [" + this.x + "," + this.y + "]" );	
					}
				}
				//console.log(this.id + " has caught fire.");
				this.alive = false;
			}			
		}
		
	}
}
PlantParticle.prototype = new Particle();

function SolidParticle(x, y){
	this.x = x;
	this.y = y;
	this.RGB = [150, 150, 150];
	this.type = SOLID;
	
	this.simulate = function() {
	}
}
SolidParticle.prototype = new Particle();

var fps = 0, now, lastUpdate = (new Date)*1 - 1;
var fpsFilter = 50;

function render() {	

	var thisFrameFPS = 1000 / ((now=new Date) - lastUpdate);
	
	// Draw the background
	g.fillStyle="rgb(0, 0, 0)";	
	g.fillRect(0,0,600,600);
	
	// Simulate the particles
	Engine.simulate();	

	// Draw if they are alive
	for( var i = 0; i<Engine.particleArray.length; i++){
		var p = Engine.particleArray[i];
		if( p.alive ) {
			p.draw();
		}
	}
	
	// Highlight the grid
	var mouseLoc = Engine.getGridLocation( Interface.mouseX, Interface.mouseY );
	
	g.fillStyle="rgba(150, 150, 150, 0.5)";	
	g.fillRect(mouseLoc.x*PSIZE - Math.floor(PSIZE*currentSize/2),mouseLoc.y*PSIZE - Math.floor(PSIZE*currentSize/2), PSIZE*currentSize, PSIZE*currentSize);
	
	
	fps += (thisFrameFPS - fps) / fpsFilter;
	lastUpdate = now;
	$("#dbg").html( "FPS: "+ fps.toFixed(1) );
}

//*************************
//
// ENGINE
//
//*************************
var Engine = { 
	particleArray:[],
	particleCount: 0,
	collisionArray:(function(){
		var k = [];
		for( var i = 0; i<GRID_X; i++){
			k[i] = new Array(GRID_Y);
			for( var j = 0; j<GRID_Y; j++){
				k[i][j] = NULL;
			}
		}
		return k;
	})(),
	checkCollision: function(x, y){
		if( x >= GRID_X || x < 0 || y >= GRID_Y || y < 0) return;
		return this.collisionArray[x][y];
	},
	setCollision: function(x, y, val) {
		if( x >= GRID_X || x < 0 || y >= GRID_Y || y < 0) return;
		this.collisionArray[x][y] = val;
	},
	getGridLocation: function(rx, ry ){
		var x = Math.floor(rx / PSIZE);
		var y = Math.floor(ry / PSIZE);
		return {x:x, y:y};
	},
	changeSize: function(d) {
		currentSize += d;
	},
	run: function () {
		if( Interface.mouseDown ){
			for( var i = 0; i<SPAWN_RATE; i++ ){			
				var x = Interface.mouseX;
				var y = Interface.mouseY;

				
				var loc = Engine.getGridLocation(x, y);
				
				if( currentSize == 1 ) {
					Engine.addParticle(loc.x, loc.y, currentParticle);	
				}
				
				for( var j = loc.x-Math.floor(currentSize/2); j<loc.x+Math.floor(currentSize/2); j++){
					for( var k = loc.y-Math.floor(currentSize/2); k<loc.y+Math.floor(currentSize/2); k++){					
						Engine.addParticle(j, k, currentParticle);	
					}
				}							
			}
		}		
		render();
	},
	addParticle: function(x, y, type) {
		if( x >= GRID_X || x<0 || y >= GRID_Y || y<0 ) return;
		if( Engine.particleCount > 5000 ) return;
		
		// Kill any particles that are already there
		var c = Engine.checkCollision(x, y);
		if( c != NULL ) {
			return;
		}
		
		var p;
		if( type == WATER ) p = new WaterParticle(x, y);
		if( type == PLANT ) p = new PlantParticle(x, y);
		if( type == SOLID ) p = new SolidParticle(x, y);
		if( type == FIRE ) p = new FireParticle(x, y);
		p.id = Engine.particleArray.length;
		
		
		Engine.particleCount++;
		Engine.particleArray.push( p );		
	},
	replaceParticle: function( which, type ){
		var x = which.x;
		var y = which.y;
		
		if( type == WATER )	this.particleArray[which.id] = new WaterParticle(x, y);
		if( type == PLANT ) this.particleArray[which.id] = new PlantParticle(x, y);
		if( type == FIRE ) this.particleArray[which.id] = new FireParticle(x, y);
		if( type == SOLID ) this.particleArray[which.id] = new SolidParticle(x, y);
	},
	removeParticle: function( p ) {
		if( p.id == -1 ) return;
		
		//console.log("removeParticle["+p.id+"]["+p.type+"]"+" at ["+p.x+", "+p.y+"]");	
		Engine.setCollision( p.x, p.y, NULL );
		Engine.particleArray.splice( p.id, 1 );
		
		for( var i = p.id, max=Engine.particleArray.length; i<max; i++ ){
			Engine.particleArray[i].id--;
		}
		
		delete p;
		Engine.particleCount--;
	}
};

Engine.simulate = function(){	
	
	var deadParticles = [];
	for( var i = 0; i<Engine.particleArray.length; i++){
		var p = Engine.particleArray[i];	
		Engine.setCollision(p.x, p.y, NULL);			
		p.simulate();	
		if( p.type != FIRE )
			Engine.setCollision(p.x, p.y, p.id);		
		if( !p.alive )
			deadParticles.push( p );
	}
	
	// Recycle
	for( var i in deadParticles ) {
		Engine.removeParticle( deadParticles[i] );
	}
}

//*************************
//
// INTERFACE
//
//*************************
var Interface = { mouseDown:false, mouseX:0, mouseY:0 };

Interface.onMouseDown = function(evt){
	var x = evt.clientX;
	var y = evt.clientY;
	
	var _x = 0;
	var _y = 0;
	var op = canvas.offsetParent;
	while( op !== null ){
		_x = parseInt(_x) + parseInt( canvas.offsetLeft );
		_y = parseInt(_y) + parseInt( canvas.offsetTop );
		op = op.offsetParent;
	}
	
	x = x - _x;
	y = y - _y

	Interface.mouseX =  x;
	Interface.mouseY =  y;
	
	Interface.mouseDown = true;
}
Interface.onMouseMove = function(evt){
	var x = evt.clientX;
	var y = evt.clientY;
	
	var _x = 0;
	var _y = 0;
	var op = canvas.offsetParent;
	while( op !== null ){
		_x = parseInt(_x) + parseInt( canvas.offsetLeft );
		_y = parseInt(_y) + parseInt( canvas.offsetTop );
		op = op.offsetParent;
	}
	
	x = x - _x;
	y = y - _y

	Interface.mouseX =  x;
	Interface.mouseY =  y;
}
Interface.onMouseUp = function(evt){
	Interface.mouseDown = false;
}
Interface.onMouseScroll = function(evt) {
	var d = evt.wheelDelta;
	if( d > 0 ){
		Engine.changeSize(1);
	} else if( d < 0 && currentSize > 1) {
		if( currentSize < 30 ) Engine.changeSize(-1);
	}
}
Interface.onParticleChange = function(elmt, type) {
	$(".palette li").each(function(i, val) {
		$(this).css('color', 'white');
	});	
	$(elmt).css('color', 'yellow');
	currentParticle = type;
}

$(document).ready(function(){
	canvas = document.getElementById('g');  
	g = canvas.getContext('2d');  
	canvas.addEventListener('mousedown', Interface.onMouseDown, false);
	canvas.addEventListener('mouseup', Interface.onMouseUp, false);
	canvas.addEventListener('mousemove', Interface.onMouseMove, false);
	canvas.addEventListener('mouseout', Interface.onMouseUp, false);
	canvas.addEventListener('mousewheel', Interface.onMouseScroll, false);
	setInterval( Engine.run, FPS );
	
});



