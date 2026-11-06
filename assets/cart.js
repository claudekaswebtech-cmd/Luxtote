/* Quantity input */
if (!customElements.get('quantity-input')) {
  customElements.define(
    'quantity-input',
    class QuantityInput extends HTMLElement {
      connectedCallback() {
        this.input = this.querySelector('input');
        this.addEventListener('click', this.onButtonClick);
        this.input.addEventListener('change', this.syncButtons);
      }

      disconnectedCallback() {
        this.removeEventListener('click', this.onButtonClick);
      }

      onButtonClick = (event) => {
        const button = event.target.closest('[data-step]');
        if (!button || button.disabled) return;

        const previous = this.input.value;
        button.dataset.step === 'up' ? this.input.stepUp() : this.input.stepDown();

        if (this.input.value !== previous) {
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };

      syncButtons = () => {
        const value = Number(this.input.value);
        const min = Number(this.input.min || 0);
        const max = this.input.max ? Number(this.input.max) : Infinity;

        this.querySelector('[data-step="down"]').disabled = value <= min;
        this.querySelector('[data-step="up"]').disabled = value >= max;
      };
    }
  );
}

/* Line item */
if (!customElements.get('cart-items')) {
  customElements.define(
    'cart-items',
    class CartItems extends HTMLElement {
      timers = new Map();
      queue = Promise.resolve();

      connectedCallback() {
        this.addEventListener('change', this.onChange);
        this.addEventListener('click', this.onClick);
      }

      disconnectedCallback() {
        this.removeEventListener('change', this.onChange);
        this.removeEventListener('click', this.onClick);
      }

      onChange = (event) => {
        const input = event.target;

        if (input.dataset.key) {
          this.debounce(input.dataset.key, () => this.changeLine(input.dataset.key, Number(input.value), input));
        } else if (input.name === 'note') {
          this.debounce('note', () => this.saveNote(input.value), 500);
        }
      };

      onClick = (event) => {
        const remove = event.target.closest('[data-cart-remove]');
        if (!remove) return;

        event.preventDefault();
        this.changeLine(remove.dataset.cartRemove, 0);
      };

      debounce(id, callback, delay = 300) {
        clearTimeout(this.timers.get(id));
        this.timers.set(id, setTimeout(callback, delay));
      }

      changeLine(key, quantity, input) {
        this.queue = this.queue.then(() => this.request(key, quantity, input));
      }

      async request(key, quantity, input) {
        const sections = this.sectionIds();
        this.setAttribute('aria-busy', 'true');

        try {
          const response = await fetch(`${window.Shopify?.routes?.root ?? '/'}cart/change.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: key, quantity, sections, sections_url: window.location.pathname }),
          });
          const data = await response.json();

          if (!response.ok || data.status) {
            console.error('Cart update failed:', data.description || data.message || response.statusText);
            if (input) input.value = input.defaultValue;
            return;
          }

          this.render(data.sections);
          this.announce();
          document.querySelectorAll('[data-cart-count]').forEach((count) => {
            count.textContent = data.item_count;
            count.hidden = data.item_count === 0;
          });
          document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
        } catch (error) {
          console.error('Cart update failed:', error);
          if (input) input.value = input.defaultValue;
        } finally {
          this.removeAttribute('aria-busy');
        }
      }

      async saveNote(note) {
        try {
          await fetch(`${window.Shopify?.routes?.root ?? '/'}cart/update.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ note }),
          });
        } catch (error) {
          console.error('Order note was not saved:', error);
        }
      }

      sectionIds() {
        return [...document.querySelectorAll('cart-items[data-section]')].map((element) => element.dataset.section);
      }

      render(sections = {}) {
        const focusedKey = document.activeElement?.dataset?.key;
        const parser = new DOMParser();

        document.querySelectorAll('cart-items[data-section]').forEach((element) => {
          const html = sections[element.dataset.section];
          if (!html) return;

          const next = parser
            .parseFromString(html, 'text/html')
            .querySelector(`cart-items[data-section="${element.dataset.section}"]`);
          if (!next) return;

          const regions = element.querySelectorAll('[data-cart-region]');
          const keepsLayout = regions.length > 0 && !next.hasAttribute('data-empty') && !element.hasAttribute('data-empty');

          if (keepsLayout) {
            regions.forEach((region) => {
              const replacement = next.querySelector(`[data-cart-region="${region.dataset.cartRegion}"]`);
              if (replacement) region.innerHTML = replacement.innerHTML;
            });
          } else {
            element.innerHTML = next.innerHTML;
            element.toggleAttribute('data-empty', next.hasAttribute('data-empty'));
          }
        });

        if (focusedKey) {
          this.querySelector(`input[data-key="${CSS.escape(focusedKey)}"]`)?.focus();
        }
      }

      announce() {
        const status = document.getElementById(`CartStatus-${this.dataset.section}`);
        if (!status) return;

        status.textContent = '';
        setTimeout(() => {
          status.textContent = status.dataset.message;
        }, 100);
      }
    }
  );
}

