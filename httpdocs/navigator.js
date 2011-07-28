/**
 * navigator.js
 *
 * requirements:
 *	 tools.js
 *	 ui.js
 *	 slider.js
 *   stack.js
 */

/**
 */

/**
 * Navigator tool.  Moves the stack around 
 */
function Navigator( n )
{
	var self = this;
	this.stack = null;

	if ( !ui ) ui = new UI();

	var sliders_box = document.getElementById( "sliders_box" );
	var input_x = document.getElementById( "x" );		//!< x_input
	var input_y = document.getElementById( "y" );		//!< y_input

  // Last mouse position for proper zoom with + and -
  var lastX = 0,
      lastY = 0;
	
	/* remove all existing dimension sliders */
	while ( sliders_box.firstChild )
		sliders_box.removeChild( sliders_box.firstChild );
	
	var slider_z = new Slider(
			SLIDER_HORIZONTAL,
			true,
			1,
			388,
			388,
			1,
			function( val ){ statusBar.replaceLast( "z: " + val ); return; } );
	
	var slider_s = new Slider(
			SLIDER_HORIZONTAL,
			true,
			undefined,
			undefined,
			new Array(
				0,
				1,
				2,
				4,
				8 ),
			8,
			function( val ){ statusBar.replaceLast( "s: " + val ); } );
	
	var slider_z_box = document.createElement( "div" );
	slider_z_box.className = "box";
	slider_z_box.id = "slider_z_box";
	var slider_z_box_label = document.createElement( "p" );
	slider_z_box_label.appendChild( document.createTextNode( "z-index&nbsp;&nbsp;" ) );
	slider_z_box.appendChild( slider_z.getView() );
	slider_z_box.appendChild( slider_z.getInputView() );
	
	sliders_box.appendChild( slider_z_box );
	
	var slider_s_view = slider_s.getView();
	slider_s_view.id = "slider_s";
	document.getElementById( "slider_s" ).parentNode.replaceChild(
			slider_s_view,
			document.getElementById( "slider_s" ) );
	document.getElementById( "slider_s" ).parentNode.replaceChild(
			slider_s.getInputView(),
			slider_s_view.nextSibling );
			
	//! mouse catcher
	this.mouseCatcher = document.createElement( "div" );
	self.mouseCatcher.className = "sliceMouseCatcher";

    this.setMouseCatcher = function( mc )
    {
        self.mouseCatcher = mc;
    }
	
	var updateControls = function()
	{
		slider_s.setByValue( self.stack.s, true );
		slider_z.setByValue( self.stack.pos[2], true );

		input_x.value = self.stack.pos[0];
		input_y.value = self.stack.pos[1];

		return;
	}
	
	this.resize = function( width, height )
	{
		self.mouseCatcher.style.width = width + "px";
		self.mouseCatcher.style.height = height + "px";
		return;
	}
	
	this.redraw = function()
	{
		updateControls();
	}
	
	var onmousemove = function( e )
	{
		self.lastX = self.stack.pos[0] + ui.diffX; // TODO - or + ?
		self.lastY = self.stack.pos[1] + ui.diffY;
		var tmp_pos = self.stack.pos.slice(0);
		tmp_pos[0] = self.stack.pos[0] - ui.diffX / self.stack.scale,
		tmp_pos[1] = self.stack.pos[1] - ui.diffY / self.stack.scale,
		self.stack.moveToPixel( tmp_pos, self.stack.s );
		updateControls();
		return true;
	};
	
	var onmouseup = function( e )
	{
		ui.releaseEvents(); 
		ui.removeEvent( "onmousemove", onmousemove );
		ui.removeEvent( "onmouseup", onmouseup );
		return false;
	};
	
	var onmousedown = function( e )
	{
		ui.registerEvent( "onmousemove", onmousemove );
		ui.registerEvent( "onmouseup", onmouseup );
		ui.catchEvents( "move" );
		ui.onmousedown( e );
		
		ui.catchFocus();
		
		return false;
	};
	
	var onmousewheel = function( e )
	{
		var w = ui.getMouseWheel( e );
		if ( w )
		{
			if ( w > 0 )
			{
				slider_z.move( -1 );
			}
			else
			{
				slider_z.move( 1 );
			}
		}
		return false;
	};

	var onmousewheel = 
	{
		zoom : function( e )
		{
			var w = ui.getMouseWheel( e );
			if ( w )
			{
				if ( w > 0 )
				{
					slider_z.move( -1 );
				}
				else
				{
					slider_z.move( 1 );
				}
			}
			return false;
		},
		move : function( e )
		{
			var xp = self.stack.pos[0];
			var yp = self.stack.pos[1];
			var m = ui.getMouse( e );
			var w = ui.getMouseWheel( e );
			if ( m )
			{
				xp = m.offsetX - self.stack.viewWidth / 2;
				yp = m.offsetY - self.stack.viewHeight / 2;
				//statusBar.replaceLast( ( m.offsetX - viewWidth / 2 ) + " " + ( m.offsetY - viewHeight / 2 ) );
			}
			if ( w )
			{
				if ( w > 0 )
				{
					if ( self.stack.s < self.stack.MAX_S )
					{
						var tmp_pos = self.stack.pos.slice(0);
						tmp_pos[0] = self.stack.pos[0] - Math.floor( xp / self.stack.scale ),
						tmp_pos[1] = self.stack.pos[1] - Math.floor( yp / self.stack.scale ),
						self.stack.moveToPixel( tmp_pos, self.stack.s + 1 );
					}
				}
				else
				{
					if ( self.stack.s > 0 )
					{
						var ns = self.stack.scale * 2;
						tmp_pos[0] = self.stack.pos[0] + Math.floor( xp / ns ),
						tmp_pos[1] = self.stack.pos[1] + Math.floor( yp / ns ),
						self.stack.moveToPixel( tmp_pos, self.stack.s - 1 );
					}
				}
			}
			return false;
		}
	};
	
	//--------------------------------------------------------------------------
	/**
	 * Slider commands for changing the slice come in too frequently, thus the
	 * execution of the actual slice change has to be delayed slightly.  The
	 * timer is overridden if a new action comes in before the last had time to
	 * be executed.
	 */
	var changeSliceDelayedTimer = null;
	var changeSliceDelayedParam = null;
	
	var changeSliceDelayedAction = function()
	{
		window.clearTimeout( changeSliceDelayedTimer );
		self.changeSlice( changeSliceDelayedParam.z );
		changeSliceDelayedParam = null;
		return false;
	}
	
	this.changeSliceDelayed = function( val )
	{
		if ( changeSliceDelayedTimer ) window.clearTimeout( changeSliceDelayedTimer );
		changeSliceDelayedParam = { z : val };
		changeSliceDelayedTimer = window.setTimeout( changeSliceDelayedAction, 100 );
	}
	
	this.changeSlice = function( val )
	{
		var posp = self.stack.pos.slice(0);
		posp[2] = val;
		self.stack.moveToPixel( posp, self.stack.s );
		return;
	}
	//--------------------------------------------------------------------------
	
	//--------------------------------------------------------------------------
	/**
	 * ... same as said before for scale changes ...
	 */
	var changeScaleDelayedTimer = null;
	var changeScaleDelayedParam = null;
	
	var changeScaleDelayedAction = function()
	{
		window.clearTimeout( changeScaleDelayedTimer );
		self.changeScale( changeScaleDelayedParam.s );
		changeScaleDelayedParam = null;
		return false;
	}
	
	this.changeScaleDelayed = function( val )
	{
		if ( changeScaleDelayedTimer ) window.clearTimeout( changeScaleDelayedTimer );
		changeScaleDelayedParam = { s : val };
		changeScaleDelayedTimer = window.setTimeout( changeScaleDelayedAction, 100 );
	}
	
	this.changeScale = function( val )
	{
		self.stack.moveToPixel( self.stack.pos, val );
		return;
	}

  /**
   * change the scale, making sure that the point keep_[xyz] stays in
   * the same position in the view
   */
  this.scalePreservingLastPosition = function (keep_x, keep_y, sp) {
    var old_s = self.stack.s;
    var old_scale = self.stack.scale;
    var new_s = Math.max(0, Math.min(self.stack.MAX_S, Math.round(sp)));
    var new_scale = 1 / Math.pow(2, new_s);

    if (old_s == new_s) return;

    var dx = keep_x - self.stack.getProject().coordinates.x;
    var dy = keep_y - self.stack.getProject().coordinates.y;

    var new_centre_x = keep_x - dx * (old_scale / new_scale);
    var new_centre_y = keep_y - dy * (old_scale / new_scale);

    self.stack.moveTo(self.stack.getProject().coordinates.z, new_centre_y, new_centre_x, sp);
  }
  
  
	//--------------------------------------------------------------------------

	var changeXByInput = function( e )
	{
		var val = parseInt( this.value );
		if ( isNaN( val ) )
			this.value = self.stack.pos[0];
		else
		{
			var posp = self.stack.pos.slice(0);
			posp[0] = val;
			self.stack.moveToPixel( posp, self.stack.s );
		}
		return;
	}
	
	var changeYByInput = function( e )
	{
		var val = parseInt( this.value );
		if ( isNaN( val ) )
			this.value = self.stack.pos[1];
		else
		{
			var posp = self.stack.pos.slice(0);
			posp[1] = val;
			self.stack.moveToPixel( posp, self.stack.s );
		}
		return;
	}
	
	var YXMouseWheel = function( e )
	{
		var w = ui.getMouseWheel( e );
		if ( w )
		{
			this.value = parseInt( this.value ) - w;
			this.onchange();
		}
		return false
	}
	
	/**
	 * install this tool in a stack.
	 * register all GUI control elements and event handlers
	 */
	this.register = function( parentStack, buttonName )
	{

		document.getElementById( typeof buttonName == "undefined" ? "edit_button_move" : buttonName ).className = "button_active";
		document.getElementById( "toolbar_nav" ).style.display = "block";
		
		self.stack = parentStack;

		self.mouseCatcher.onmousedown = onmousedown;
		try
		{
			self.mouseCatcher.addEventListener( "DOMMouseScroll", onmousewheel.zoom, false );
			/* Webkit takes the event but does not understand it ... */
			self.mouseCatcher.addEventListener( "mousewheel", onmousewheel.zoom, false );
		}
		catch ( error )
		{
			try
			{
				self.mouseCatcher.onmousewheel = onmousewheel.zoom;
			}
			catch ( error ) {}
		}
		
		self.stack.getView().appendChild( self.mouseCatcher );

		slider_s.update(
			self.stack.MAX_S,
			0,
			self.stack.MAX_S + 1,
			self.stack.s,
			self.changeScaleDelayed );
		
		if ( self.stack.slices.length < 2 )	//!< hide the slider_z if there is only one slice
		{
			slider_z.getView().parentNode.style.display = "none";
		}
		else
		{
			slider_z.getView().parentNode.style.display = "block";
		}
		slider_z.update(
			0,
			0,
			self.stack.slices,
			self.stack.pos[2],
			self.changeSliceDelayed );
		
		input_x.onchange = changeXByInput;
		try
		{
			input_x.addEventListener( "DOMMouseScroll", YXMouseWheel, false );
		}
		catch ( error )
		{
			try
			{
				input_x.onmousewheel = YXMouseWheel;
			}
			catch ( error ) {}
		}
		
		input_y.onchange = changeYByInput;
		try
		{
			input_y.addEventListener( "DOMMouseScroll", YXMouseWheel, false );
		}
		catch ( error )
		{
			try
			{
				input_x.onmousewheel = YXMouseWheel;
			}
			catch ( error ) {}
		}
		
		updateControls();
		
		return;
	}
	
	
	/**
	 * unregister all stack related mouse and keyboard controls
	 */
	this.unregister = function()
	{
		if ( self.stack && self.mouseCatcher.parentNode == self.stack.getView() )
			self.stack.getView().removeChild( self.mouseCatcher );
		return;
	}
	
	
	/**
	 * unregister all project related GUI control connections and event
	 * handlers, toggle off tool activity signals (like buttons)
	 */
	this.destroy = function( buttonName )
	{
		self.unregister();
		
		document.getElementById( typeof buttonName == "undefined" ? "edit_button_move" : buttonName ).className = "button";
		document.getElementById( "toolbar_nav" ).style.display = "none";
		
		slider_s.update(
			0,
			1,
			undefined,
			0,
			null );
		
		slider_z.update(
			0,
			1,
			undefined,
			0,
			null );
		
		input_x.onchange = null;
		try
		{
			input_x.removeEventListener( "DOMMouseScroll", YXMouseWheel, false );
		}
		catch ( error )
		{
			try
			{
				input_x.onmousewheel = null;
			}
			catch ( error ) {}
		}
		
		input_y.onchange = null;
		try
		{
			input_y.removeEventListener( "DOMMouseScroll", YXMouseWheel, false );
		}
		catch ( error )
		{
			try
			{
				input_x.onmousewheel = null;
			}
			catch ( error ) {}
		}
		
		self.stack = null;
		
		return;
	}
	
}
