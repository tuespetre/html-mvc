# html-mvc

> A 'polyfill' that activates client-side MVC for your server-rendered MVC application.

## [See the demo, written with ASP.NET 5](https://github.com/tuespetre/html-mvc-aspnet5)

## Conventions

- **Progressive enhancement** and **graceful degradation**

  Applications developed following the conventions promoted by html-mvc will work as-is
  from the server without any script, whether the user has disabled scripting, cannot run
  scripts due to corporate policies or firewalls, does not have scripting at all, or can
  and does run Javascript but encounters a scripting error.
  
- **Content negotiation**

  When a client requests a specific representation of a resource from a server, the server
  must do its best to honor the request. When using html-mvc, your server will be responding
  to its clients' requests for dynamic resources with at least two different content types: 
  `text/html` and `multipart/json`.
  
- **Decoration over mutation**

  Server-side templating constructs have traditionally resulted in the server delivering 
  multiple permutations of a given view to its clients. When using html-mvc, your server
  will always deliver views that contain all of the necessary markup and bindings needed
  in order to be cached and re-used by the client.
  
- **Make the server work**

  html-mvc introduces some new isomorphic constructs intended to be implemented in various
  server-side languages and frameworks. Developers shouldn't have to use Node to create
  an isomorphic web app, and they shouldn't have to repeat themselves either: whether by
  writing the same template twice or writing the same binding expression twice.
  
- **Data-centric binding**

  All of the binding constructs introduced by html-mvc are purely data-centric; this results
  in a purely declarative binding style where all data manipulation functions have already been
  called by the time the model is binding to the view.
  
## Concepts

### Controllers

With html-mvc, the only controller defined for the client is the client itself. There are plans for various extension points to be added to html-mvc so that custom functionality may be added where needed. As far as the server is concerned, every controller speaks purely in terms of models; whether the model is rendered as a `text/html` view or a `multipart/json` payload is the responsibility of a higher-level abstraction.

### Views

When a client makes a request to the server for a `text/html` representation of a resource, the server will respond by rendering a single **target view**, with one or more 'layout' or **outer views**. The target view and its outer views may each contain any number of additional **inner views**, otherwise known as 'partials' or 'view components'.

With html-mvc, you mark up document bodies as 'view trees', and you mark up navigational and submission elements (`a`, `area`, `button[type='submit']`, `form`, `input[type='submit']`, `input[type='image']`) with the name of the **target view** that would be expected if one were to request a `text/html` representation of the resource identified by the link's `href` or the form's `action`:

**page-a.html**
```
<body>
  <view name="main-layout">
    <h1>My Layout View</h1>
    <view name="page-a" outer="main-layout">
      <h2>Hello from page A</h2>
      <a href="page-b.html" title="Page B" view="page-b">
        Go to page B
      </a>
    </view>
  </view>
</body>
```

When the document loads, html-mvc will detect the `<view>` child element of the `<body>` and **destructure** it, meaning it will take a deep clone of the top-level `<view>` element and caches its pieces like this:

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
  <h2>Hello from page A</h2>
  <a href="page-b.html" title="Page B" view="page-b">
    Go to page B
  </a>
</view>
```

Let us assume the client has also already cached **page-b**:

**page-b**
```
<view name="page-b" outer="main-layout">
  <h2>Hello from page B</h2>
  <a href="page-a.html" title="Page A" view="page-a">
    Go to page A
  </a>
