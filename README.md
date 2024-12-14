# ReQuery

A Web Component framework that works with raw HTML - no JSX, string literals, or special templating syntax is required. Built for seamless integration with website builders like Webflow.

## Why ReQuery?

ReQuery bridges the gap between traditional development and visual development. For traditional developers, it provides a type-safe, component-based framework with familiar Web Component patterns. For visual developers and the No-Code/Low-Code community, it enables seamless integration with visual website builders like Webflow, while maintaining the power and flexibility of a full development framework.

Key features:
- **Web Components**: Built on native web standards using Custom Elements
- **Type-Safe**: Full TypeScript support with generics for props, store, and actions
- **Visual Tool Friendly**: No JSX or complex templating - works with any HTML
- **Reactive**: Powered by vue-reactivity for automatic UI updates
- **Lightweight**: No virtual DOM, minimal overhead
- **Framework Agnostic**: Works with any frontend stack (theoretically)

## Special Thanks

ReQuery wouldn't exist without the Vue ecosystem. The reactive core is powered by `@vue/reactivity`, and the API design was inspired by Petite Vue. Thank you to Evan You and the Vue team for these incredible tools.

## Quick Start

ReQuery works by marking interactive elements with the `rq` attribute in your HTML. These elements are then "queried" in your component's setup function where you can bind reactive data and event handlers. This approach keeps your HTML clean and compatible with visual tools, while maintaining full programmatic control in your JavaScript/TypeScript code.

1. Mark the interactive & reactive elements with the `rq` attribute:

```html
<rq-counter prop:initial-count="0" prop:step="1">
  <button rq="button">
    Clicked: <span rq="count">0</span> times
  </button>
</rq-counter>
```

2. Define the component:

```javascript
defineComponent("rq-counter", {
  props: {
    initialCount: 0,
    step: 1
  },
  store: {
    count: 0
  },
  setup(component, props, store, actions) {
    // Initialize from props
    store.count = props.initialCount;

    // Bind UI elements
    component.query("count").text(() => store.count);
    component.query("button").on("click", (el, evt) => {
      store.count += props.step;
    });
  }
});
```

## Components

Components in ReQuery are built on top of the Web Components standard. They provide a clean way to create reusable UI elements with their own properties, state, and behaviors.

### Parameters

| Name | Type | Description |
|-----------|------|-------------|
| name | string | The name of the element. Must contain a hyphen and follow the [custom element naming rules](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name). |
| props | object | Properties that can be set using `prop:` attributes in the HTML |
| store | object | Internal reactive state for the component |
| actions | object | Methods that can be called on the component |
| setup | function | Setup function called when component is mounted |

### Using TypeScript

ReQuery components are fully typed in TypeScript:

#### TypeScript

```typescript
interface Item {
  id: number;
  name: string;
  image: string;
}

interface CollectionProps {
  selected?: number;
}

interface CollectionStore {
  items: Item[];
  loading: boolean;
  error: string | null;
}

interface CollectionActions
  extends ComponentActions<CollectionProps, CollectionStore> {
  load(
    ctx: ActionContext<CollectionProps, CollectionStore>,
    offset: number
  ): void;
}

interface PokemonResponse {
  count: number;
  next: string;
  previous: string;
  results: { name: string; url: string }[];
}

defineComponent<CollectionProps, CollectionStore, CollectionActions>(
  "rq-collection",
  {
    props: {
      selected: undefined,
    },
    store: {
      items: [],
      loading: false,
      error: null,
    },
    actions: {
      async load(ctx, offset = 0) {
        ctx.store.loading = true;
        ctx.store.error = null;
        const perPage = 4;

        try {
          const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon?limit=${perPage}&offset=${offset}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = (await response.json()) as PokemonResponse;

          const newItems = data.results.map((item, index) => {
            // Calculate the Pokemons Id as it is not in the response
            const id = index + offset + 1;
            return {
              id,
              name: item.name,
              image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
            } as Item;
          });

          ctx.store.items.push(...newItems);
        } catch (err) {
          if (err instanceof Error) {
            ctx.store.error = err.message;
          } else {
            ctx.store.error = "Failed to load Pokemon";
          }
          console.error("Failed to load Pokemon:", err);
        } finally {
          ctx.store.loading = false;
        }
      },
    },
    setup(component, props, store, actions) {
      // Initial load
      actions.load(0);

      // Render items using the for directive
      component.query("item").for(
        () => store.items, // items array
        (item) => item.id, // key function (optional)
        (el, item) => {
          // Setup item bindings
          el.bind("class.ring-2", () => props.selected === item.id)
            .bind("class.ring-blue-500", () => props.selected === item.id)
            .on("click", (el, evt) => {
              props.selected = item.id;
            });

          // Setup item elements
          el.query("title").text(() => item.name);
          el.query("image").bind("src", () => item.image);
        }
      );

      // Refresh button
      component
        .query("btn-load")
        .bind("disabled", () => store.loading)
        .on("click", (el, evt) => {
          actions.load(store.items.length);
        });

      // Load button loader
      component.query("btn-load-loader").show(() => store.loading);

      // Show/hide error message
      component
        .query("error")
        .show(() => store.error !== null)
        .text(() => store.error!);
    },
  }
);
```

