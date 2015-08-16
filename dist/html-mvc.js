(function(window, document, history){/*

Requires:
- pushState
- FormData
- xhr.send(FormData)

*/

function collection(_array) {
  _array = _array.slice(0);
  var _records = null,
      _interface = Object.create(null, {
        'items': {
          get: function () {
            return _records.map(function (r) {
              return r['interface'];
            });
          }
        }
      });

  return Object.create(null, {

    'array': {
      get: function () {
        return _array;
      }
    },

    'records': {
      get: function () {
        return _records;
      }
    },

    'initialize': {
      value: function () {
        _records = [];
        for (var i = 0; i < _array.length; i++) {
          _records[i] = record(data(_array[i]));
        }
      }
    },

    'interface': {
      get: function () {
        if (_records === null) {
          this.initialize();
        }
        return _interface;
      }
    }

  });
}

function data(_object) {
  var _scopes = {},
      _collections = {},
      _values = {};

  if (typeof _object === 'object' && !(_object instanceof Array)) {
    var validIdentifierRegex = /^[A-Za-z0-9_]+$/;
    var names = Object.getOwnPropertyNames(_object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!validIdentifierRegex.exec(name)) continue;
      var val = _object[name];
      if (val === null) continue;
      switch (typeof val) {
        case 'string':
        case 'number':
        case 'boolean':
          _values[name] = val;
          continue;
        case 'object':
          if (val instanceof Array) {
            _collections[name] = collection(val);
          }
          else {
            var child = data(val);
            _scopes[name] = child;
            for (var scopeName in child.scopes) {
              var _scope = child.scopes[scopeName];
              _scopes[name + '.' + scopeName] = child.scopes[scopeName];
              for (var valueName in _scope.values) {
                _values[name + '.' + valueName] = _scope.values[valueName];
              }
            }
            for (var valueName in child.values) {
              _values[name + '.' + valueName] = child.values[valueName];
            }
            for (var collectionName in child.collections) {
              _collections[name + '.' + collectionName] = child.values[collectionName];
            }
          }
          continue;
        case 'function':
        case 'undefined':
        default:
          continue;
      }
    }
  }

  return {
    scopes: _scopes,
    collections: _collections,
    values: _values
  };
}

function record(_data) {
  var _scopes = {};

  return Object.create(null, {

    'values': {
      value: _data.values
    },

    'scopes': {
      value: _scopes
    },

    'collections': {
      value: _data.collections
    },

    'interface': {
      value: Object.create(null, {

        'value': {
          value: function (expr) {
            return _data.values[expr];
          }
        },

        'scope': {
          value: function (expr) {
            var scope = _scopes[expr];
            if (!scope) {
              var scopeData = _data.scopes[expr] || data({});
              scope = record(scopeData);
              _scopes[expr] = scope;
            }
            return scope['interface'];
          }
        },

        'collection': {
          value: function (expr) {
            var collection = _data.collections[expr];
            return collection ? collection['interface'].items : [];
          }
        }

      })
    }

  });
}

function merge(_old, _new) {
  for (var value in _old.values) {
    if (!(value in _new.values)) {
      _new.values[value] = _old.values[value];
    }
  }

  for (var scopeName in _old.scopes) {
    if (!(scopeName in _new.scopes)) {
      _new.scopes[scopeName] = _old.scopes[scopeName];
    }
  }

  for (var collectionName in _old.collections) {
    var _newEach = _new.collections[collectionName],
        _oldEach = _old.collections[collectionName];

    if (typeof _newEach === 'undefined') {
      _newEach = _new.collections[collectionName] = _oldEach;
    }

    if (_oldEach.records != null) {
      _newEach.initialize();
      var _records = _oldEach.records.slice(0);
      _records.splice(0, 0, 0, 0);
      Array.prototype.splice.apply(_newEach.records, _records);
    }

    var _array = _oldEach.array.slice(0);
    _array.splice(0, 0, 0, 0);
    Array.prototype.splice.apply(_newEach.array, _array);
  }

  return _new;
}

function model(_record) {
  var state = { record: _record };

  return Object.create(null, {

    'initialize': {
      value: function (object) {
        state.record = record(data(object));
      }
    },

    'merge': {
      value: function (object) {
        state.record = merge(state.record, record(data(object)));
      }
    },

    'record': {
      value: function () {
        return state.record['interface'];
      }
    }

  });
}

function modelStore() {
  var _models = {};

  return Object.create(null, {

    'getModel': {
      value: function (name) {
        if (typeof name !== 'string' || !name) return;
        if (_models[name]) return _models[name];
        _models[name] = model(record(data({})));
        return _models[name];
      }
    },

    'defineModel': {
      value: function (name) {
        if (typeof name === 'string' && name) {
          _models[name] = model(record(data({})));
        }
      }
    }

  });
}

function viewCache(appName, appVersion) {
  var _views = {};
  // TODO: Use template string or something, it just doesn't 'feel right'
  var _keyPrefix = 'htmlmvc|views|' + 
    (appName || 'undefined').toString() + '|' + 
    (appVersion || '0').toString() + '|';

  function key(name) {
    return _keyPrefix + name;
  }

  return Object.create(null, {

    'get': {
      value: function (name) {
        var cached = _views[name];
        if (!cached) {
          var str = localStorage.getItem(key(name));
          if (str) {
            var temp = document.createElement('div');
            temp.innerHTML = str;
            cached = temp.firstChild;
            _views[name] = cached;
          }
        }
        cached && (cached = cached.cloneNode(true));
        return cached;
      }
    },

    'set': {
      value: function (name, view) {
        if (!(view instanceof HTMLElement) || view.tagName !== 'VIEW') return;
        _views[name] = view.cloneNode(true);
        localStorage.setItem(key(name), view.outerHTML);
      }
    }

  });
}

function findL1Descendants(element) {
  var descs = [];
  var child = element.children[0];
  if (!child) return descs;
  do {
    if (child.tagName === 'VIEW') {
      descs.push(child);
    }
    else {
      descs = descs.concat(findL1Descendants(child));
    }
  } while (child = child.nextElementSibling);
  return descs;
}

function processBindingAttributes(element) {
  if (element.hasAttribute('bindnone')) {
    return;
  }
  else if (element.hasAttribute('bindtext') || element.hasAttribute('bindhtml')) {
    element.innerHTML = '';
  }
  else if (element.hasAttribute('bindchildren')) {
    var bindChildren = element.bindChildren;

    if (bindChildren === Infinity || isNaN(bindChildren)) {
      for (var i = 0; i < element.children.length; i++) {
        processBindingAttributes(element.children[i]);
      }
    }
    else if (bindChildren > 0) {
      var child = element.children[bindChildren - 1];
      if (!child) return;
      while (child != element.lastChild) element.removeChild(element.lastChild);
      for (var i = 0; i < element.children.length; i++) {
        processBindingAttributes(element.children[i]);
      }
    }
    else if (bindChildren === 0) {
      element.innerHTML = '';
    }
  }
  else {
    for (var i = 0; i < element.children.length; i++) {
      processBindingAttributes(element.children[i]);
    }
  }
}

function destructureViewRecursive(view, destructured, recursion, context) {
  // Step 1. Inner views
  var innerViews = findL1Descendants(view);
  // Step 2.
  if (!innerViews.length) return true;
  // Step 3.
  recursion = recursion.slice(0);
  // Step 4.
  var foundInnerDependent = false;
  // Step 5.
  for (var i = 0; i < innerViews.length; i++) {
    var innerView = innerViews[i];
    // Step i.
    var name = innerView.name;
    // Step ii.
    if (!name) return false;
    // Step iii.
    if (recursion.indexOf(name) !== -1) return false;
    // Step iv.
    var isDependent = false, outer = innerView.outer;
    // Step v.
    if (outer && outer != view.name) return false;
    // Step vi.
    if (outer) isDependent = true;
    // Step vii.
    if (isDependent && (foundInnerDependent || !context.resolvingOuterPath)) 
      return false;
    else
      foundInnerDependent = true;
    // Step viii.
    var marker = document.createElement('view');
    // Step ix.
    marker.setAttribute('name', name);
    // Step x.
    if (innerView.hasAttribute('scope'))
      marker.setAttribute('scope', innerView.getAttribute('scope'));
    // Step xi.
    if (isDependent) {
      marker.setAttribute('outer', innerView.outer);
      context.targetView = innerView.name;
    }
    else {
      context.targetView = undefined;
    }
    // Step xii.
    innerView.parentNode.replaceChild(marker, innerView);
    // Step xiii.
    if (!(name in destructured)) {
      innerView.removeAttribute('scope');
      destructured[name] = innerView;
      var subContext = {
        resolvingOuterPath: isDependent
      };
      var result = destructureViewRecursive(innerView, destructured, recursion, subContext);
      if (result !== true) return false;
    }
  }
  // Step 6.
  return true;
}

function destructureView(view, viewCache) {
  if (!(view instanceof HTMLElement) || view.tagName !== 'VIEW') return false;
  var name = view.name;
  if (!name) return false;
  if (view.outer) return false;
  view = view.cloneNode(true);
  processBindingAttributes(view);
  var destructuredViews = {};
  destructuredViews[name] = view;
  var recursionGuard = [];
  recursionGuard.push(name);
  var context = { 
    targetView: name, 
    resolvingOuterPath: true 
  };
  var destructuredView = destructureViewRecursive(
    view, destructuredViews, recursionGuard, context);
  if (destructuredView !== true) return false;
  for (var name in destructuredViews) {
    var destructured = destructuredViews[name];
    viewCache.set(name, destructured);
  }
  return context.targetView;
}

function restructureView(name, viewCache) {
  var cached = viewCache.get(name);
  if (!cached) return;
  // Resolve inners
  function resolveInners(view) {
    var descs = findL1Descendants(view);
    for (var i = 0; i < descs.length; i++) {
      var inner = descs[i];
      var cached = viewCache.get(inner.name);
      if (!cached) return false;
      if (cached.outer) return false;
      cached.setAttribute('scope', inner.getAttribute('scope'));
      inner.parentNode.replaceChild(cached, inner);
      if (!resolveInners(cached)) return false;
    }
    return true;
  };

  function resolveOuters(view) {
    var outer = view.outer;
    if (!outer) return true;
    var cached = viewCache.get(outer);
    if (!cached) return false;
    var outersResolved = resolveOuters(cached);
    if (!outersResolved) return false;
    var foundGeneric = false;
    var descs = findL1Descendants(cached);
    for (var i = 0; i < descs.length; i++) {
      var inner = descs[i];
      var innerOuter = inner.outer;
      if (innerOuter) {
        if (innerOuter != cached.name || foundGeneric) return false;
        else inner.parentNode.replaceChild(view, inner);
        foundGeneric = true;
      }
      else {
        var cached = viewCache.get(inner.name);
        if (!cached || !resolveInners(cached)) return false;
        cached.setAttribute('scope', inner.getAttribute('scope'));
        inner.parentNode.replaceChild(cached, inner);
      }
    }
    return true;
  }

  if (resolveInners(cached) && resolveOuters(cached)) {
    var result = cached;
    while (result.parentNode) result = result.parentNode
    // resolveOuters can fail due to view supplantment
    if (cached.outer && result.name !== cached.outer) return;
    return result;
  }
}

function transitionView(next, current) {
  var isValid = function (obj) {
    return obj instanceof HTMLElement && obj.tagName === 'VIEW';
  }
  if (!isValid(next) || !isValid(current)) return;
  function swap(next, current) {
    current.parentNode.replaceChild(next, current);
  }
  function transitionImpl(next, current) {
    if (next.name != current.name) {
      swap(next, current);
      return;
    }
    var descs_next = findL1Descendants(next);
    var descs_curr = findL1Descendants(current);
    if (descs_next.length != descs_curr.length) {
      swap(next, current);
      return;
    }
    for (var i = 0; i < descs_curr.length; i++) {
      var desc_n = descs_next[i],
          desc_c = descs_curr[i];

      if (desc_n.name != desc_c.name) {
        swap(desc_n, desc_c);
      }
      else {
        transitionImpl(desc_n, desc_c);
      }
    }
  }
  transitionImpl(next, current);
}

function mvc(appName, appVersion) {
  var persistentModels = modelStore(),
      transientModels = modelStore(),
      cachedViews = viewCache(appName, appVersion);
      
  var anonymous = model(record(data({})));

  var instance = Object.create(null, {
  
    'anonymousModel': {
      value: function() {
        return anonymous;
      }
    },

    'getModel': {
      value: function(name) {
        return transientModels.getModel(name)
            || persistentModels.getModel(name);
      }
    },

    'defineModel': {
      value: function(name, persistent) {
        var modelStore = persistent === true
          ? persistentModels
          : transientModels;

        modelStore.defineModel(name);
      }
    },

    'destructureView': {
      value: function(view) {
        return destructureView(view, cachedViews);
      }
    },

    'restructureView': {
      value: function(name) {
        return restructureView(name, cachedViews);
      }
    },

    'transitionView': {
      value: transitionView
    },

  });

  return instance;
}

function transition(href, title, targetView, targetModel, method, sendRequest) {
  function fallback() {
    window.location.href = href;
  }
  
  function transition(restructuredView, currentView) {   
    document.mvc.transitionView(restructuredView, currentView);
    var state = {
      targetView: targetView,
      title: title || document.title,
      __fromMvc: true
    };
    history.pushState(state, state.title, href);
    document.title = state.title;
    
    var modelName = currentView.model,
        record = modelName 
          ? document.mvc.getModel(modelName).record() 
          : document.mvc.anonymousModel().record();
      
    document.currentView.bind(record);
  }
  
  var currentView = document.currentView;
  if (!currentView) return fallback();
  
  var restructuredView = document.mvc.restructureView(targetView);
  if (!restructuredView) return fallback();

  if (targetModel) {      
    var req = new XMLHttpRequest();
    req.open(method, href);
    req.setRequestHeader('Accept', 'multipart/json');
    req.onload = function() {
      if (req.status < 200 || req.status > 299) return fallback();
      
      var type = req.getResponseHeader('Content-Type');
      var result = parseMultipartJsonResponse(type, req.responseText);
      
      if (!result[targetModel]) return fallback();
      
      for (var name in result) {
        var model = document.mvc.getModel(name);
        model.initialize(result[name]);
      }
      
      transition(restructuredView, currentView);
    }
    req.onerror = function() {
      return fallback();
    }
    if (sendRequest) sendRequest(req);
    else return fallback();
  }
  else {
    transition(restructuredView, currentView);
  }
}
// TODO: Implement actual compliant parsing algorithm
function parseContentTypeHeader(header) {
  var unquotedSemicolon = /(?!\\);/,
      matches = header.split(unquotedSemicolon),
      parameters = {};
      
  for (var i = 1; i < matches.length; i++) {
    var param = matches[i].split(/(?!\\)=/);
    var name = param[0].trim();
    if (param[1]) {
      var unquoted = param[1].replace(/(\\)?"/g, function($0, $1) { return $1 ? $0 : '' });
      parameters[name] = unquoted.trim();
    }
    else {
      parameters[name] = param[1].trim();
    }
  }
  
  return {
    type: matches[0],
    parameters: parameters
  };
}

// TODO: Implement actual compliant parsing algorithm
function parseMultipartResponseBoundary(contentType) {
  var matches = /^\s*multipart\/json;((.*?);?)boundary="?(.+?)"?(;|$)/.exec(contentType);
  
  if (matches) {
    return matches[3];
  }
}


// TODO: Implement actual compliant parsing algorithm, generators would be nice for this
function parseMultipartResponseParts(body, boundary) {
  var splitted = body.split('--' + boundary);
  var parts = [];
  for (var i = 0; i < splitted.length; i++) {
    var part = splitted[i].trim();
    if (part !== '--' && part !== '') {
      parts.push(part);
    }
  }
  return parts;
}

function parseHeaderSection(header) {
  var headerPattern = /\s*([A-Za-z_-]+)\s*:\s*(.*)$/,
      rawHeaders = header.split('\r\n'),
      headers = {};
      
  for (var i = 0; i < rawHeaders.length; i++) {
    var matches = headerPattern.exec(rawHeaders[i]);
    if (!matches) continue;
    var name = matches[1].trim();
    var value = matches[2].trim();
    headers[name] = value;
  }
  
  return headers;
}

function parseMultipartResponsePart(part) {
  var splitMessage = part.split('\r\n\r\n'),
      header = splitMessage[0], 
      body = splitMessage[1];
  
  return {
    headers: parseHeaderSection(header),
    body: body
  }
}

// Naivety central, yo
function parseMultipartJsonResponse(contentType, body) {
  var boundary = parseMultipartResponseBoundary(contentType),
      parts = parseMultipartResponseParts(body, boundary),
      models = {};
  
  gather_models:
    for (var i = 0; i < parts.length; i++) {
      var part = parseMultipartResponsePart(parts[i]);
      if (!part.body) continue gather_models;
      var contentType = part.headers['Content-Type'];
      if (!contentType) continue gather_models;
      var header = parseContentTypeHeader(contentType);
      var model = header.parameters['model'];
      if (!model) continue gather_models;
      try {
        models[model] = JSON.parse(part.body);
      } catch(err) {}
    }
    
  return models;
}
function constructFormDataSet(form, submitter) {
  function datalistAncestor(elem) {
    var suspect = elem;
    while (suspect = suspect.parentNode) {
      if (suspect.tagName === 'DATALIST') 
        return true;
    }
    return false;
  }

  // HTML 5 specification (attempting to be compliant-ish)
  // 4.10.22.4 Constructing the form data set
  // Step 1
  var elems = [];
  var submittable = ['BUTTON', 'INPUT', 'KEYGEN', 'OBJECT', 'SELECT', 'TEXTAREA'];
  for (var i = 0; i < form.elements.length; i++) {
    var elem = form.elements[i];
    if (submittable.indexOf(elem.tagName) == -1) continue;
    elems.push(elem);
  }
  // Step 2
  var formDataSet = [];
  // Step 3
  for (var i = 0; i < elems.length; i++) {
    var field = elems[i];
    // Step 1
    if (
      datalistAncestor(field) ||
      field.disabled ||
      (field.tagName === 'BUTTON' && submitter && field !== submitter) ||
      (field.type === 'checkbox' && !field.checked) ||
      (field.type === 'radio' && !field.checked) ||
      (field.type === 'image' && !field.getAttribute('name'))
      // Can't really check if object is using plugin?
    ) {
      continue;
    }
    // Step 2
    var type = field.type;
    // Step 3
    // Can't really get coords?
    // Step 4
    var name = field.name;
    // Step 5
    if (field.tagName === 'SELECT') {
      for (var j = 0; j < field.options.length; j++) {
        var option = field.options[i];
        if (option.selected) formDataSet.push({
          name: name,
          type: type,
          value: option.value
        });
      }
    }
      // Step 6
    else if (field.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
      formDataSet.push({
        name: name,
        type: type,
        value: field.hasAttribute('value') ? field.getAttribute('value') : 'on'
      });
    }
      // Step 7
    else if (field.tagName === 'INPUT' && field.type === 'file') {
      var files = field.files;
      if (!files || files.length === 0) {
        formDataSet.push({
          name: name,
          type: 'application/octet-stream',
          value: ''
        });
      }
      else {
        for (var j = 0; j < files.length; j++) {
          formDataSet.push({
            name: name,
            type: type,
            value: files[j]
          })
        }
      }
    }
      // Step 8
      // More <object> stuff
      // Step 9
    else {
      formDataSet.push({
        name: name,
        type: type,
        value: field.value
      });
    }
    // Step 10
    // This can be done later
  }
  // Step 4
  // newline replacement
  // Step 5
  return formDataSet;
}

function urlEncodeFormData(data) {  
  var result = '';
  for (var i = 0; i < data.length; i++) {
    var datum = data[i];
    var name = datum.name;
    var value = datum.type === 'file' ? datum.value.name : datum.value;
    if (i > 0) result += '&';
    result += encodeURIComponent(name) + '=' + encodeURIComponent(value);
  }
  return result;
}
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
// This also does some stuff with form submitting elements
function extendHyperlinkNavigation(e) {
  if (!('pushState' in history)) return;

  var target = e.target,
      name = target.tagName,
      currentView;

  // Handle navigation-causing clicks
  if (name === 'A' || name === 'AREA') {
    e.preventDefault();      
    transition(
      target.href,
      target.title,
      target.view,
      target.model,
      'GET',
      function(req) {
        req.send();
      });
  }
  // Handle submission-causing clicks
  else if (
    (name === 'INPUT' && (target.type === 'submit' || target.type === 'image')) ||
    (name === 'BUTTON' && (target.type === 'submit'))
  ) {
    if (!target.form) return;
    target.form.__triggeringElement = target;
  }
};

function extendFormSubmission(e) {
  if (!('pushState' in history)) return;

  var target = e.target,
      name = target.tagName,
      currentView;

  if (name === 'FORM') {
    var submitter = target.__triggeringElement,
        view = submitter ? submitter.formview || target.view : target.view,
        model = submitter ? submitter.formmodel || target.model : target.model,
        action = (submitter ? submitter.formaction || target.action : target.action) || window.location.href,
        enctype = submitter ? submitter.formenctype || target.enctype : target.enctype,
        _target = submitter ? submitter.formtarget || target.target : target.target,
        method = submitter ? submitter.formmethod || target.method : target.method;

    if (!view || (_target && _target !== '_self')) return;
    
    var sendRequest = function(req) {
      var data = new FormData(target);
      if (submitter) {
        data.append(submitter.name, submitter.value);
      }
      req.send(data);
    }
    
    if (method === 'get') {
      var data = constructFormDataSet(target, submitter);
      action = new URL(action);
      action.search = urlEncodeFormDataSet(data);
      sendRequest = function(req) { 
        req.send(); 
      };
    }
    
    e.preventDefault();
    transition(
      action,
      null,
      view,
      model,
      method,
      sendRequest);
  }
};

function extendHistoryTraversal(e) {
  var state = e.state;

  if (state && state.__fromMvc === true) {
    var targetView = state.targetView,
        currentView = document.currentView,
        restructured = document.mvc.restructureView(targetView);

    if (!restructured || !currentView) {
      location.replace(location.href);
      return;
    }
    else {
      document.title = state.title;
      document.mvc.transitionView(restructured, currentView);
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
};

function initializeMvc() {
  
  var instance = document.mvc;
  
  // Register any declared models
  (function modelRegistration() {
    var models = document.querySelectorAll('script[type="application/json"][model]');
    for (var i = 0; i < models.length; i++) {
      var script = models[i];
      var name = script.model;
      if (name) {
        try {
          var result = JSON.parse(script.textContent);
          instance.defineModel(name, true);
          var model = instance.getModel(name);
          model.initialize(result);
        } catch (err) { }
      }
    }
  })();

  // Find existing current view, if any, and destructure/cache it
  (function viewCaching() {
    var currentView = document.currentView;
    if (!currentView) return;
    var name = instance.destructureView(currentView);
    var state = {
      targetView: name,
      title: document.title,
      __fromMvc: true
    };
    history.replaceState(state, document.title, location.href);
  })();
  
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

window.addEventListener('DOMContentLoaded', initializeMvc);
window.addEventListener('click', extendHyperlinkNavigation);
window.addEventListener('submit', extendFormSubmission);
window.addEventListener('popstate', extendHistoryTraversal);})(window, document, history);