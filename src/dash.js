const { ComponentRegistry, Component } = Dashboards;

class SimpleDivComponent extends Component {
    constructor(cell, options) {
        super(cell, options);
        this.type = 'Component';

        return this;
    }

    async load() {
        super.load();

        if (!this._div) {
            this._div = document.createElement('div');
                        this._div.classList.add('simple-div'); // custom class
            this._div.innerText = this.options.text ?? 'component';
            this._div.style.width = '100%';
            this._div.style.height = '300px';   // fixed height
            this._div.style.border = '2px solid #ccc';
            this._div.style.display = 'flex';
            this._div.style.alignItems = 'center';
            this._div.style.justifyContent = 'center';
            this._div.style.backgroundColor = '#ffefef';
        }

        this.contentElement.appendChild(this._div);
        this.parentElement.appendChild(this.element);

        return this;
    }

    getOptionsOnDrop(sidebar) {
        super.getOptionsOnDrop.call(this, sidebar);
        return {
            renderTo: '',
            type: 'Component',
            text: 'component'
        };
    }
}

ComponentRegistry.registerComponent('Component', SimpleDivComponent);

class SimpleKPIComponent extends Component {
    constructor(cell, options) {
        super(cell, options);
        this.type = 'KPIComponent';

        return this;
    }

    async load() {
        super.load();

        if (!this._div) {
            this._div = document.createElement('div');
                        this._div.classList.add('kpi-div'); // custom class
            this._div.innerText = this.options.text ?? 'component';
            this._div.style.width = '100%';
            this._div.style.height = '300px';   // fixed height
            this._div.style.border = '2px solid #ccc';
            this._div.style.display = 'flex';
            this._div.style.alignItems = 'center';
            this._div.style.justifyContent = 'center';
            this._div.style.backgroundColor = '#ffefef';
        }

        this.contentElement.appendChild(this._div);
        this.parentElement.appendChild(this.element);

        return this;
    }

    getOptionsOnDrop(sidebar) {
        super.getOptionsOnDrop.call(this, sidebar);
        return {
            renderTo: '',
            type: 'KPIComponent',
            text: 'KPI component'
        };
    }
}

ComponentRegistry.registerComponent('KPIComponent', SimpleKPIComponent);

// Function to initialize the dashboard
function initializeDashboard() {
    // Check if container exists
    const container = document.getElementById('container');
    if (!container) {
        console.warn('Container element not found, retrying...');
        setTimeout(initializeDashboard, 100);
        return;
    }

    // Check if Dashboards is available
    if (typeof Dashboards === 'undefined') {
        console.warn('Dashboards not loaded, retrying...');
        setTimeout(initializeDashboard, 100);
        return;
    }

    Dashboards.board('container', {
        editMode: {
            enabled: true,
            lang: {
                sidebar: {
                    Component: 'Component',
                    KPIComponent: 'KPI Component'
                }
            },
            settings: {
                enabled: false
            },
            contextMenu: { enabled: true },
            toolbars: {
                sidebar: {
                    components: ['Component', 'KPIComponent']
                },
                row: {
                    enabled: false
                },
            }
        },
        gui: {},
        components: []
    });
}

// Make the function globally available
window.initializeDashboard = initializeDashboard;
