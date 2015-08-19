// Credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}

function collection (_array) {
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

function data (_object) {
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
            val = val.slice(0);
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

function record (_data) {
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

function merge_record (_old, _new) {
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

function model (_object, _onchange) {
  _object = Object.assign({}, _object);

  var state = { 
    object: _object,
    record: record(data(_object))
  };

  return Object.create(null, {
  
    'object': {
      get: function () {
        return state.object;
      }
    },

    'interface': {
      value: Object.create(null, {
      
        'initialize': {
          value: function (object) {
            state.object = Object.assign({}, object);
            state.record = record(data(state.object));
            
            if (_onchange) _onchange();
          }
        },

        'merge': {
          value: function (object) {
            var _data, _record;

            _data = Object.assign({}, object);
            _record = record(data(_data));
            state.object = Object.assign(state.object, _data);            
            state.record = merge_record(state.record, _record);              
              
            if (_onchange) _onchange();
          }
        },

        'record': {
          value: function () {
            return state.record['interface'];
          }
        }
        
      })
    }

  });
}

function viewCache (appName, appVersion) {
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
        if (!is_view(view)) return;
        _views[name] = view.cloneNode(true);
        localStorage.setItem(key(name), view.outerHTML);
      }
    }

  });
}

function inner_views (element) {
  return select_descendants(element, is_view, not_view);
}

