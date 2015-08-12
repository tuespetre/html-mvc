# Why.

## Are we writing our apps.

### In nothing but Javascript.

It's time to get serious about this. Let's take our lessons learned from Angular, React, and the like and make something more sustainable.

1.  Do whichever of the following applies to you:
  - Trash your purely client-side MVC app and make it a server-side one, if applicable, or
  - Strip out all of your duplicated client-side templates and leave only the server ones, or
  - Wait for further instruction if you haven't already gone off the Javascript deep-end
2.  Familiarize yourself with the following terms:
  - Progressive Enhancement
  - Isomorphism, aka 'shared contour between the client and server'
  - Target View, aka the main view you want a user to see when they follow a link (whether by navigation or form submission)
3.  Start using (and helping to develop) **HTML MVC**.

## What is HTML MVC

1. It's a `prolly-maybe-idk-fill` designed to provide a generalized solution for a complex problem
2. It offers the main benefits of using client-side frameworks while letting you think server-side
3. It offers extension points for any 'super awesome extra enhancements' you may want to do
4. It's an entirely **progressive enhancement**; if the script fails or the browser won't run it or
   any script at all, your would **degrade gracefully** to traditional link clicks and form submissions
5. It's rough on the edges right now

## How it works

### 1. Views

#### Markup

To use HTML MVC, you mark up document bodies as 'view trees', and you mark up navigational and submission elements (`a`, `area`, `button[type='submit']`, `form`, `input[type='submit']`, `input[type='image']`) with the name of the **target view** to which they should transition the document.

**page-a.html**
```
<body>
  <view name="main-layout">
    <h1>My Layout View</h1>
    <view name="page-a" outer="main-layout">
      <h2>Hello from page B</h2>
      <a href="page-b.html" title="Page B" view="page-b">
        Go to page B
      </a>
    </view>
  </view>
</body>
```

When the document loads, HTML MVC detects the `<view>` child element of the `<body>` and **destructures it**, meaning it takes a deep clone of the `<view>` element and caches its pieces like this:

**main-layout**
```
<view name="main-layout">
  <h1>My Layout View</h1>
  <view name="page-a" outer="main-layout">
  </view>
</view>
```

**page-a**
```
<view name="page-a" outer="main-layout">
  <h2>Hello from page B</h2>
  <a href="page-b.html" title="Page B" view="page-b">
    Go to page B
  </a>
</view>
```

When you click the link to `page-b.html`, HTML MVC looks for a cached view named `page-b`. If it can't find it, it simply lets the browser navigate as normal. Otherwise, it tries to **restructure** the cached view by resolving its **inner and outer dependencies** so it can **transition** the **current view**. If it can't restructure the cached view, it lets the browser navigate. But if it can, then it add a new history entry, sets the document title, and transitions the current view.

**Transitioning the current view** is similar to how React reconciles component trees. HTML MVC starts from the top, compares the topmost views by name, and then proceeds to recursively compare first-level descendant views, making replacements where needed.

There are certain rules about how view trees must be validly structured in order for them to be successfully destructured or restructured; for the most part though, it maps directly to what we have already been doing at the server MVC-wise, regardless of language.

There is a programmatic API available as well as support underway for HTML imports using a `rel="import view"` relation, which would allow for pre-caching. Also underway is the ability to use the `application-name` and `application-version` meta tags (the second one is not registered or official but makes sense) as identifiers for the view cache, so you can invalidate cached destructured views when you update your app.

### 2. Models & Binding

#### Part 1: Models

With views we got the client to where it can have the same piecemeal templates that the server does, now we need to actually make them useful to the client.

If your server-side framework does not offer a customizable HTML Attribute based binding syntax, or some way of evaluating and transforming a document tree before rendering it to the response, you will have more work cut out for you, but it's still better than the alternative. ASP.NET 5 has a new feature called 'Tag Helpers' that **perfectly** facilitates this.

Models are very simple; just declare a `<script type="application/json">` element, and give it a `model` attribute with the name to use for the model. The contents of the element should be the serialized JSON representation of your model.

Models registered by this declarative API are said to be **persistent**. **Persistent** means the model will be retained between navigations. If the model is not **persistent**, it is instead said to be **transient**, meaning it will be considered a part of the state for a particular history entry only. A good rule of thumb is that the models used by your target views will be transient, while the models used by your layout views should be persistent.

There is an imperative API for defining and working with models as well.

Models are a sort of 'record of records'. See the following excerpt:

```javascript
document.mvc.defineModel('my-model');
var model = document.mvc.getModel('my-model');
model.initialize({ 
  'Hello': 'World', 
  'Yeah': { 
    'What': 'Ok' 
  },
  'Items': [
    { Name: 'One' },
    { Name: 'Two', Nested: { 'Property': 'Value' } }
  ]
});

var record = model.record();
record.value('Hello') // 'World'
record.value('Yeah.What') // 'Ok'

var subrecord = record.scope('Yeah');
subrecord.value('What') // 'Ok'

var items = record.collection('Items');
items[0].value('Name') // 'One'
items[1].value('Name') // 'Two'
items[1].value('Nested.Property') // 'Value'
```

The expressions by which values may be accessed are useful to know for our next part, 'Binding'.

#### Part 2: Binding

HTML MVC defines the following binding-related attributes on the `<view>` element:

- `model`
- `scope`

These are to be used exclusively of each other; if both are present, 'model' takes priority. 'Scope' maps directly to the code example above during the binding process.

HTML MVC also extends the HTMLElement prototype with several attributes:

- `bindattr-*`
- `bindtext`
- `bindhtml`
- `bindeach`
- `bindchildren`
- `bindnone`

`bindattr-*` allows you to bind another attribute of the element to a value from the model. It cannot be used to do things like `bindattr-bindattr-...`, and it cannot affect other binding attributes, even those defined for `<view>`.

`bindnone` instructs HTML MVC to not waste time binding this element or any of its children.

`bindtext` and `bindhtml` bind a value from the model to either `textContent` or `innerHTML`, respectively.

`bindeach` maps to the 'collection' call in the above code example, and `bindchildren` tells HTML MVC whether it should use any more than one element to render each record in the collection.

**The binding process** is initiated by calling `bind(record)` on a `<view>` element. This is done automatically by HTML MVC after a view has been transitioned. It traverses the entire view tree includes the non-view descendants, skipping branches that have been opted out of binding by the `bindnone` attribute or that are `hidden` (after evaluating any `bindattr-hidden` binding.) Because model records are exposed as immutable interfaces, each element is associated with a reference to its last-bound record, and if the record is the same record, the values are guaranteed to be the same and the binding process will carry on with its business.

### 3. Bringing models and views together

In addition to the `view` and `formview` attributes, there are also `model` and `formmodel` attributes for navigation/submission elements. When they are detected, HTML will first try to relocate and restructure the view as usual, but it will also request a `mime/multipart` response from the server at the target URL, to which the server should respond with a multipart message where each part has a `Content-Type` header of `application/json;model={model-name-here}` (yes, that is valid, it's a MIME type extension parameter.) One of the parts should match the `model` name specified on the element; if not, or if the message is not successful or of the wrong type, navigation or submission will proceed as normal (except in the case of a form POST, where you wouldn't want to submit twice.)

## Enough words, see the demo app

Demo app with ASP.NET 5 coming soon.