</view>
```

Now, when the client follows the hyperlink in **page-a**, it will look for **page-b** in the cache and attempt to resolve its outer view dependencies and any inner view dependencies. If the client is able to successfully restructure the target view with its surrounding tree, it will use the restructured view to transform the current document in-place and add a new entry to the browser's history.

### Models

Client-side MVC entails 'hijacking' the browser's history traversal and modifying the document in-place by restructuring a given view and binding a particular model or set of models to the restructured view. By default, the set of models for a given view will be associated with that view's history entry. These models are known as **transient models.** 

Sometimes, it makes sense for a model to be reused across history entries: for example, consider a layout where the navigation bar contains a notification badge which indicates some quantity of unread messages. The list of messages for the inbox (or some other folder) may also contain bits of data that flag a message as unread. As the user reads each message, the count should go down and the message should no longer be flagged as unread, even if the user uses the back button. In this scenario, the model should be a **persistent model**, that is, one which is not associated with a specific history entry.

The server will deliver models to the client in one of three ways:

- Pre-bound to a `text/html` response
- As parts of a `multipart/json` response
- As embedded data blocks within a `text/html` response

The first mode of delivery is well-understood and not worth rehashing here; the second and third modes require further explanation.

#### Delivering models as parts of a `multipart/json` response

A `multipart/json` response is very similar to a `multipart/mixed` response, except every part of the message is of the content type `application/json`. html-mvc specifically requires the use of at least one MIME type extension parameter for each part:

- `model={model name}`, to indicate which named model the JSON data represents (required)
- `persistent`, to indicate that the model should be considered persistent

#### As embedded data blocks within a `text/html` response

In order to give the client the raw model data that can be re-used to bind to the view that was initially rendered by the server, the server will render a `<script type="application/json" model="model name">` tag containing a JSON serialization of the model. With html-mvc, the client will automatically process all such tags from an initial server rendering and use their data blocks to register models.

### Binding

html-mvc defines an assortment of binding attributes for HTML elements. Unless otherwise mentioned, the value of each attribute is a **model expression.**

html-mvc defines the following binding-related attributes on the `<view>` element:

- `model`
- `scope`

These are to be used exclusively of each other; if both are present, `model` takes priority.

html-mvc also extends the `HTMLElement` prototype with several attributes, listed in order of application and priority:

- `bindskip`

  This attribute is processed for presence rather than value;
  when present, the client must skip processing any further bindings
  for this element and its descendants.
  
- `bindattr-hidden`
 
  This binding is evaluated for its value and used to add or remove
  the `hidden` attribute to an element. After this binding has been
  processed (or would have been processed, if not present), the client
  must skip processing any further bindings for this element and its
  descendants if the element's `hidden` attribute is present, unless
  the `bindsome` or `bindnone` bindings are specified for this element.

- `bindattr-*`

  This binding is evaluated for its value and used to set the value of
  the attribute identified by the wildcard on this element. Expressions
  that evaluate to `true`, `false`, or `undefined` are processed in terms
  of attribute presence, while all other values are applied to the attribute's
  value. The client will also set the `value` and `checked` properties of
  the element, if the element is a form control.

- `bindchildren`

  This attribute represents an integer between `1` and `Infinity` which is used
  when destructuring views to determine how many of the child elements should be
  kepts, or when binding to a collection to determine how many of the child elements
  should be sampled for each iteration.
  
- `bindsome`

  This binding is evaluated for its value. If the value is a collection,
  each item of the collection will be bound to a set of 1 or more child
  elements existing in this element, as specified by `bindchildren`. When
  the binding has completed, all extra child elements will be removed.
  If the value is not a collection or the value is a collection but the
  collection is empty, the element's `hidden` attribute will be set and
  the client will skip processing further bindings for this element and
  its descendants. If the value is a collection and is not empty, and the
  `hidden` attribute exists on the element but it was not put there by
  the `bindattr-hidden` binding, the element's `hidden` attribute will be
  removed and its other `bindattr-*` bindings will be processed before
  binding the items of the collection to the children of this element.
  
- `bindnone`

  This binding is evaluated for its value. If the value is a collection,
  and the collection is empty, and the element's `hidden` attribute exists
  but was not put there by the `bindattr-hidden` binding, the `hidden` 
  attribute will be removed, any other `bindattr-*` bindings will be
  processed, and bindings will be processed for this element's descendants.
  If the value is not a collection or it is a non-empty collection,
  the element's `hidden` attribute will be set and the client will skip
  processing further bindings for this element and its descendants.
  
- `bindcount`

  This binding is evaluated for its value. If the value is a collection,
  the number of items in the collection is used to set the `textContent`
  of this element. Otherwise, the number `0` is used to set the `textContent`
  of this element. If the client applies this binding it must
  skip processing any further bindings for this elements and its descendants.

- `bindtext`

  This binding is evaluated for its value, which is then used to set the
  `textContent` of this element. If the client applies this binding it must
  skip processing any further bindings for this elements and its descendants.

- `bindhtml`

  This binding is evaluated for its value, which is then used to set the
  `innerHTML` of this element. If the client applies this binding it must
  skip processing any further bindings for this elements and its descendants.
