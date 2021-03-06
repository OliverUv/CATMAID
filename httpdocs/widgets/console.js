/* -*- mode: espresso; espresso-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */

function Console() {
  var view = document.createElement("div");
  view.className = "console";
  view.style.height = "35px";
  view.appendChild(document.createElement("pre"));

  var coords = document.createElement("div");
  coords.id = "coordinates";
  coords.style.position = 'absolute';
  coords.style.right = '5px';
  coords.style.fontFamily = "Courier; Sans-serif;";
  coords.style.fontSize = "15px";
  coords.style.marginTop="10px";
  coords.style.marginRight="8px";
  coords.appendChild(document.createTextNode(""));
  view.appendChild(coords);
  
  this.printCoords = function (obj) {
    coords.replaceChild(document.createTextNode(obj), coords.firstChild);
  }

  var toStr = function (obj, ins) {
    if (typeof ins == "undefined") ins = "";

    var type = typeof(obj);
    var str = "[" + type + "] ";

    switch (type) {
    case "function":
    case "object":
      if (ins.length <= 6) {
        str += "\r\n";
        for (var key in obj) {
          str += ins + "\"" + key + "\" => " + toStr(obj[key], ins + "  ") + "\r\n";
        }
      } else str += "..."
      break;
    case "undefined":
      break;
    default:
      str += obj;
      break;
    }
    return str;
  }

  this.setBottom = function() {
    view.style.bottom = "0px";
  }

  this.print = function (obj) {
    if (typeof obj == "string") view.lastChild.appendChild(document.createTextNode(obj));
    else
    view.lastChild.appendChild(document.createTextNode(toStr(obj)));
    return;
  }

  this.println = function (obj) {
    var sp = document.createElement("pre");
    if (typeof obj == "string") sp.appendChild(document.createTextNode(obj));
    else
    sp.appendChild(document.createTextNode(toStr(obj)));
    view.appendChild(sp);
    return;
  }

  this.replaceLast = function (obj) {
    var sp = document.createElement("pre");
    if (typeof obj == "string")
      sp.appendChild(document.createTextNode(obj));
    else
      sp.appendChild(document.createTextNode(toStr(obj)));
    view.replaceChild(sp, view.firstChild);
    return;
  }

  this.replaceLastHTML = function (html) {
    var e = document.createElement("pre");
    e.innerHTML = html;
    view.replaceChild(e, view.firstChild);
  }

  this.getView = function () {
    return view;
  }
}
