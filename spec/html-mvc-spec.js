var _elem = function (tagName) {
  return document.createElement(tagName);
};

var _location = function (href) {
  return Object.create(null, {
    '_url': {
      writable: true,
      value: new URL(href)
    },
    'assign': {
      value: function (href) {
        this._url = new URL(href);
      }
    },
    'pathname': {
      get: function () {
        return this._url.pathname;
      }
    }
  });
};

describe('multipart/json parsing', function () {

  it('should parse content type headers with quotes', function () {
    var unquotedHeader = 'application/json; model="my-model"';
    var result = parseContentTypeHeader(unquotedHeader);
    expect(result.type).toBe('application/json');
    expect(result.parameters['model']).toBeDefined();
    expect(result.parameters['model']).toBe('my-model');
  });

  it('should parse content type headers without quotes', function () {
    var quotedHeader = 'application/json;model=my-model';
    var result = parseContentTypeHeader(quotedHeader);
    expect(result.type).toBe('application/json');
    expect(result.parameters['model']).toBeDefined();
    expect(result.parameters['model']).toBe('my-model');
  });

  it('should parse content type header parameters without values', function () {
    var quotedHeader = 'application/json;model=my-model;persistent';
    var result = parseContentTypeHeader(quotedHeader);
    expect(result.type).toBe('application/json');
    expect(result.parameters['model']).toBeDefined();
    expect(result.parameters['model']).toBe('my-model');
    expect(result.parameters['persistent']).toBeDefined();
  });

  it('should parse header sections', function () {
    var headerSection = 'Content-Type: application/json;model=my-model \r\n X-Other-Header: Some Value';
    var result = parseHeaderSection(headerSection);
    expect(result['Content-Type']).toBe('application/json;model=my-model');
    expect(result['X-Other-Header']).toBe('Some Value');
  });

});

describe('form serialization', function () {

  it('should properly encode application/x-www-form-urlencoded', function () {
    var _form, _control, _result;

    _form = _elem('form');
    _control = _elem('input');
    _control.type = 'text';
    _control.name = 'Hello';
    _control.value = 'World';
    _form.appendChild(_control);
    _control = _elem('textarea');
    _control.name = 'Goodbye';
    _control.value = '<Cruel> / (World)';
    _form.appendChild(_control);
    _result = constructFormDataSet(_form);
    _result = urlEncodeFormDataSet(_result);

    expect(_result).toBe('Hello=World&Goodbye=%3CCruel%3E%20%2F%20(World)');
  });

});

