var anchor_area_form_descriptors = {

  'view': {
    get: function () {
      return this.getAttribute('view');
    },
    set: function (value) {
      return this.setAttribute('view', value);
    }
  },

  'model': {
    get: function () {
      return this.getAttribute('model');
    },
    set: function (value) {
      return this.setAttribute('model', value);
    }
  }

};

var input_button_descriptors = {

  'formview': {
    get: function () {
      return this.getAttribute('formview');
    },
    set: function (value) {
      return this.setAttribute('view', value);
    }
  },

  'formmodel': {
    get: function () {
      return this.getAttribute('formmodel');
    },
    set: function (value) {
      return this.setAttribute('model', value);
    }
  }

};

var script_descriptors = {

  'model': {
    get: function () {
      return this.getAttribute('model');
    }
  }
  
};

var element_descriptors = {

  'bindText': {
    get: function () {
      return this.getAttribute('bindtext');
    },
    set: function (value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('bindtext');
      }
      else {
        this.setAttribute('bindtext', value);
      }
    }
  },

  'bindHtml': {
    get: function () {
      return this.getAttribute('bindhtml');
    },
    set: function (value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('bindhtml');
      }
      else {
        this.setAttribute('bindhtml', value);
      }
    }
  },

  'bindEach': {
    get: function () {
      return this.getAttribute('bindeach');
    },
    set: function (value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('bindeach');
      }
      else {
        this.setAttribute('bindeach', value);
      }
    }
  },

  'bindNone': {
    get: function () {
      return this.hasAttribute('bindnone');
    },
    set: function (value) {
      if (value === true) {
        this.setAttribute('bindnone', 'bindnone');
      }
      else if (value === false || typeof value === 'undefined') {
        this.removeAttribute('bindnone');
      }
    }
  },

  'bindChildren': {
    get: function () {
      var bindChildren = parseInt(this.getAttribute('bindchildren'));
      return isNaN(bindChildren) || bindChildren < 0 ? Infinity : bindChildren;
    },
    set: function (value) {
      if (isNaN(value)) {
        throw new TypeError('bindChildren must be a number');
      }
      this.setAttribute('bindchildren', value);
    }
  }

};

