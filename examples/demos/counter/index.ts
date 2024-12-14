import { defineComponent } from "../../../src/main";

type Props = {
  initialCount: number;
  step: number;
  showDemo: boolean;
};

type Store = {
  count: number;
  isVisible: boolean;
};

defineComponent<Props, Store>("rq-counter", {
  // Define component props with default values
  props: {
    initialCount: 0,
    step: 1,
    showDemo: false,
  },

  // Component's internal state
  store: {
    count: 0,
    isVisible: true,
  },

  setup(component, props, store) {
    // Initialize store with prop values
    store.count = props.initialCount;
    store.isVisible = props.showDemo;

    // Toggle visibility button setup
    component
      .query("toggleBtn")
      // Toggle visibility state on click
      .on("click", (el, evt) => {
        store.isVisible = !store.isVisible;
      })
      // Set button icon based on visibility state
      .html(() =>
        store.isVisible
          ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.733 5.076C13.0624 4.7984 15.4186 5.29082 17.4419 6.47805C19.4651 7.66528 21.0442 9.48208 21.938 11.651C22.0214 11.8755 22.0214 12.1225 21.938 12.347C21.5705 13.238 21.0848 14.0755 20.494 14.837M14.084 14.158C13.5182 14.7045 12.7604 15.0069 11.9738 15C11.1872 14.9932 10.4348 14.6777 9.87856 14.1215C9.32234 13.5652 9.00683 12.8128 9 12.0262C8.99316 11.2396 9.29554 10.4818 9.84202 9.916M17.479 17.499C16.1525 18.2848 14.6725 18.776 13.1394 18.9394C11.6063 19.1028 10.056 18.9345 8.59365 18.4459C7.13133 17.9573 5.79121 17.1599 4.66423 16.1077C3.53725 15.0556 2.64977 13.7734 2.06202 12.348C1.97868 12.1235 1.97868 11.8765 2.06202 11.652C2.94865 9.50186 4.50869 7.69725 6.50802 6.509M2.00002 2L22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" > <path d="M2.06202 12.3481C1.97868 12.1236 1.97868 11.8766 2.06202 11.6521C2.87372 9.68397 4.25153 8.00116 6.02079 6.81701C7.79004 5.63287 9.87106 5.00073 12 5.00073C14.129 5.00073 16.21 5.63287 17.9792 6.81701C19.7485 8.00116 21.1263 9.68397 21.938 11.6521C22.0214 11.8766 22.0214 12.1236 21.938 12.3481C21.1263 14.3163 19.7485 15.9991 17.9792 17.1832C16.21 18.3674 14.129 18.9995 12 18.9995C9.87106 18.9995 7.79004 18.3674 6.02079 17.1832C4.25153 15.9991 2.87372 14.3163 2.06202 12.3481Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> <path d="M12 15.0001C13.6569 15.0001 15 13.657 15 12.0001C15 10.3433 13.6569 9.00012 12 9.00012C10.3432 9.00012 9.00002 10.3433 9.00002 12.0001C9.00002 13.657 10.3432 15.0001 12 15.0001Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> </svg>'
      );

    // Reset button - sets counter back to initial value
    component.query("resetBtn").on("click", (el, evt) => {
      store.count = props.initialCount;
    });

    // Counter demo section with conditional rendering
    component.query("counterDemo").if(
      () => store.isVisible,
      (el) => {
        // Setup increment/decrement buttons
        // Disable increment at max value (5)
        el.query("incrementBtn")
          .bind("disabled", () => store.count >= 5)
          .on("click", (el, evt) => {
            store.count += props.step;
          });

        // Disable decrement at min value (0)
        el.query("decrementBtn")
          .bind("disabled", () => store.count <= 0)
          .on("click", (el, evt) => {
            store.count -= props.step;
          });

        // Display current counter value
        el.query("counterDisplay").text(() => store.count);

        // Show warning message when counter reaches max value
        el.query("warning").bind("style", () => ({
          display: store.count >= 5 ? "block" : "none",
        }));
      }
    );
  },
});