/* Popup */
if (!customElements.get('cart-popup')) {
  customElements.define(
    'cart-popup',
    class CartPopup extends HTMLElement {
      connectedCallback() {
        this.toggle = this.querySelector('.cart-icon');
        this.panel = this.querySelector('.cart-popup__panel');
        this.hoverMode = this.dataset.trigger === 'hover' && window.matchMedia('(hover: hover)').matches;

        if (this.hoverMode) {
          this.addEventListener('mouseenter', this.open);
          this.addEventListener('mouseleave', this.scheduleClose);
        } else {
          this.toggle.addEventListener('click', this.onToggleClick);
        }

        document.addEventListener('keydown', this.onKeydown);
        document.addEventListener('click', this.onDocumentClick);
        document.addEventListener('cart:open', this.onCartOpen);
      }

      disconnectedCallback() {
        document.removeEventListener('keydown', this.onKeydown);
        document.removeEventListener('click', this.onDocumentClick);
        document.removeEventListener('cart:open', this.onCartOpen);
      }

      get isOpen() {
        return !this.panel.hidden;
      }

      open = () => {
        clearTimeout(this.closeTimer);
        this.panel.hidden = false;
        this.toggle.setAttribute('aria-expanded', 'true');
      };

      close = () => {
        clearTimeout(this.closeTimer);
        this.panel.hidden = true;
        this.toggle.setAttribute('aria-expanded', 'false');
      };

      scheduleClose = () => {
        clearTimeout(this.closeTimer);
        this.closeTimer = setTimeout(this.close, 200);
      };

      onToggleClick = (event) => {
        event.preventDefault();

        if (this.isOpen) {
          this.close();
        } else {
          this.open();
          this.panel.querySelector('a:not([tabindex="-1"]), button')?.focus();
        }
      };

      onKeydown = (event) => {
        if (event.key !== 'Escape' || !this.isOpen) return;

        this.close();
        this.toggle.focus();
      };

      onDocumentClick = (event) => {
        if (this.isOpen && !this.contains(event.target)) this.close();
      };

      onCartOpen = async () => {
        try {
          const root = window.Shopify?.routes?.root ?? '/';
          const response = await fetch(`${root}?sections=cart-popup`);
          const sections = await response.json();
          this.querySelector('cart-items')?.render(sections);
        } catch (error) {
          console.error('Cart popup refresh failed:', error);
        }

        this.open();
      };
    }
  );
}

/* Drawer */
if (!customElements.get('cart-drawer')) {
  customElements.define(
    'cart-drawer',
    class CartDrawer extends HTMLElement {
      connectedCallback() {
        this.toggle = this.querySelector('.cart-icon');
        this.dialog = this.querySelector('dialog');

        this.toggle.addEventListener('click', this.onToggleClick);
        this.dialog.addEventListener('click', this.onDialogClick);
        this.dialog.addEventListener('close', this.onClose);
        document.addEventListener('cart:open', this.onCartOpen);
      }

      disconnectedCallback() {
        document.removeEventListener('cart:open', this.onCartOpen);
      }

      open() {
        if (this.dialog.open) return;

        this.dialog.showModal();
        this.toggle.setAttribute('aria-expanded', 'true');
      }

      close() {
        this.dialog.close();
      }

      onToggleClick = (event) => {
        event.preventDefault();
        this.open();
      };

      onDialogClick = (event) => {
        if (event.target === this.dialog || event.target.closest('[data-cart-drawer-close]')) {
          this.close();
        }
      };

      onClose = () => {
        this.toggle.setAttribute('aria-expanded', 'false');
      };

      onCartOpen = async () => {
        try {
          const root = window.Shopify?.routes?.root ?? '/';
          const response = await fetch(`${root}?sections=cart-drawer`);
          const sections = await response.json();
          this.querySelector('cart-items')?.render(sections);
        } catch (error) {
          console.error('Cart drawer refresh failed:', error);
        }

        this.open();
      };
    }
  );
}