describe("mvc", function () {
  var _mvcInternal;
  var _mvc;
  var _data;
  var _appName = 'testing';
  var _appVer = 1;

  beforeEach(function () {
    // TODO: Inject a storage provider into the view cache
    // instead of using localStorage ad-hoc
    localStorage.clear();
    _mvcInternal = mvc(defaultServices, _appName, _appVer++);
    _mvc = _mvcInternal.instance;
    _data = {
      'Hello': 'World',
      'HTML': '<span>Hey</span>',
      'Yeah': {
        'What': 'Ok',
        'Turn': {
          'Down': 'for What'
        }
      },
      'Items': [
        {
          Name: 'Kick'
        },
        {
          Name: 'Snare'
        },
        {
          Name: 'Bass'
        }
      ]
    };
  });

  describe("models", function () {

    describe("`modelStore`", function () {

      it("should return a model when an undefined model is requested", function () {
        var model = _mvc.getModel('non-existent');
        expect(model).toBeDefined();
      });

      it("should return a model when a defined model is requested", function () {
        _mvc.defineModel('existent', false);
        var model = _mvc.getModel('existent');
        expect(model).not.toBeUndefined();
        expect(model).not.toBeNull();
      });

      it("should return the same instance of a model each time", function () {
        _mvc.defineModel('existent', false);
        var model_instance1 = _mvc.getModel('existent');
        var model_instance2 = _mvc.getModel('existent');

        expect(model_instance1).toBe(model_instance2);
      });

      it("should return a transient model before a persistent model", function () {
        _mvc.defineModel('existent', true);
        var persistent = _mvc.getModel('existent');
        _mvc.defineModel('existent');
        var _transient = _mvc.getModel('existent');

        expect(_transient).not.toBe(persistent);
      });

    });

    describe("`model` / `record`", function () {

      it("should allow initialization of new data", function () {
        var _model, _record1, _record2;

        _mvc.defineModel('existent');
        _model = _mvc.getModel('existent');
        _record1 = _model.record();
        _model.initialize(_data);
        _record2 = _model.record();

        expect(_record1).not.toBe(_record2);
        expect(_record1.value('Hello')).toBeUndefined();
        expect(_record2.value('Hello')).toBe('World');
      });

      it('should allow re-initialization of new data', function () {
        var _model, _record1, _record2, _record3, _newData;

        _mvc.defineModel('existent');
        _model = _mvc.getModel('existent');
        _record1 = _model.record();
        _model.initialize(_data);
        _record2 = _model.record();
        _newData = Object.create(_data);
        _newData.Hello = 'Goodbye';
        _model.initialize(_newData);
        _record3 = _mvc.getModel('existent').record();


        expect(_record1).not.toBe(_record2);
        expect(_record1.value('Hello')).toBeUndefined();
        expect(_record2.value('Hello')).toBe('World');
        expect(_record3.value('Hello')).toBe('Goodbye');
      });

      it("should allow merging of new data without losing all record references", function () {
        var _model, _record1, _scope1, _each2, _record2, _scope2, _each2;

        _mvc.defineModel('existent');
        _model = _mvc.getModel('existent');
        _model.initialize(_data);
        _record1 = _model.record();
        _scope1 = _record1.scope('Yeah');
        _each1 = _record1.collection('Items');
        _model.merge({ 'Hello': 'Goodbye', 'Yo': { 'Sup': 'Bruh' }, 'Items': [{ Name: 'Guitar' }] });
        _record2 = _model.record();
        _scope2 = _record2.scope('Yeah');
        _each2 = _record2.collection('Items');

        expect(_record1).not.toBe(_record2);
        expect(_record2.value('Hello')).toBe('Goodbye');
        expect(_scope1).toBe(_scope2);
        expect(_scope1.value('What')).toBe('Ok');
        expect(_model.record().scope('Yo').value('Sup')).toBe('Bruh');
        expect(_each1).not.toBe(_each2);
        expect(_each1[0]).toBe(_each2[0]);
        expect(_each1[3]).toBeUndefined();
        expect(_each2[3]).toBeDefined();
        expect(_each2[3].value('Name')).toBe('Guitar');
      });

      it("should allow access to record value by scope or path", function () {
        var _model, _record;

        _mvc.defineModel('existent');
        _model = _mvc.getModel('existent');
        _model.initialize(_data);
        _record = _model.record();

        expect(_record.value('Yeah.What')).toBe('Ok');
        expect(_record.scope('Yeah').value('What')).toBe('Ok');
        expect(_record.scope('Yeah').value('Turn.Down')).toBe('for What');
        expect(_record.scope('Yeah.Turn').value('Down')).toBe('for What');
        expect(_record.value('Yeah.Turn.Down')).toBe('for What');
      });

    });

  });

  describe('views', function () {

    describe('destructuring', function () {

      it('fails to destructure view trees with recursively named views', function () {
        var _parent, _child, _grandchild, _restructured;

        _parent = _elem('view');
        _parent.name = 'one';
        _child = _elem('view');
        _child.name = 'one';
        _parent.appendChild(_child);
        _result = _mvc.destructureView(_parent);

        expect(_result).toBe(false);

        // Now with a grandchild

        _parent = _elem('view');
        _parent.name = 'one';
        _child = _elem('view');
        _child.name = 'two';
        _grandchild = _elem('view');
        _grandchild.name = 'one';
        _parent.appendChild(_child);
        _child.appendChild(_grandchild);
        _result = _mvc.destructureView(_parent);

        expect(_result).toBe(false);
      });

      it('fails to destructure view trees with misplaced outer dependents', function () {
        var _view, _child, _grandchild, _result;

        // Top-level outer dependency not supported
        _view = _elem('view');
        _view.name = 'one';
        _view.outer = 'two';
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);

        // Outer dependency specified on an inner view not supported
        _view = _elem('view');
        _view.name = 'outer';
        _child = _elem('view');
        _child.name = 'target';
        _grandchild = _elem('view');
        _grandchild.name = 'invalid';
        _grandchild.outer = 'target';
        _view.appendChild(_child);
        _child.appendChild(_grandchild);
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);
      });

      it('fails to destructure view trees with multiple outer dependents', function () {
        var _view, _child1, _child2, _result;

        // When the multiples have different names
        _view = _elem('view');
        _view.name = 'one';
        _child1 = _elem('view');
        _child1.name = 'two';
        _child1.outer = 'one';
        _child2 = _elem('view');
        _child2.name = 'three';
        _child2.outer = 'one';
        _view.appendChild(_child1);
        _view.appendChild(_child2);
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);

        // When the multiples have the same name
        _view = _elem('view');
        _view.name = 'one';
        _child1 = _elem('view');
        _child1.name = 'two';
        _child1.outer = 'one';
        _child2 = _elem('view');
        _child2.name = 'two';
        _child2.outer = 'one';
        _view.appendChild(_child1);
        _view.appendChild(_child2);
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);
      });

      it('fails to destructure view trees with unnamed views', function () {
        var _view, _child, _grandchild, _result;

        // One level deep
        _mvc = mvc(_appName, _appVer++).instance;
        _view = _elem('view');
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);

        // Two levels deep
        _mvc = mvc(_appName, _appVer++).instance;
        _view = _elem('view');
        _view.name = 'one';
        _child = _elem('view');
        _child.name = undefined;
        _view.appendChild(_child);
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);

        // More than two levels deep
        _mvc = mvc(_appName, _appVer++).instance;
        _view = _elem('view');
        _view.name = 'one';
        _child = _elem('view');
        _child.name = 'two';
        _grandchild = _elem('view');
        _grandchild.name = undefined;
        _view.appendChild(_child);
        _child.appendChild(_grandchild);
        _result = _mvc.destructureView(_view);

        expect(_result).toBe(false);
      });

      it('homogenizes inner views of the same name', function () {
        var _view, _child1, _child2, _result;

        _view = _elem('view');
        _view.name = 'one';
        _child1 = _elem('view');
        _child1.name = 'two';
        _child1.textContent = 'Hello';
        _child2 = _elem('view');
        _child2.name = 'two';
        _child2.textContent = 'World';
        _view.appendChild(_child1);
        _view.appendChild(_child2);
        _mvc.destructureView(_view);
        _result = _mvc.restructureView('one');

        expect(_result.children[0].textContent).toBe('Hello');
        expect(_result.children[1].textContent).toBe('Hello');
      });

      it('squashes contents of elements with `bindchildren`', function () {
        var _view, _child, _result;
        var _count = 3; _slice = 1;

        // Squash to single child, two children, three children
        for (var _slice = 1; _slice <= _count; _slice++) {
          _view = _elem('view');
          _view.name = 'one';
          _child = _elem('div');
          _child.bindChildren = _slice;
          for (var i = 0; i < _count * _slice; i++) {
            _child.appendChild(_elem('div'));
          }
          _view.appendChild(_child);
          _mvc.destructureView(_view);
          _result = _mvc.restructureView('one');

          expect(_result.children[0].children.length).toBe(_slice);
        }
      });

      it('strips contents of elements with `bindtext` or `bindhtml` specified', function () {
        var _view, _child, _result;

        _view = _elem('view');
        _view.name = 'one';
        _child = _elem('div');
        _child.bindText = 'SomeExpression';
        _child.textContent = 'Hello World';
        _view.appendChild(_child);
        _mvc.destructureView(_view);
        _result = _mvc.restructureView('one');

        expect(_result.children[0].textContent).toBe('');

        _child.bindText = undefined;
        _child.bindHtml = 'SomeExpression';
        _child.innerHTML = '<span>Hello World</span>';
        _mvc.destructureView(_view);
        _result = _mvc.restructureView('one');

        expect(_result.children[0].innerHTML).toBe('');
      });

    });

    describe('restructuring', function () {

      it('fails to restructure view trees with missing outer dependencies due to supplantment', function () {
        var _view, _child, _supplantor, _result;

        _view = _elem('view');
        _view.name = 'one';
        _child = _elem('view');
        _child.name = 'two';
        _child.outer = 'one';
        _view.appendChild(_child);
        _mvc.destructureView(_view);
        _result = _mvc.restructureView('two');
        expect(_result).toBeDefined();
        _supplantor = _elem('view');
        _supplantor.name = 'one';
        _mvc.destructureView(_supplantor);

        _result = _mvc.restructureView('one');
        expect(_result).toBeDefined();
        _result = _mvc.restructureView('two');
        expect(_result).toBeUndefined();
      });

      it('fails to restructure view trees with misplaced outer dependents due to supplantment', function () {
        var _view, _child, _supplantor, _result;

        _view = _elem('view');
        _view.name = 'one';
        _mvc.destructureView(_view);
        _result = _mvc.restructureView('one');
        expect(_result).toBeDefined();

        _supplantor = _elem('view');
        _supplantor.name = 'one';
        _child = _elem('view');
        _child.name = 'two';
        _child.outer = 'one';
        _supplantor.appendChild(_child);
        _mvc.destructureView(_supplantor);
        _result = _mvc.restructureView('two');
        expect(_result).toBeDefined();
        _result = _mvc.restructureView('one');
        expect(_result).toBeUndefined();
      });

    });

    describe('transitioning', function () {
    
      it('replaces differing `view` elements when analyzing the tree', function () {
        var _outer, _view1, _view2, _child1, _child2, _restructured;

        _outer = _elem('view');
        _outer.name = 'outer';
        _child1 = _elem('div');
        _view1 = _elem('view');
        _view1.outer = 'outer';
        _view1.name = 'target';
        _view1.textContent = 'Hello';
        _child1.appendChild(_view1);
        _child2 = _elem('span');
        _child2.textContent = 'Hollaaa';
        _child1.appendChild(_child2);
        _outer.appendChild(_child1);
        _mvc.destructureView(_outer);
        _restructured = _mvc.restructureView('target');
        _view2 = _elem('view');
        _view2.textContent = 'Goodbye cruel';
        _child1.replaceChild(_view2, _view1);
        _mvc.transitionView(_restructured, _outer);

        expect(_outer.children[0]).toBe(_child1);
        expect(_child1.children[0].firstChild).not.toBe(_view2);
        expect(_child1.children[0].firstChild.textContent).toBe('Hello');
      });
    
      it('replaces `view` elements when their L1 descendant counts differ', function () {
        var _frag, _outer, _view1, _view2, _child1, _child2, _restructured;

        _frag = document.createDocumentFragment();
        _outer = _elem('view');
        _outer.name = 'outer';
        _frag.appendChild(_outer);
        _child1 = _elem('div');
        _view1 = _elem('view');
        _view1.outer = 'outer';
        _view1.name = 'target';
        _child1.appendChild(_view1);
        _child2 = _elem('span');
        _child1.appendChild(_child2);
        _outer.appendChild(_child1);
        _mvc.destructureView(_outer);
        _restructured = _mvc.restructureView('target');
        _view2 = _elem('view');
        _child1.appendChild(_view2);
        _mvc.transitionView(_restructured, _outer);

        expect(_frag.firstChild).not.toBe(_outer);
      });

    });

    describe('binding', function () {

      describe('`bindtext`', function () {

        it('should bind to textContent', function () {
          var _model, _view, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);
          _view = _elem('view');
          _view.model = 'test';
          _element = _elem('div');
          _element.setAttribute('bindtext', 'HTML');
          _view.appendChild(_element);
          _mvc.bindView(_view);

          expect(_element.textContent).toBe('<span>Hey</span>');
          expect(_element.innerHTML).toBe('&lt;span&gt;Hey&lt;/span&gt;');
        });

      });

      describe('`bindhtml`', function () {

        it('should bind to innerHTML', function () {
          var _model, _view, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);
          _view = _elem('view');
          _view.model = 'test';
          _element = _elem('div');
          _element.setAttribute('bindhtml', 'HTML');
          _view.appendChild(_element);
          _mvc.bindView(_view);

          expect(_element.innerHTML).toBe('<span>Hey</span>');
          expect(_element.textContent).toBe('Hey');
        });

      });

      describe('`bindeach`', function () {

        it('should bind records to elements', function () {
          var _model, _record, _view, _child, _children = [],
              keep = 1, total = 3, _eaches;

          _view = _elem('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', keep);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = _elem('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _mvc.bindView(_view);
          _eaches = _model.record().collection('Items');

          expect(_view.children.length).toBe(3);
          for (var i = 0; i < total; i++) {
            expect(_children[i].textContent).toBe(_data.Items[i].Name);
            expect(_children[i].boundRecord).toBe(_eaches[i]);
          }
        });

        it('should bind slices of elements greater than 1', function () {
          var _model, _record, _view, _child, _children = [], slice = 2, total = 6;

          _view = _elem('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', slice);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = _elem('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _mvc.bindView(_view);
          _eaches = _model.record().collection('Items');

          expect(_view.children.length).toBe(6);
          for (var i = 0; i < total; i++) {
            var idx = Math.floor(i / slice);
            expect(_children[i].textContent).toBe(_data.Items[idx].Name);
            expect(_children[i].boundRecord).toBe(_eaches[idx]);
          }
        });

        it('should bind and insert elements as needed', function () {
          var _model, _record, _view, _child, _children = [], slice = 2, total = 6;

          _view = _elem('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', slice);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = _elem('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _mvc.bindView(_view);
          _model.merge({ 'Items': [{ Name: 'Guitar' }] });
          _mvc.bindView(_view);

          expect(_view.children.length).toBe(8);
          for (var i = 0; i < total; i++) {
            expect(_view.children[i]).toBe(_children[i]);
          }
          expect(_view.children[6].textContent).toBe('Guitar');
          expect(_view.children[7].textContent).toBe('Guitar');
        });

        it('should remove extraneous elements as needed', function () {
          var _model, _record, _view, _child, _children = [], slice = 2, total = 6;

          _view = _elem('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', slice);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = _elem('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _mvc.bindView(_view);
          _model.initialize({ 'Items': [{ Name: 'Guitar' }] });
          _mvc.bindView(_view);

          expect(_view.children.length).toBe(2);
          expect(_view.children[0].textContent).toBe('Guitar');
          expect(_view.children[1].textContent).toBe('Guitar');
        });

      });

      describe('`bindnone`', function () {

        it('should skip binding for elements and descendants', function () {
          var _model, _view, _branch1, _branch2, _branch3, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);

          _view = _elem('view');
          _view.model = 'test';

          _branch1 = _elem('div');
          _branch1.setAttribute('bindtext', 'Hello');
          _view.appendChild(_branch1);

          _branch2 = _elem('div');
          _element = _elem('div');
          _element.setAttribute('bindtext', 'Hello');
          _branch2.appendChild(_element);
          _view.appendChild(_branch2);

          _branch3 = _elem('div');
          _branch3.setAttribute('bindnone', '');
          _element = _elem('div');
          _element.setAttribute('bindtext', 'Hello');
          _branch3.appendChild(_element);
          _view.appendChild(_branch3);

          _mvc.bindView(_view);

          expect(_view.children[0].textContent).toBe('World');
          expect(_view.children[1].children[0].textContent).toBe('World');
          expect(_view.children[2].children[0].textContent).toBe('');
        });

      });

      describe('`bindattr-hidden` and `hidden`', function () {

        it('should skip binding for elements and descendants', function () {
          var _model, _view, _branch1, _branch2, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _data.Hidden = true;
          _model.initialize(_data);
          _view = _elem('view');
          _branch1 = _elem('div');
          _branch1.setAttribute('bindtext', 'Hello');
          _branch1.setAttribute('hidden', '');
          _view.appendChild(_branch1);
          _branch2 = _elem('div');
          _branch2.setAttribute('bindattr-hidden', 'Hidden');
          _element = _elem('div');
          _element.setAttribute('bindtext', 'Hello');
          _branch2.appendChild(_element);
          _view.appendChild(_branch2);
          _mvc.bindView(_view);

          expect(_view.children[0].textContent).toBe('');
          expect(_view.children[1].children[0].textContent).toBe('');
        });

      });

      describe('`bindattr-*`', function () {

        it('should bind attributes except `bindattr-*`', function () {
          var _model, _view, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);
          _view = _elem('view');
          _view.model = 'test';
          _element = _elem('div');
          _element.setAttribute('bindattr-class', 'Hello');
          _element.setAttribute('bindattr-bindattr-class', 'Hello');
          _view.appendChild(_element);
          _mvc.bindView(_view);

          expect(_element.getAttribute('bindattr-class')).toBe('Hello');
          expect(_element.getAttribute('class')).toBe('World');
        });

        it('should skip binding `name`, `outer`, `model`, and `scope` for views', function () {
          var _model, _view;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);

          _view = _elem('view');
          _view.model = 'test';
          _view.setAttribute('name', 'test');
          _view.setAttribute('outer', 'layout');
          _view.setAttribute('bindattr-class', 'Hello');
          _view.setAttribute('bindattr-name', 'Hello');
          _view.setAttribute('bindattr-outer', 'Hello');
          _view.setAttribute('bindattr-model', 'Hello');
          _view.setAttribute('bindattr-scope', 'Hello');
          _mvc.bindView(_view);

          expect(_view.getAttribute('class')).toBe('World');
          expect(_view.getAttribute('name')).toBe('test');
          expect(_view.getAttribute('outer')).toBe('layout');
          expect(_view.getAttribute('model')).toBe('test');
          expect(_view.hasAttribute('scope')).toBe(false);
        });

        it('should map `bindattr-value` to IDL `value` where present', function () {
          var _view, _model, _input;

          // 'value'
          _view = _elem('view');
          _view.model = 'test';
          _input = _elem('input');
          _input.type = 'input';
          _input.value = 'World';
          _input.setAttribute('bindattr-value', 'Hello');
          _view.appendChild(_input);
          _model = _mvc.getModel('test');
          _data.Hello = 'Everybody';
          _model.initialize(_data);
          _mvc.bindView(_view);

          expect(_input.value).toBe('Everybody');
        });

        it('should map `bindattr-checked` to IDL `checked` where present', function () {
          var _view, _model, _input;

          // 'value'
          _view = _elem('view');
          _view.model = 'test';
          _input = _elem('input');
          _input.type = 'checkbox';
          _input.checked = false;
          _input.setAttribute('bindattr-checked', 'Hello');
          _view.appendChild(_input);
          _model = _mvc.getModel('test');
          _data.Hello = true;
          _model.initialize(_data);
          _mvc.bindView(_view);

          expect(_input.checked).toBe(true);
        });

        it('should interpret true/false/undefined as attribute presence', function () {
          var _view, _child, _grandchild;

          // true
          _view = _elem('view');
          _view.model = 'test';
          _child = _elem('div');
          _child.setAttribute('bindattr-data-true', 'true');
          _child.setAttribute('bindattr-data-false', 'false');
          _child.setAttribute('bindattr-data-undefined', 'undefined');
          _view.appendChild(_child);
          _model = _mvc.getModel('test');
          _data['true'] = true;
          _data['false'] = false;
          _data['undefined'] = undefined;
          _model.initialize(_data);
          _mvc.bindView(_view);

          expect(_child.getAttribute('data-true')).toBe('');
          expect(_child.hasAttribute('data-false')).toBe(false);
          expect(_child.hasAttribute('data-undefined')).toBe(false);
        });

      });

    });

  });

  describe('hyperlink navigation', function () {
  
    it('should not prevent default when pushState is not available', function () {
      var _link, _event, _services;

      _link = _elem('a');
      _link.href = '/Some/Url';
      _link.view = 'target';
      _event = {
        target: _link,
        preventDefault: function () {
          this.defaultPrevented = true;
        },
        defaultPrevented: false
      };
      _services = {
        window: window,
        document: document,
        location: window.location,
        history: {}
      };
      _mvcInternal = mvc(_services, _appName, _appVer++);
      _mvcInternal.internals.extendHyperlinkNavigation(_event);

      expect(_event.defaultPrevented).toBe(false);
    });
  
    it('should prevent default when pushState is available', function () {
      var _link, _event, _services;

      _link = _elem('a');
      _link.href = '/Some/Url';
      _event = {
        target: _link,
        preventDefault: function () {
          this.defaultPrevented = true;
        },
        defaultPrevented: false
      };
      _services = {
        window: {},
        document: document,
        location: _location(location.href),
        history: window.history
      };
      _mvcInternal = mvc(_services, _appName, _appVer++);
      _mvcInternal.internals.extendHyperlinkNavigation(_event);

      expect(_event.defaultPrevented).toBe(true);
    });
  
    it('should change window.location.href when view cannot be restructured', function () {
      var _link, _event, _services;

      _link = _elem('a');
      _link.href = '/Some/Url';
      _link.view = 'target';
      _event = {
        target: _link,
        preventDefault: function () {
          this.defaultPrevented = true;
        },
        defaultPrevented: false
      };
      _services = {
        window: {},
        document: document,
        location: _location(location.href),
        history: window.history
      };
      _mvcInternal = mvc(_services, _appName, _appVer++);
      _mvcInternal.internals.extendHyperlinkNavigation(_event);

      expect(_services.location.pathname).toBe('/Some/Url');
      expect(_event.defaultPrevented).toBe(true);
    });

  });

});