var view_descriptors = {

  'name': {
    get: function () {
      return this.getAttribute('name');
    },
    set: function(value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('name');
      }
      else {
        this.setAttribute('name', value);
      }
    }
  },

  'outer': {
    get: function () {
      return this.getAttribute('outer');
    },
    set: function(value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('outer');
      }
      else {
        this.setAttribute('outer', value);
      }
    }
  },

  'model': {
    get: function () {
      return this.getAttribute('model');
    },
    set: function(value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('model');
      }
      else {
        this.setAttribute('model', value);
      }
    }
  },

  'scope': {
    get: function () {
      return this.getAttribute('scope');
    },
    set: function(value) {
      if (typeof value === 'undefined') {
        this.removeAttribute('scope');
      }
      else {
        this.setAttribute('scope', value);
      }
    }
  },

  'bind': {
    value: function (record) {
      function bind(element, record) {
        if (!record || element.bindNone) return;
        var bindHidden = element.getAttribute('bindattr-hidden');
        if (bindHidden !== null) {
          var val = record.value(bindHidden);
          if (val === false || typeof val === 'undefined') {
            element.removeAttribute('hidden');
          }
          else {
            element.setAttribute('hidden', val);
          }
        }
        if (element.hidden) return;

        var skipNonView = element.tagName === 'VIEW' && record === element.boundRecord;
        var bindAttrPattern = element.tagName === 'VIEW'
          ? /^\s*bindattr-((?!bindattr|(bindeach|bindtext|bindhtml|bindnone|model|scope|outer|name)\s*$)[A-Za-z0-9_-]+)\s*$/
          : /^\s*bindattr-((?!bindattr|(bindeach|bindtext|bindhtml|bindnone)\s*$)[A-Za-z0-9_-]+)\s*$/;
          
        function setControlValue(element, attrname, value) {
          // Should probably do some further writing and assessment
          // About how forms and their controls are to be handled.
          // Only want to work with attribute names, NOT IDL names
          // (looking at you, React.)
          if (typeof value === 'undefined') value = null;
          
          if (attrname === 'value' && 'value' in element) {
            element.value = value;
          }
          else if (attrname === 'checked' && 'checked' in element) {
            element.checked = new Boolean(value);
          }
        }

        for (var i = 0; i < element.attributes.length; i++) {
          var attr = element.attributes[i];
          var match = bindAttrPattern.exec(attr.name);
          if (!match) continue;
          var name = match[1];
          var val = record.value(attr.value);
          
          if (val === true) {
            element.setAttribute(name, '');
          }
          else if (val === false || typeof val === 'undefined') {
            element.removeAttribute(name);
          }
          else {
            element.setAttribute(name, val);
          }
          
          setControlValue(element, name, val);
        }

        var bindText, bindHtml, bindEach;

        element.boundRecord = record;
        if (bindText = element.bindText) {
          element.textContent = record.value(bindText);
        }
        else if (bindHtml = element.bindHtml) {
          element.innerHTML = record.value(bindHtml);
        }
        else if (bindEach = element.bindEach) {
          var slice = element.bindChildren;
          if (slice === Infinity || slice === 0) return;
          var collection = record.collection(bindEach);
          var childrenLength = element.children.length;
          if (childrenLength === 0) return;
          var surpassedChildren = false;
          var sample = [];

          record_loop:
            for (var i = 0; i < collection.length; i++) {
              var record = collection[i];

              slice_loop:
                for (var j = 0; j < slice; j++) {
                  var insert = false,
                      child = element.children[(i * slice) + j],
                      original = child;

                  if (child && i < slice) {
                    sample[j] = child.cloneNode(true);
                  }
                  else if (!child) {
                    child = sample[j];
                    if (!child) break record_loop;
                    child = child.cloneNode(true);
                    insert = true;
                  }

                  bind(child, record);

                  if (insert) {
                    var nextElem;
                    if (original && (nextElem = original.nextElementSibling))
                      element.insertBefore(child, nextElem);
                    else
                      element.appendChild(child);
                  }
                }
            }

          while (element.children.length > collection.length * slice) {
            element.removeChild(element.lastChild);
          }
        }
        else if (skipNonView) {
          var descs = findL1Descendants(element);
          for (var i = 0; i < descs.length; i++) {
            var child = descs[i];
            var modelName = child.model,
                bindRecord = modelName
                  ? document.mvc.getModel(modelName).record()
                  : child.scope
                    ? record.scope(child.scope)
                    : record;
                    
            bind(child, bindRecord);
          }
        }
        else {
          var child = element.children[0];
          if (!child) return;
          do {
            if (child.tagName === 'VIEW') {
              var modelName = child.model,
                  bindRecord = modelName
                    ? document.mvc.getModel(modelName).record()
                    : child.scope
                      ? record.scope(child.scope)
                      : record;
                      
              bind(child, bindRecord);
            }
            else {
              bind(child, record);
            }
          } while (child = child.nextElementSibling);
        }
      };
      
      bind(this, record);
    }
  }

};

var document_descriptors = {

  'mvc': {
    get: function () {
      if (!this.__mvcInstance) {
        var name = this.head.querySelector('meta[name=application-name]');
        var version = this.head.querySelector('meta[name=application-version]');
        name && (name = name.content);
        version && (version = version.content);
        this.__mvcInstance = mvc(name, version);
      }
      return this.__mvcInstance;
    }
  },

  'currentView': {
    get: function () {
      var child = this.body.firstChild;
      if (!child) return;
      do {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'VIEW') {
          return child;
        }
      } while (child = child.nextSibling);
    }
  }

};

Object.defineProperties(HTMLAnchorElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLAreaElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLFormElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLInputElement.prototype, input_button_descriptors);  
Object.defineProperties(HTMLButtonElement.prototype, input_button_descriptors);
Object.defineProperties(HTMLScriptElement.prototype, script_descriptors);
Object.defineProperties(HTMLElement.prototype, element_descriptors);
Object.defineProperties(HTMLUnknownElement.prototype, view_descriptors);
Object.defineProperties(HTMLDocument.prototype, document_descriptors);