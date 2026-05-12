class CustomSelect {
    constructor(wrapperId) {
        this.wrapper = document.getElementById(wrapperId);
        if (!this.wrapper) return;

        this.button = this.wrapper.querySelector('.custom-select-button');
        this.menu = this.wrapper.querySelector('.custom-select-menu');
        this.options = this.wrapper.querySelectorAll('.custom-select-option');
        this.display = this.wrapper.querySelector('[id$="-display"]');
        this.isUserInitiated = true; // Track if change is from user interaction

        this.init();
    }

    init() {
        if (!this.button || !this.menu) return;

        // Toggle menu on button click
        this.button.addEventListener('click', () => {
            this.toggle();
        });

        // Handle option selection
        this.options.forEach(option => {
            option.addEventListener('click', (e) => {
                this.isUserInitiated = true;
                this.selectOption(option);
                this.close();
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menu.classList.contains('open')) {
                this.close();
            }
        });

        // Reposition menu on window resize
        window.addEventListener('resize', () => {
            if (this.menu.classList.contains('open')) {
                this.positionMenu();
            }
        });
    }

    toggle() {
        if (this.menu.classList.contains('open')) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.positionMenu();
        this.menu.classList.add('open');
        this.button.classList.add('open');
    }

    close() {
        this.menu.classList.remove('open');
        this.button.classList.remove('open');
    }

    positionMenu() {
        // Determine if menu should open above or below
        const menuHeight = this.menu.offsetHeight;
        const buttonRect = this.button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        // Remove existing position classes
        this.menu.classList.remove('above', 'below');

        // If more space above or not enough space below, open above
        if (spaceAbove > spaceBelow && spaceAbove > menuHeight) {
            this.menu.classList.add('above');
        } else {
            this.menu.classList.add('below');
        }
    }

    selectOption(option) {
        const value = option.dataset.value;
        const text = option.textContent;

        // Update display
        if (this.display) {
            this.display.textContent = text;
        }

        // Update selected state
        this.options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Dispatch custom event only if user initiated
        if (this.isUserInitiated) {
            const event = new CustomEvent('customSelectChange', {
                detail: { value: parseInt(value, 10), text }
            });
            this.wrapper.dispatchEvent(event);
            this.isUserInitiated = false; // Reset flag
        }
    }

    setValue(value) {
        this.isUserInitiated = false; // Mark as programmatic update
        const option = Array.from(this.options).find(opt => opt.dataset.value == value);
        if (option) {
            this.selectOption(option);
        }
    }

    getValue() {
        const selected = this.wrapper.querySelector('.custom-select-option.selected');
        return selected ? parseInt(selected.dataset.value, 10) : null;
    }
}

export default CustomSelect;
