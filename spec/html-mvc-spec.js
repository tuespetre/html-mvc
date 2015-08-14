describe('multipart/json parsing', function () {

  it('should parse content type headers with quotes', function() {
    var unquotedHeader = 'application/json; model="my-model"';    
    var result = parseContentTypeHeader(unquotedHeader);
    expect(result.type).toBe('application/json');
    expect(result.parameters['model']).toBeDefined();
    expect(result.parameters['model']).toBe('my-model');
  });

  it('should parse content type headers without quotes', function() {
    var quotedHeader = 'application/json;model=my-model';   
    var result = parseContentTypeHeader(quotedHeader);
    expect(result.type).toBe('application/json');
    expect(result.parameters['model']).toBeDefined();
    expect(result.parameters['model']).toBe('my-model');
  });

  it('should parse header sections', function() {
    var headerSection = 'Content-Type: application/json;model=my-model \r\n X-Other-Header: Some Value';
    var result = parseHeaderSection(headerSection);
    expect(result['Content-Type']).toBe('application/json;model=my-model');
    expect(result['X-Other-Header']).toBe('Some Value');
  });

});

describe("mvc", function () {
  var _mvc;
  var _data;

  beforeEach(function () {
    _mvc = mvc();
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

    describe('binding', function () {

      describe('`bindtext`', function() {
      
        it ('should bind to textContent', function() {
          var _model, _view, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);
          _view = document.createElement('view');
          _element = document.createElement('div');
          _element.setAttribute('bindtext', 'HTML');
          _view.appendChild(_element);
          _view.bind(_model.record());
          
          expect(_element.textContent).toBe('<span>Hey</span>');
          expect(_element.innerHTML).toBe('&lt;span&gt;Hey&lt;/span&gt;');
        });

      });

      describe('`bindhtml`', function() {
      
        it ('should bind to innerHTML', function() {
          var _model, _view, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);
          _view = document.createElement('view');
          _element = document.createElement('div');
          _element.setAttribute('bindhtml', 'HTML');
          _view.appendChild(_element);
          _view.bind(_model.record());
          
          expect(_element.innerHTML).toBe('<span>Hey</span>');
          expect(_element.textContent).toBe('Hey');
        });

      });

      describe('`bindeach`', function () {

        it('should bind records to elements', function () {
          var _model, _record, _view, _child, _children = [],
              keep = 1, total = 3, _eaches;

          _view = document.createElement('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', keep);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = document.createElement('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _view.bind(_model.record());
          _eaches = _model.record().collection('Items');

          expect(_view.children.length).toBe(3);
          for (var i = 0; i < total; i++) {
            expect(_children[i].textContent).toBe(_data.Items[i].Name);
            expect(_children[i].boundRecord).toBe(_eaches[i]);
          }
        });

        it('should bind slices of elements greater than 1', function () {
          var _model, _record, _view, _child, _children = [], slice = 2, total = 6;

          _view = document.createElement('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', slice);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = document.createElement('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _view.bind(_model.record());
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

          _view = document.createElement('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', slice);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = document.createElement('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _view.bind(_model.record());
          _model.merge({ 'Items': [{ Name: 'Guitar' }] });
          _view.bind(_model.record());

          expect(_view.children.length).toBe(8);
          for (var i = 0; i < total; i++) {
            expect(_view.children[i]).toBe(_children[i]);
          }
          expect(_view.children[6].textContent).toBe('Guitar');
          expect(_view.children[7].textContent).toBe('Guitar');
        });

        it('should remove extraneous elements as needed', function () {
          var _model, _record, _view, _child, _children = [], slice = 2, total = 6;

          _view = document.createElement('view');
          _view.setAttribute('name', 'test-view');
          _view.setAttribute('model', 'test-model');
          _view.setAttribute('bindchildren', slice);
          _view.setAttribute('bindeach', 'Items');
          for (var i = 0; i < total; i++) {
            _child = document.createElement('div');
            _child.setAttribute('bindtext', 'Name');
            _view.appendChild(_child);
            _children[i] = _child;
          }

          _mvc.defineModel('test-model');
          _model = _mvc.getModel('test-model');
          _model.initialize(_data);
          _view.bind(_model.record());
          _model.initialize({ 'Items': [{ Name: 'Guitar' }] });
          _view.bind(_model.record());

          expect(_view.children.length).toBe(2);
          expect(_view.children[0].textContent).toBe('Guitar');
          expect(_view.children[1].textContent).toBe('Guitar');
        });

      });

      describe('`bindnone`', function () {
        
        it ('should skip binding for elements and descendants', function() {
          var _model, _view, _branch1, _branch2, _branch3, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);

          _view = document.createElement('view');

          _branch1 = document.createElement('div');
          _branch1.setAttribute('bindtext', 'Hello');
          _view.appendChild(_branch1);

          _branch2 = document.createElement('div');
          _element = document.createElement('div');
          _element.setAttribute('bindtext', 'Hello');
          _branch2.appendChild(_element);
          _view.appendChild(_branch2);

          _branch3 = document.createElement('div');
          _branch3.setAttribute('bindnone', '');
          _element = document.createElement('div');
          _element.setAttribute('bindtext', 'Hello');
          _branch3.appendChild(_element);
          _view.appendChild(_branch3);

          _view.bind(_model.record());
          
          expect(_view.children[0].textContent).toBe('World');
          expect(_view.children[1].children[0].textContent).toBe('World');
          expect(_view.children[2].children[0].textContent).toBe('');
        });

      });

      describe('`bindattr`', function () {
        
        it ('should bind attributes except `bindattr-*`', function() {
          var _model, _view, _element;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);
          _view = document.createElement('view');
          _element = document.createElement('div');
          _element.setAttribute('bindattr-class', 'Hello');
          _element.setAttribute('bindattr-bindattr-class', 'Hello');
          _view.appendChild(_element);
          _view.bind(_model.record());
          
          expect(_element.getAttribute('bindattr-class')).toBe('Hello');
          expect(_element.getAttribute('class')).toBe('World');
        });
        
        it ('should skip binding `name`, `outer`, `model`, and `scope` for views', function() {
          var _model, _view;

          _mvc.defineModel('test');
          _model = _mvc.getModel('test');
          _model.initialize(_data);

          _view = document.createElement('view');
          _view.setAttribute('name', 'test');
          _view.setAttribute('outer', 'layout');
          _view.setAttribute('bindattr-class', 'Hello');
          _view.setAttribute('bindattr-name', 'Hello');
          _view.setAttribute('bindattr-outer', 'Hello');
          _view.setAttribute('bindattr-model', 'Hello');
          _view.setAttribute('bindattr-scope', 'Hello');
          _view.bind(_model.record());
          
          expect(_view.getAttribute('class')).toBe('World');
          expect(_view.getAttribute('name')).toBe('test');
          expect(_view.getAttribute('outer')).toBe('layout');
          expect(_view.hasAttribute('model')).toBe(false);
          expect(_view.hasAttribute('scope')).toBe(false);
        });

      });

    });
  
  });

});