#### HTML Markup

```html
<rq-collection prop:per-page="4">
  <!-- Pokemon grid -->
  <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div
      rq="item"
      class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <img rq="image" alt="Pokemon" class="w-32 h-32 mx-auto mb-4" />
      <h3
        rq="title"
        class="text-lg font-medium text-gray-800 capitalize text-center"
      ></h3>
    </div>
  </div>

  <!-- Load more button -->
  <div class="text-center">
    <button
      rq="btn-load"
      class="px-6 py-2 bg-white text-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Load More
      <span rq="btn-load-loader" rq-cloak class="inline-block ml-2"
        >...</span
      >
    </button>
  </div>
</rq-collection>
```

### Component Instance Keys

Components can have unique instance keys for identification:

```html
<rq-collection prop:key="pokedex">
  <!-- This instance can be queried using the key -->
</rq-collection>
```

### Querying Components

If you need to access a component instance outside of the setup function, you can use the `queryComponent` function.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | string | The name of the component |
| key | string | The key of the component |

#### Example

```javascript
// Query individual instance
const collection = queryComponent("rq-collection");

// Query specific instance by key
const postsCollection = queryComponent("rq-collection", "posts");

// Access component properties
console.log("Props", postsCollection.props);
console.log("Store", postsCollection.store);
console.log("Actions", postsCollection.actions);

// Call component actions
postsCollection.actions.refresh();

// Register event listeners
postsCollection.on("itemSelected", (el, evt) => {
  console.log("itemSelected", evt);
});
```

### Parent-Child Communication

Components can communicate with their parents and children through props, events, and direct component queries.

#### Props

Props can be passed to components using:
- the `prop:` prefix in HTML attributes
- accessing the `props` property on the component instance
- parent component setup function

##### HTML Attributes

Just like native Web Components, you can pass props to components via HTML attributes. The only difference is that you use the `prop:` prefix.

```html
<rq-collection
  prop:key="pokedex"
  prop:selected="1"
>
  <!-- Child component with `rq` attribute -->
  <rq-item rq="pokemon"></rq-item>
</rq-collection>
```

Props are automatically converted to their appropriate types:
- Boolean values: `"true"` → `true`
- Numbers: `"123"` → `123`
- Objects/Arrays: Parsed from JSON strings
- Strings: Kept as-is

##### Component Instance

You can access the props of a component instance using the `props` property.

```javascript
const pokedex = queryComponent("rq-collection", "pokedex");

// Access props
console.log(pokedex.props);
```

##### Setup Function

You can also bind child component props in the parent component setup function.

