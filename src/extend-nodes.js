function createNodeDescriptors () {

  return {
  
    anchor_area_form: {

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

    },

    input_button: {

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

    },

    script: {

      'model': {
        get: function () {
          return this.getAttribute('model');
        }
      }
      
    },

    element: {

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

      'bindSkip': {
        get: function () {
          return this.hasAttribute('bindskip');
        },
        set: function (value) {
          if (value === true) {
            this.setAttribute('bindskip', 'bindskip');
          }
          else if (value === false || typeof value === 'undefined') {
            this.removeAttribute('bindskip');
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

    },

    view: {

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
      }

    },

    document: {

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

    }
  
  }

};