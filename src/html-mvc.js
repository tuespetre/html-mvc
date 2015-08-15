/*

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