```javascript
// Child component
defineComponent("rq-item", {
  props: {
    key: null,
    name: null,
    image: null,
  },
  store: {},
  setup(component, props, store, actions) {
    component.query("title").text(() => props.name);
    component.query("image").bind("src", () => props.image);
  },
});

// Parent component
defineComponent<CollectionProps, CollectionStore, CollectionActions>(
  "rq-collection",
  {
    props: {
      selected: undefined,
    },
    store: {
      items: [],
      loading: false,
      error: null,
    },
    actions: {
      async load(ctx, offset = 0) {
        ...
      },
    },
    setup(component, props, store, actions) {
      actions.load(0);

      component.query("item").for(
        () => store.items,
        (item) => item.id,
        (el, item) => {
          el.bind("prop:key", () => item.id);
          el.bind("prop:name", () => item.name);
          el.bind("prop:image", () => item.image);
          el.bind("class.ring-2", () => props.selected === item.id)
            .bind("class.ring-blue-500", () => props.selected === item.id)
            .on("click", (el, evt) => {
              props.selected = item.id;
            });
        }
      );

      ...
    },
  }
);
```


#### Events

ReQuery components allow you to easily emit events to parent components.

```javascript
// Child component
defineComponent("rq-item", {
  props: {
    key: null,
    name: null,
    image: null,
  },
  store: {},
  setup(component, props, store, actions) {
    component.query("title").text(() => props.name);
    component.query("image").bind("src", () => props.image);

    component.query("btn-favorite").on("click", (el, evt) => {
      // Prevent default behavior
      evt.preventDefault();
      evt.stopPropagation();
      
      // Emit favoriteItem event to the parent component
      component.emit("favoriteItem", {
        id: props.key,
        name: props.name,
        image: props.image,
      });
    });
  },
});

// Parent component
defineComponent(
  "rq-collection",
  {
    props: {},
    store: {},
    actions: {},
    setup(component, props, store, actions) {
      ...
      component.on("favoriteItem", (value) => {
        // Format the value for display
        const formattedValue = JSON.stringify(value, null, 2);

        // Display the formatted value in an alert
        alert(
          `Favorite item event received in the rq-collection component:\n\nPokemon:\n${formattedValue}`
        );
      });
      ...
    },
  }
);
```

### Component Lifecycle

Components follow the Web Components lifecycle with some enhancements:

```javascript
defineComponent("rq-example", {
  setup(component, props, store, actions) {
    // Setup runs when component is mounted
    
    // Cleanup when component is disposed
    return () => {
      // Cleanup code
    };
  }
});
```

## Elements

Elements are reactive references to DOM nodes that can be queried using the `query` method available on a component instance. They provide a way to interact with the DOM and apply directives.

### 🔎 query()

The `query` method is used to find elements marked with an `rq` attribute:

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | string | The value of the `rq` attribute to search for |

#### Example

##### HTML

```html
<div rq="warning-message">
  Warning: Count is <span rq="count">0</span>!
</div>
```

##### JavaScript

```javascript
// Query element from a component
const warningMessage = component.query("warning-message");
```

When using the `if` and `for` directives, you should query children using the element not the component to ensure they are cleaned up correctly.

```javascript
warningMessage.if(
  () => store.showWarning,
  (el) => { 
    // Query child element
    el.query("count").text(() => store.count);
  }
);
```

#### Query Tips
- Names must be unique within their parent scope
- Elements can query for their own child elements
- Queries are cached and reused for performance
- Returns an `RqElement` with reactive capabilities


### ⚡️ on()

Registers event listeners on the element.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| event | string | The event to listen for |
| handler | (el: RqElement, evt: Event) => void | The handler function to call when the event is triggered |

#### Example

```javascript
component.query("btn-increment").on("click", (el, evt) => {
  store.count++;
});
```

#### Tips
- Event handlers are automatically cleaned up when the element is disposed
- Returns element for chaining

### 🪢 bind()

Binds a property to a reactive value.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| property | string | The property to bind |
| value | () => any | Function that returns the value to bind |

#### Example

