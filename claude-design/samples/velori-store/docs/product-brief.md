# Extend Velori with Add to cart

The v2.1.1 exercise takes the configured robot through Review, Add to cart, and Cart confirmation. Preserve Velori's name, photographs, masks, captions, controlled choices, and 1024 × 768 composition. Use the accepted rules in [native-baseline.md](native-baseline.md). Keep the expression dropdown and one Dock, Carry bag, or None value. Configure and Edit configuration both use **Continue** with Ink/white, 12px corners, and 48px height. Accessory gaps stay at 24px.

Review shows the selected product image and all four choices. Edit configuration and Back keep the values and restore Continue focus. Add to cart saves a separate snapshot and opens Cart confirmation with the image, four choices, and Quantity: 1. Later changes to the configurator do not change the saved item. Edit cart item restores the saved choices. Reviewing and adding again replaces that one item. Repeated activation cannot create duplicates.

Preserve keyboard navigation, heading and return focus, reload persistence, and product-image failure/retry. Same-tab reload restores the cart. Reset restores defaults, clears the cart, and returns to Configure without touching unrelated storage. An unavailable accessory requires an explicit replacement or None before adding; the other choices remain. An empty cart offers Configure Velori.

Payment, accounts, shipping, and order submission remain outside the exercise. Details photography keeps its current direct image behavior. Narrow finish and face gaps remain 16px, while accessories stay at 24px. See [add-to-cart.md](add-to-cart.md) for the concrete acceptance sequence.

This brief supplies the assignment. The running React app is a completed answer key; it does not establish your native generation, handoff, or Figma prototype results.
