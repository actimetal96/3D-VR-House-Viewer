/**
* @author Chion82 https://miria.moe
*/

THREE.TouchFPSControls = function(camera, canvasDOM, options) {

  var pitchObject = new THREE.Object3D();
  var yawObject = new THREE.Object3D();

  var velocity = new THREE.Vector3();
  var joystick;

  this.options = options || {
    joystickContainer : null,
    verticalControlsContainer : null,
    moveSpeed : 3,
    canFly : true,
    viewMovingSpeed: 7,
    border : {
      maxX : 1000,
      minX : -1000,
      maxY : 1000,
      minY : 0,
      maxZ : 1000,
      minZ : -1000
    },
    debug : false,
    movingMiddleware : function(){}
  }

  this._camera = camera;
  this._canvasDOM = canvasDOM;
  this._joystickContainer = this.options.joystickContainer;
  this._verticalControlsContainer = this.options.verticalControlsContainer;
  this._moveSpeed = this.options.moveSpeed || 3;
  this._viewMovingSpeed = this.options.viewMovingSpeed || 2;
  this._canFly = this.options.canFly || true;
  this._border = this.options.border;
  this._movingMiddleware = this.options.movingMiddleware || function(){};

  this._init = function() {
    pitchObject.add(this._camera);
    yawObject.add(pitchObject);
    this._canvasDOM.addEventListener('touchstart', this._onTouchStart.bind(this));
    this._canvasDOM.addEventListener('touchend', this._onTouchEnd.bind(this));
    this._canvasDOM.addEventListener('touchmove', this._onTouchMove.bind(this));

    if (this._joystickContainer)
      this._initJoystick();

    if (this._verticalControlsContainer) {
      this._initVerticalControls();
    }

    if (this.options.debug) {
      this._initDebug();
    }

  }

  this._initVerticalControls = function() {
    this._verticalControlsContainer.innerHTML = '<div id="arrow-up-button"><i class="icon iconfont" style="font-size: 50px;">&#xe610;</i></div><div id="arrow-down-button"><i class="icon iconfont" style="font-size: 50px;">&#xe611;</i></div>';
    document.getElementById('arrow-up-button').addEventListener('touchstart', function(e){
      e.preventDefault();
      this._moveUpButtonDown = true;
    }.bind(this));
    document.getElementById('arrow-up-button').addEventListener('touchend', function(e){
      e.preventDefault();
      this._moveUpButtonDown = false;
    }.bind(this));
    document.getElementById('arrow-down-button').addEventListener('touchstart', function(e){
      e.preventDefault();
      this._moveDownButtonDown = true;
    }.bind(this));
    document.getElementById('arrow-down-button').addEventListener('touchend', function(e){
      e.preventDefault();
      this._moveDownButtonDown = false;
    }.bind(this));

    setInterval(function(){
      if (this._moveUpButtonDown) {
        this.getObject().position.y += this._moveSpeed;
      }
      if (this._moveDownButtonDown) {
        this.getObject().position.y -= this._moveSpeed;
      }
    }.bind(this), 10);

  }

  this._initDebug = function() {
    var debugBox = document.createElement('div');
    debugBox.id = 'threejs-debug-box';
    debugBox.style.position = 'fixed';
    debugBox.style.right = '0px';
    debugBox.style.top = '0px';
    debugBox.style.fontSize = '12px';
    debugBox.innerHTML = 'Debug Info';
    this._canvasDOM.appendChild(debugBox);

    setInterval(function(){
      var cameraPosition = this.getObject().position;

      debugBox.innerHTML = 'Camera Position: x=' + cameraPosition.x
        + '; y=' + cameraPosition.y + '; z=' + cameraPosition.z
        + '<br/>Yaw Rotation: y=' + yawObject.rotation.y
        + '<br/>Pitch Rotation: x=' + pitchObject.rotation.x;
    }.bind(this), 10);
  }

  this._initJoystick = function() {
    joystick	= new VirtualJoystick({
      container	: this._joystickContainer,
      mouseSupport	: true,
      stationaryBase	: true,
      baseX		: 90,
      baseY		: 90,
      limitStickTravel: true,
      stickRadius	: 50
    });

    var that = this;
    setInterval(function(){

      var delta = that._moveSpeed * 0.0001;
      // velocity.x -= velocity.x * 10.0 * delta;
      // velocity.z -= velocity.z * 10.0 * delta;
      // velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

      var deltaX = joystick.deltaX();
      var deltaY = joystick.deltaY();

      if (deltaX > 20) {
        deltaX = 20;
      }
      if (deltaX < -20) {
        deltaX = -20;
      }
      if (deltaY > 20) {
        deltaY = 20;
      }
      if (deltaY < -20) {
        deltaY = -20;
      }

      velocity.z = 400.0 * deltaY;
      velocity.x = 400.0 * deltaX;

      if (that._canFly)
        velocity.y = 0 - ((400.0 * deltaY) * that._camera.getWorldDirection().y);

      if (!joystick.up() && !joystick.down() && !joystick.left() && !joystick.right()) {
        velocity.x = 0;
        velocity.y = 0;
        velocity.z = 0;
      }

      that._movingMiddleware.call(that,
        velocity, that.getPosition(), that.getYawRotation(), that.getPitchRotation(), that._camera);

      that.getObject().translateX( velocity.x * delta );
      that.getObject().translateY( velocity.y * delta );
      that.getObject().translateZ( velocity.z * delta );

      if (that.options.border) {
        if (that.getObject().position.x >= that.options.border.maxX) {
          that.getObject().position.x = that.options.border.maxX;
        }
        if (that.getObject().position.z >= that.options.border.maxZ) {
          that.getObject().position.z = that.options.border.maxZ;
        }
        if (that.getObject().position.y >= that.options.border.maxY) {
          that.getObject().position.y = that.options.border.maxY;
        }

        if (that.getObject().position.x <= that.options.border.minX) {
          that.getObject().position.x = that.options.border.minX;
        }
        if (that.getObject().position.y <= that.options.border.minY) {
          that.getObject().position.y = that.options.border.minY;
        }
        if (that.getObject().position.z <= that.options.border.minZ) {
          that.getObject().position.z = that.options.border.minZ;
        }

      }

    }, 10);
  }

  this._isTouchDown = false;

  this._touchIndex = 0;
  this._onTouchStart = function(e) {
    //e.preventDefault();
    this._isTouchDown = true;
    var touchObj;
    if (e.touches) {
      this._touchIndex = e.touches.length - 1;
      touchObj = e.touches[this._touchIndex];
    } else {
      touchObj = e;
    }
    lastTouchPos.x = touchObj.clientX;
    lastTouchPos.y = touchObj.clientY;
  }

  this._onTouchEnd = function(e) {
    //e.preventDefault();
    this._isTouchDown = false;
  }

  var lastTouchPos = {x:0, y:0};
  this._onTouchMove = function(e) {
    e.preventDefault();
    if (!this._isTouchDown) {
      return;
    }

    var touchObj;
    if (e.touches) {
      touchObj = e.touches[this._touchIndex];
    } else {
      touchObj = e;
    }

    yawObject.rotation.y -= (touchObj.clientX - lastTouchPos.x) *  (0.001 * this._viewMovingSpeed);
    pitchObject.rotation.x -= (touchObj.clientY - lastTouchPos.y) * (0.001 * this._viewMovingSpeed);

    lastTouchPos.x = touchObj.clientX;
    lastTouchPos.y = touchObj.clientY;
  }

  this.getObject = function() {
    return yawObject;
  }

  this.setYawRotation = function() {
    yawObject.rotation.set.apply(yawObject.rotation, arguments);
  }

  this.setPitchRotation = function() {
    pitchObject.rotation.set.apply(pitchObject.rotation, arguments);
  }

  this.setPosition = function() {
    this.getObject().position.set.apply(this.getObject().position, arguments);
  }

  this.getYawRotation = function() {
    return yawObject.rotation;
  }

  this.getPitchRotation = function() {
    return pitchObject.rotation;
  }

  this.getPosition = function() {
    return this.getObject().position;
  }

  this._init();

}