```javascript
component.query("avatar").bind("src", () => store.user.avatar);
component.query("status").bind("textContent", () => store.status);
component.query("btn-search").bind("disabled", () => store.isLoading);
component.query("input-search").bind("value", () => store.searchTerm);
```

#### Tips
- Bind any property that can be set with a string
- The class property can be bound to a string or an object
- The style property can be bound to a string or an object
- Individual classes can be bound with the `class.<class-name>` syntax
- Returns element for chaining

### 🔄 for()

Renders lists of elements with optional keyed tracking.

#### Parameters

| Name | Type                                  | Description                                |
| --------- | ------------------------------------- | ------------------------------------------ |
| items     | () => T[]                             | Function that returns the array to iterate |
| keyFn     | (item: T) => any                      | *Optional function to generate unique keys  |
| setup     | (el: RqElement, item: T) => void | Setup function for each item               |

#### Example

```javascript
// Non-keyed list
list.for(
  () => store.items,  // items array
  (el, item) => {
    // Chain directives in the function
    el.text(() => item.title);
  }
);

// Keyed list
list.for(
  () => store.items,  // items array
  (item) => item.id,  // key function (optional)
  (el, item) => {
    // Chain directives in the function
    el.text(() => item.title);
  }
);
```

#### Tips

- Keyed lists will reorder DOM nodes when the list updates
- Non-keyed lists will only update the data bound to the DOM items
- Apply additional directives in the setup function
- Does **not** return the element for chaining

### 🔀 if()

Conditionally renders elements based on a reactive condition.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| condition | () => boolean | Function that returns whether the element should be shown |
| setup | (el: RqElement) => void | Optional setup function called when element is rendered |

#### Example

```html
<div rq="user-info" rq-cloak>
  <img rq="avatar" />
  <span rq="name"></span>
</div>
```

```javascript
component.query("user-info")
  .if(() => store.user, (el) => {
    el.query("name").text(() => store.user.name);
    el.query("avatar").bind("src", () => store.user.avatar);
  });
```

#### Tips
- Use `rq-cloak` attribute to hide elements until conditions are evaluated
- Child elements should be queried and bound within the setup function
- Setup function runs each time an element is rendered
- Cleanup is automatic when condition becomes false
- Does **not** return the element for chaining

### 👻 show()

Shows or hides elements based on a reactive condition without removing them from the DOM.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| condition | () => boolean | Function that returns whether the element should be visible |

#### Example

```html
<div rq="loading-spinner">Loading...</div>
```

```javascript
component.query("loading-spinner").show(() => store.isLoading);
```

#### Tips
- Unlike `if`, elements remain in the DOM but are hidden with `display: none`
- Useful for frequently toggled elements
- Returns element for chaining

### 🔤 text()

Sets the text content of an element reactively.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| content | () => string | Function that returns the text content |

#### Example

```html
<span rq="counter">0</span>
<div rq="greeting">Welcome!</div>
```

```javascript
// Simple text binding
component.query("counter")
  .text(() => store.count);

// Computed text content
component.query("greeting")
  .text(() => `Welcome ${store.user.name}!`);
```

#### Tips
- Safely escapes HTML content
- Returns element for chaining

### 👾 html()

Binds the element's inner HTML with reactive content.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| content | () => string | HTML content or function returning HTML |

#### Example

```javascript
component.query("content-area").html(() => 
  `<strong>Current count: ${store.count}</strong>`
);
```

#### Tips
- Use with caution - ensure HTML content is sanitized
- Returns element for chaining

### 🏍️ onMounted()

Elements support mounted callbacks for integration with external libraries

```javascript
component.query("bar-chart")
  .onMounted(() => {
    // Run after element is mounted
    initializeChart();
    
    // Optional cleanup
    return () => {
      cleanupChart();
    };
  });
```

### Chaining Directives

Most directives can be chained for complex behaviors:

```javascript
component
  .query("btn-increment")
  .text(() => `Clicked ${store.count} times`)
  .bind("disabled", () => store.count >= 5)
  .on("click", (el, evt) => {
    store.count++;
  });
```

## License

MIT