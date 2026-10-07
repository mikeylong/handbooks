# Add to cart exercise · v2.1.1

Use the existing Velori components to carry one configuration through Configure → Review → Add to cart → Cart confirmation. Keep the existing product imagery, selection controls, expression menu, accessory details, keyboard behavior, and image recovery.

1. Choose Graphite, Simple, Amber, and Carry bag. Continue opens Review with the configured photo and all four values.
2. Edit configuration opens the editable choices with **Continue** as its primary label. Return to Review without losing a value.
3. Add to cart opens Cart confirmation with the configured photo, four choices, and **Quantity: 1**. Explain that no order has been placed.
4. Change the configurator without adding. Open Cart and confirm that the saved item has not changed.
5. Edit cart item restores the saved choices. Change one value, review, and add again. The cart contains one updated item. Repeated pointer or keyboard activation cannot append duplicates.
6. Reload Cart in the same tab. Confirm that the item remains. Reset configuration restores Chalk, Friendly, White, and Dock, empties the cart, and returns to Configure.
7. Choose Carry bag, then open `/?unavailable=bag#/review`. Review must mark the accessory unavailable and require **Choose Dock** or **Choose None** before adding. The finish, face, and color remain.
8. Open `/#/cart` after reset. **Your cart is empty** offers **Configure Velori** and a usable route back.

The React app saves the active configuration in local storage and the cart snapshot in session storage, under separate sample keys. Blocked storage keeps the current visit usable and shows a notice. Reset must leave unrelated local and session storage values intact. A missing product image keeps choices and cart data available; a real failed image request offers Retry image.

Record default and non-default screenshots, keyboard and focus results, the two storage records, reload/reset results, unavailable-accessory recovery, and empty-cart recovery. Native Figma behavior needs its own actual prototype checks. Browser storage and HTML dropdown keys are separate executable-app checks. No payment or order submission is part of this exercise.