function processBindingAttributes (element) {
  if (element.hasAttribute('bindskip')) {
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

function destructureViewRecursive (view, destructured, recursion, context) {
  // Step 1. Inner views
  var innerViews = inner_views(view);
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

function destructureView (view, viewCache) {
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

function restructureView (name, viewCache) {
  var cached = viewCache.get(name);
  if (!cached) return;
  // Resolve inners
  function resolveInners (view) {
    var descs = inner_views(view);
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

  function resolveOuters (view) {
    var outer = view.outer;
    if (!outer) return true;
    var cached = viewCache.get(outer);
    if (!cached) return false;
    var outersResolved = resolveOuters(cached);
    if (!outersResolved) return false;
    var foundGeneric = false;
    var descs = inner_views(cached);
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

function transition_view (next, current, currentRecord, getRecord) {
  if (next.name != current.name) {
    swap_element(next, current);
    bind_views([ next ], currentRecord, getRecord);
  }
  else {
    var next_descendants    = inner_views(next),
        current_descendants = inner_views(current);
    
    if (next_descendants.length != current_descendants.length) {
      swap_element(next, current);
      bind_views([ next ], currentRecord, getRecord);
    }
    else {
      currentRecord = getRecord(current, currentRecord);
      // Just re-bind this view if necessary but don't
      // bother to collect its inner views again.
      bind_element(current, currentRecord, false);
        
      for (var i = 0; i < current_descendants.length; i++) {
        transition_view(
          next_descendants[i], 
          current_descendants[i],
          currentRecord,
          getRecord);
      }
    }
  }
}

function mvc (services, appName, appVersion) {
  var persistentModels = {},
      transientModels = {},
      cachedViews = viewCache(appName, appVersion),
      anonymous,
      instance,
      internals,
      getRecord,
      transition;
      
  anonymous = model({})['interface'];
  
  getRecord = function (view, currentRecord) {
    var modelName = view.model,
        scopeName = view.scope;
        
    return modelName
      ? this.getModel(modelName).record()
      : currentRecord && scopeName
        ? currentRecord.scope(scopeName)
        : currentRecord;
  };

  instance = Object.create(null, {

    'getModel': {
      value: function (name) {
        if (!name) return;
      
        var _model = 
          transientModels[name] || 
          persistentModels[name];

        if (!_model) {
          _model = persistentModels[name] = model({}, internals.snapshotState);
        }

        return _model['interface'];
      }
    },

    'defineModel': {
      value: function (name, persistent) {
        var modelStore = persistent === true
          ? persistentModels
          : transientModels;

        modelStore[name] = model({}, internals.snapshotState);
      }
    },

    'destructureView': {
      value: function (view) {
        return destructureView(view, cachedViews);
      }
    },

    'restructureView': {
      value: function (name) {
        return restructureView(name, cachedViews);
      }
    },

    'transitionView': {
      value: function (into, from) {
        if (!is_view(into) || !is_view(from)) return;
        transition_view(into, from, anonymous.record(), getRecord.bind(this));
      }
    },
    
    'bindView': {
      value: function (view) {
        bind_views([ view ], anonymous.record(), getRecord.bind(this));
      }
    }

  });

  internals = {
  
    attach: function (window) {
      window.addEventListener('popstate', this.extendHistoryTraversal);
      window.addEventListener('click', this.extendHyperlinkNavigation);
      window.addEventListener('submit', this.extendFormSubmission);
    },
  
    detach: function (window) {
      window.removeEventListener('popstate', this.extendHistoryTraversal);
      window.removeEventListener('click', this.extendHyperlinkNavigation);
      window.removeEventListener('submit', this.extendFormSubmission);
    },
    
    extendHistoryTraversal: function (event) {    
      var state = event.state,
          document = services.document,
          location = services.location,
          models = state.transientModels;

      if (state && state.__fromMvc === true) {
        var targetView = state.targetView,
            currentView = document.currentView,
            restructured = instance.restructureView(targetView);

        if (!restructured || !currentView) {
          location.replace(location.href);
          return;
        }
        else {
          if (typeof models === 'object') {
            transientModels = {};
            for (var name in models) {
              transientModels[name] = model(models[name], internals.snapshotState);
            }
          }
          document.title = state.title;
          instance.transitionView(restructured, currentView);
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    },
    
    extendHyperlinkNavigation: function (event) {
      var history = services.history;
      if (!('pushState' in history)) return;

      var target = event.target,
          name = target.tagName,
          currentView;

      // Handle navigation-causing clicks
      if (name === 'A' || name === 'AREA') {
        event.preventDefault();      
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
    },
    
    extendFormSubmission: function (event) {
      var location = services.location;
      var history = services.history;
      
      if (!('pushState' in history)) return;

      var target = event.target,
          name = target.tagName,
          currentView;

      if (name === 'FORM') {
        var submitter = target.__triggeringElement,
            view = submitter ? submitter.formview || target.view : target.view,
            model = submitter ? submitter.formmodel || target.model : target.model,
            action = (submitter ? submitter.formaction || target.action : target.action) || location.href,
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
        
        event.preventDefault();
        transition(
          action,
          null,
          view,
          model,
          method,
          sendRequest);
      }
    },
    
    snapshotState: function () {
      if (!history.state || !history.state.__fromMvc) return;

      var stashedModels = {};
      
      for (var name in transientModels) {
        stashedModels[name] = transientModels[name].object;
      }
      
      var snapshot = {
        targetView: history.state.targetView,
        title: history.state.title,
        transientModels: stashedModels,
        __fromMvc: true,
        __snapshot: true
      };
      
      history.replaceState(snapshot, null);
    }  
  
  };
  
  transition = function (href, title, targetView, targetModel, method, sendRequest) {
    var location = services.location;
    var history = services.history;
    var document = services.document;
    
    function fallback() {
      location.assign(href);
    }
    
    function transition(restructuredView, currentView, newTransientModels) {
      var state = {
        targetView: targetView,
        title: title || document.title,
        __fromMvc: true
      };
      
      history.pushState(state, state.title, href);      
      transientModels = {};
      for (var name in newTransientModels) {
        var newModel = newTransientModels[name];
        instance.defineModel(name, newModel.persistent);
        var model = instance.getModel(name);
        model.initialize(newModel.object);
      }
      document.title = state.title;
      instance.transitionView(restructuredView, currentView);
      internals.snapshotState();
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
        
        transition(restructuredView, currentView, result);
      }
      req.onerror = function() {
        return fallback();
      }
      if (sendRequest) sendRequest(req);
      else return fallback();
    }
    else {
      transition(restructuredView, currentView, {});
    }

  }

  return {
    instance: instance,
    internals: internals
  };
}
