function booleanAttributeDescriptor (name) {
  return {
    get: function () {
      return this.hasAttribute(name);
    },
    set: function (value) {
      if (value === true) {
        this.setAttribute(name, '');
      }
      else if (value === false || typeof value === 'undefined') {
        this.removeAttribute(name);
      }
    }
  };
};

function stringAttributeDescriptor (name) {
  return {
    get: function () {
      return this.getAttribute(name);
    },
    set: function (value) {
      if (typeof value === 'undefined') {
        this.removeAttribute(name);
      }
      else {
        this.setAttribute(name, value);
      }
    }
  };
};

function createNodeDescriptors () {

  return {
  
    anchor_area_form: {

      'view': stringAttributeDescriptor('view'),

      'model': stringAttributeDescriptor('model')

    },

    input_button: {

      'formview': stringAttributeDescriptor('formview'),

      'formmodel': stringAttributeDescriptor('formmodel')

    },

    script: {

      'model': stringAttributeDescriptor('model'),
      
      'persistent': booleanAttributeDescriptor('persistent')
      
    },

    element: {

      'bindText': stringAttributeDescriptor('bindtext'),

      'bindHtml': stringAttributeDescriptor('bindhtml'),
      
      'bindCount': stringAttributeDescriptor('bindcount'),
      
      'bindSome': stringAttributeDescriptor('bindsome'),
      
      'bindNone': stringAttributeDescriptor('bindnone'),

      'bindSkip': booleanAttributeDescriptor('bindskip'),

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

      'name': stringAttributeDescriptor('name'),

      'outer': stringAttributeDescriptor('outer'),

      'model': stringAttributeDescriptor('model'),

      'scope': stringAttributeDescriptor('scope')

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
  
  };

};