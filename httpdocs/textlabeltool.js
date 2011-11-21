/* -*- mode: espresso; espresso-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */

/**
 * textlabeltool.js
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
 * Constructor for the textlabel tool.
 */
function TextlabelTool()
{
  this.prototype = new Navigator();

  var self = this;
  var tracingLayer = null;
  var textlabelLayer = null;
  var stack = null;
  this.toolname = "textlabeltool";

	if ( !ui ) ui = new UI();

	//! mouse catcher
	this.mouseCatcher = document.createElement( "div" );
	self.mouseCatcher.className = "sliceMouseCatcher";

	this.resize = function( width, height )
	{
		self.mouseCatcher.style.width = width + "px";
		self.mouseCatcher.style.height = height + "px";
		return;
	}

  var setupSubTools = function()
  {
    /* create toolbar
    var box;
    if ( self.prototype.stack == null ) {
      box = createButtonsFromActions(
        actions,
        "tracingbuttons",
        "trace_");
      $( "#toolbar_nav" ).prepend( box );
    }
    */
  }

  /*
  TO CONVERT
   */

  /*
        for (var i = 0; i < textlabels.length; ++i) {
        textlabels[i].setEditable(true);
      }
   */

  this.showTextlabels = function (b) {
    show_textlabels = b;
    if (show_textlabels) self.updateTextlabels();
    else {
      //! remove all old text labels
      while (textlabels.length > 0) {
        var t = textlabels.pop();
        try //!< we do not know if it really is in the DOM currently
        {
          view.removeChild(t.getView());
        } catch (error) {}
      }
    }
    return;
  }

  /**
	 * create a textlabel on the server
	 */
	this.createTextlabel = function( tlx, tly, tlz, tlr, scale )
	{
		icon_text_apply.style.display = "block";
		requestQueue.register(
			'model/textlabel.create.php',
			'POST',
			{
				pid : project.id,
				x : tlx,
				y : tly,
				z : tlz,
				r : parseInt( document.getElementById( "fontcolourred" ).value ) / 255,
				g : parseInt( document.getElementById( "fontcolourgreen" ).value ) / 255,
				b : parseInt( document.getElementById( "fontcolourblue" ).value ) / 255,
				a : 1,
				type : "text",
				scaling : ( document.getElementById( "fontscaling" ).checked ? 1 : 0 ),
				fontsize : ( document.getElementById( "fontscaling" ).checked ?
							Math.max( 16 / scale, parseInt( document.getElementById( "fontsize" ).value ) ) :
							parseInt( document.getElementById( "fontsize" ).value ) ) * tlr,
				fontstyle : ( document.getElementById( "fontstylebold" ).checked ? "bold" : "" )
			},
			function( status, text, xml )
			{
				statusBar.replaceLast( text );

				if ( status == 200 )
				{
					icon_text_apply.style.display = "none";
					for ( var i = 0; i < stacks.length; ++i )
					{
						stacks[ i ].updateTextlabels();
					}
					if ( text && text != " " )
					{
						var e = eval( "(" + text + ")" );
						if ( e.error )
						{
							alert( e.error );
						}
						else
						{
						}
					}
				}
				return true;
			} );
		return;
	}

	/**
	 * update textlabels by querying it from the server
	 */
	this.updateTextlabels = function()
	{
		var tl_width;
		var tl_height;
		if ( tiles.length == 0 )
		{
			tl_width = 0;
			tl_height = 0;
		}
		else
		{
			tl_width = tiles[ 0 ].length * X_TILE_SIZE / scale;
			tl_height = tiles.length * Y_TILE_SIZE / scale;
		}
		requestQueue.register(
			'model/textlabels.php',
			'POST',
			{
				pid : project.id,
				sid : id,
				z : z * resolution.z + translation.z,
				top : ( y - tl_height / 2 ) * resolution.y + translation.y,
				left : ( x - tl_width / 2 ) * resolution.x + translation.x,
				width : tl_width * resolution.x,
				height : tl_height * resolution.y,
				//scale : ( mode == "text" ? 1 : scale ),	// should we display all textlabels when being in text-edit mode?  could be really cluttered
				scale : scale,
				resolution : resolution.y
			},
			handle_updateTextlabels );
		return;
	}


	/**
	 * handle an update-textlabels-request answer
	 *
	 */
	var handle_updateTextlabels = function( status, text, xml )
	{
		if ( status = 200 )
		{
			//alert( "data: " + text );
			var e = eval( "(" + text + ")" );
			if ( e.error )
			{
				alert( e.error );
			}
			else
			{
				//! remove all old text labels
				while ( textlabels.length > 0 )
				{
					var t = textlabels.pop();
					try		//!< we do not know if it really is in the DOM currently
					{
						view.removeChild( t.getView() );
					}
					catch ( error ) {}
				}

				if ( text )
				{
					//! import the new
					for ( var i in e )
					{
						var t = new Textlabel( e[ i ], resolution, translation );
						textlabels.push( t );
						view.appendChild( t.getView() );
						if ( mode == "text" )
							t.setEditable( true );
					}
				}
			}
			update();
		}
		return;
	}

  /*
  END CONVERT
   */


	var onmousedown = function( e )
	{
    console.log('onmousedown',e);

    var m = ui.getMouse(e);

    var pos_x = self.stack.translation.x + ( self.stack.x + ( m.offsetX - self.stack.viewWidth / 2 ) / self.stack.scale ) * self.stack.resolution.x;
		var pos_y = self.stack.translation.y + ( self.stack.y + ( m.offsetY - self.stack.viewHeight / 2 ) / self.stack.scale ) * self.stack.resolution.y;
    var pos_z = self.stack.z * self.stack.resolution.z + self.stack.translation.z;
    console.log(pos_x, pos_y, pos_z);
    // TODO: x, y are NaN
    /*
    var tlx = (x + (m.offsetX - viewWidth / 2) / scale) * resolution.x + translation.x;
    var tly = (y + (m.offsetY - viewHeight / 2) / scale) * resolution.y + translation.y;
    var tlz = z * resolution.z + translation.z;
    console.log(m,tlx,tly,tlz);
    // project.createTextlabel(tlx, tly, tlz, resolution.y, scale);
    */
		return false;
	};

	/**
	 * install this tool in a stack.
	 * register all GUI control elements and event handlers
	 */
	this.register = function( parentStack )
	{
    setupSubTools();
    self.stack = parentStack;
		self.mouseCatcher.onmousedown = onmousedown;
    self.stack.getView().appendChild( self.mouseCatcher );
    return;
  }

	/**
	 * unregister all stack related mouse and keyboard controls
	 */
	this.unregister = function()
	{
    if ( stack && mouseCatcher.parentNode == stack.getView() )
      stack.getView().removeChild( mouseCatcher );
    return;
	}

	/**
	 * unregister all project related GUI control connections and event
	 * handlers, toggle off tool activity signals (like buttons)
	 */
	this.destroy = function()
	{
		self.unregister();
		// document.getElementById( "edit_button_select" ).className = "button";
		stack = null;
    return;
	};

}
