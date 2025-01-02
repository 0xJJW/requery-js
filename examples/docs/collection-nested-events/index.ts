import { defineComponent } from "../../../src/main";
import type { RqActionContext, RqActions } from "../../../src/types";

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
  extends RqActions<CollectionProps, CollectionStore> {
  load(
    ctx: RqActionContext<CollectionProps, CollectionStore>,
    offset: number
  ): void;
}

interface PokemonResponse {
  count: number;
  next: string;
  previous: string;
  results: { name: string; url: string }[];
}

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

    component.query("btn-favorite").on("click", (evt) => {
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

      component.on("favoriteItem", (value) => {
        const formattedValue = JSON.stringify(value, null, 2);
        alert(
          `Favorite item event received in the rq-collection component:\n\nPokemon:\n${formattedValue}`
        );
      });

      // Render items using the for directive
      component.query("item").for(
        () => store.items, // items array
        (item) => item.id, // key function (optional)
        (el, item) => {
          // Setup item bindings
          el.bind("prop:key", () => item.id)
            .bind("prop:name", () => item.name)
            .bind("prop:image", () => item.image)
            .bind("class.ring-2", () => props.selected === item.id)
            .bind("class.ring-blue-500", () => props.selected === item.id)
            .on("click", (evt) => {
              props.selected = item.id;
            });
        }
      );

      // Refresh button
      component
        .query("btn-load")
        .bind("disabled", () => store.loading)
        .on("click", (evt) => {
          actions.load(store.items.length);
        });

      // Button loader
      component.query("btn-load-loader").show(() => store.loading);

      // Show/hide error message
      component
        .query("error-message")
        .show(() => store.error !== null)
        .text(() => store.error!);
    },
  }
);
