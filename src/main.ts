import './style.css'
import { LayoutEngine } from './layout-engine'
import { Modal } from './modal'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="demo-container">
    <div class="app-header">
      <div class="sidebar">
        <h1>Layout Engine</h1>
        <div class="demo-tabs">
          <button class="tab-button active" data-demo="demo1">Demo 1: Advanced (Reflow)</button>
          <button class="tab-button" data-demo="demo2">Demo 2: Advanced (No Reflow)</button>
          <button class="tab-button" data-demo="demo3">Demo 3: Simple Templates</button>
        </div>
      </div>
      
      <div class="task-navigator">
        <div class="task-left">
          <h3>Task Challenge</h3>
          <div class="task-instruction">
            <span id="task-text">Create the displayed layout</span>
          </div>
          <div class="task-controls">
            <button id="task-prev" class="task-arrow" disabled>‹</button>
            <div class="task-info">
              <span id="task-counter">1 / 2</span>
            </div>
            <button id="task-next" class="task-arrow">›</button>
          </div>
        </div>
        <div class="task-image-container">
          <img id="task-image" src="/dash-1.png" alt="Task Layout" />
        </div>
      </div>
    </div>
    
    <div class="main-content">
      <div class="demo-panel active" id="demo1">
        <div class="canvas-controls" id="canvas-controls-1">
          <!-- Controls for demo1 will be inserted here dynamically -->
        </div>
        <div id="canvas-1" class="canvas"></div>
      </div>
      
      <div class="demo-panel" id="demo2">
        <div class="canvas-controls" id="canvas-controls-2">
          <!-- Controls for demo2 will be inserted here dynamically -->
        </div>
        <div id="canvas-2" class="canvas"></div>
      </div>
      
      <div class="demo-panel" id="demo3">
        <div class="canvas-controls" id="canvas-controls-3">
          <!-- Controls for demo3 will be inserted here dynamically -->
        </div>
        <div id="canvas-3" class="canvas template-canvas"></div>
      </div>
    </div>
  </div>

  <div id="component-modal" class="modal">
    <div class="modal-content">
      <h3>Select Component Type</h3>
      <button id="add-chart" class="btn">Chart (6x6)</button>
      <button id="add-kpi" class="btn">KPI (2x3)</button>
      <button id="modal-close" class="btn btn-secondary">Cancel</button>
    </div>
  </div>

  <div id="import-modal" class="modal">
    <div class="modal-content import-modal-content">
      <h3>Import Layout</h3>
      <p>Paste your layout JSON below:</p>
      <textarea id="import-textarea" placeholder="Paste layout JSON here..." rows="10"></textarea>
      <div class="modal-buttons">
        <button id="import-confirm-btn" class="btn">Import</button>
        <button id="import-cancel-btn" class="btn btn-secondary">Cancel</button>
      </div>
      <div id="import-error" class="error-message"></div>
    </div>
  </div>
`

// Demo engines and localStorage keys
let currentDemo = 'demo1';
const layoutEngines: { [key: string]: LayoutEngine } = {};
const modals: { [key: string]: Modal } = {};

// LocalStorage management
function saveLayoutState(demoId: string, layoutState: any) {
  try {
    localStorage.setItem(`layout-engine-${demoId}`, JSON.stringify(layoutState));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadLayoutState(demoId: string): any {
  try {
    const saved = localStorage.getItem(`layout-engine-${demoId}`);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
}

function clearLayoutState(demoId: string) {
  try {
    localStorage.removeItem(`layout-engine-${demoId}`);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

// Auto-save functionality
function setupAutoSave(demoId: string, engine: LayoutEngine) {
  const autoSave = () => {
    const layoutState = engine.exportLayout();
    saveLayoutState(demoId, layoutState);
  };
  
  // Save on component add, move, resize, delete
  const originalAddComponent = engine.addComponent.bind(engine);
  engine.addComponent = function(type) {
    originalAddComponent(type);
    setTimeout(autoSave, 100); // Small delay to ensure layout is finalized
  };
}

// Dynamic button management (old initialization functions removed - now handled in attachDemoEventListeners)

// Dynamic button management
function updateCanvasControls(demoId: string) {
  // Clear all canvas controls first
  document.querySelectorAll('.canvas-controls').forEach(controls => {
    controls.innerHTML = '';
  });
  
  const canvasControls = document.getElementById(`canvas-controls-${demoId.slice(-1)}`)!;
  
  if (demoId === 'demo1') {
    canvasControls.innerHTML = `
      <button id="add-component-btn-1" class="btn">Add Component</button>
      <button id="clear-canvas-btn-1" class="btn btn-warning">Clear Canvas</button>
      <button id="export-layout-btn-1" class="btn btn-secondary">Export Layout</button>
      <button id="import-layout-btn-1" class="btn btn-secondary">Import Layout</button>
    `;
  } else if (demoId === 'demo2') {
    canvasControls.innerHTML = `
      <button id="add-component-btn-2" class="btn">Add Component</button>
      <button id="clear-canvas-btn-2" class="btn btn-warning">Clear Canvas</button>
      <button id="export-layout-btn-2" class="btn btn-secondary">Export Layout</button>
      <button id="import-layout-btn-2" class="btn btn-secondary">Import Layout</button>
    `;
  } else if (demoId === 'demo3') {
    canvasControls.innerHTML = `
      <div class="template-controls">
        <label>Template:</label>
        <select id="template-select">
          <option value="dashboard">Dashboard</option>
          <option value="analytics">Analytics</option>
          <option value="report">Report</option>
          <option value="kpi-grid">KPI Grid</option>
        </select>
      </div>
      <button id="clear-template-btn" class="btn btn-warning">Clear Canvas</button>
    `;
  }
  
  // Re-attach event listeners based on demo
  attachDemoEventListeners(demoId);
}

// Tab switching functionality
function switchDemo(demoId: string) {
  // Hide all demos
  document.querySelectorAll('.demo-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Show selected demo
  document.getElementById(demoId)!.classList.add('active');
  
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-demo="${demoId}"]`)!.classList.add('active');
  
  // Update canvas controls
  updateCanvasControls(demoId);
  
  currentDemo = demoId;
}

// Attach event listeners for each demo
function attachDemoEventListeners(demoId: string) {
  if (demoId === 'demo1') {
    document.getElementById('add-component-btn-1')?.addEventListener('click', () => modals['demo1'].show());
    document.getElementById('clear-canvas-btn-1')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        layoutEngines['demo1'].clearCanvas();
        clearLayoutState('demo1');
      }
    });
    document.getElementById('export-layout-btn-1')?.addEventListener('click', exportLayout.bind(null, 'demo1'));
    document.getElementById('import-layout-btn-1')?.addEventListener('click', importLayout.bind(null, 'demo1'));
    
    // Load saved state for demo1
    const savedState = loadLayoutState('demo1');
    if (savedState && savedState.components && savedState.components.length > 0) {
      layoutEngines['demo1'].importLayout(savedState);
    }
  } else if (demoId === 'demo2') {
    document.getElementById('add-component-btn-2')?.addEventListener('click', () => modals['demo2'].show());
    document.getElementById('clear-canvas-btn-2')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        layoutEngines['demo2'].clearCanvas();
        clearLayoutState('demo2');
      }
    });
    document.getElementById('export-layout-btn-2')?.addEventListener('click', exportLayout.bind(null, 'demo2'));
    document.getElementById('import-layout-btn-2')?.addEventListener('click', importLayout.bind(null, 'demo2'));
    
    // Load saved state for demo2
    const savedState = loadLayoutState('demo2');
    if (savedState && savedState.components && savedState.components.length > 0) {
      layoutEngines['demo2'].importLayout(savedState);
    }
  } else if (demoId === 'demo3') {
    const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
    templateSelect?.addEventListener('change', () => {
      demo3Controller.createTemplate(templateSelect.value);
    });
    document.getElementById('clear-template-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        demo3Controller.clearTemplate();
        templateSelect.value = 'dashboard';
        clearLayoutState('demo3');
        demo3Controller.createTemplate('dashboard');
      }
    });
    
    // Initialize template
    const savedState = loadLayoutState('demo3');
    if (savedState && savedState.currentTemplate) {
      templateSelect.value = savedState.currentTemplate;
      demo3Controller.createTemplate(savedState.currentTemplate);
      if (savedState.filledSlots) {
        demo3Controller.restoreSlots(savedState.filledSlots);
      }
    } else {
      demo3Controller.createTemplate('dashboard');
    }
  }
}

// Export/Import helper functions
function exportLayout(demoId: string) {
  const layout = layoutEngines[demoId].exportLayout();
  const layoutJson = JSON.stringify(layout, null, 2);
  navigator.clipboard.writeText(layoutJson).then(() => {
    const button = document.getElementById(`export-layout-btn-${demoId.slice(-1)}`)!;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#28a745';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  }).catch(() => alert('Failed to copy layout to clipboard.'));
}

function importLayout(demoId: string) {
  currentImportDemo = demoId;
  const importModal = document.getElementById('import-modal')!;
  importModal.classList.add('show');
  const importTextarea = document.getElementById('import-textarea') as HTMLTextAreaElement;
  const importError = document.getElementById('import-error')!;
  importTextarea.value = '';
  importError.classList.remove('show');
  importTextarea.focus();
}

// Demo3 controller
const demo3Controller = {
  currentTemplate: null as string | null,
  templateSlots: [] as HTMLElement[],
  
  createTemplate(templateType: string) {
    this.clearTemplate();
    this.currentTemplate = templateType;
    
    const templates = {
      dashboard: [
        { col: 0, row: 0, width: 6, height: 6, label: 'Main Chart' },
        { col: 6, row: 0, width: 6, height: 3, label: 'KPI 1' },
        { col: 6, row: 3, width: 6, height: 3, label: 'KPI 2' }
      ],
      analytics: [
        { col: 0, row: 0, width: 4, height: 6, label: 'Chart 1' },
        { col: 4, row: 0, width: 4, height: 6, label: 'Chart 2' },
        { col: 8, row: 0, width: 4, height: 6, label: 'Chart 3' }
      ],
      report: [
        { col: 0, row: 0, width: 12, height: 2, label: 'Header' },
        { col: 0, row: 2, width: 12, height: 8, label: 'Main Content' },
        { col: 0, row: 10, width: 12, height: 2, label: 'Footer' }
      ],
      'kpi-grid': [
        { col: 0, row: 0, width: 4, height: 3, label: 'KPI 1' },
        { col: 4, row: 0, width: 4, height: 3, label: 'KPI 2' },
        { col: 8, row: 0, width: 4, height: 3, label: 'KPI 3' },
        { col: 0, row: 3, width: 4, height: 3, label: 'KPI 4' },
        { col: 4, row: 3, width: 4, height: 3, label: 'KPI 5' },
        { col: 8, row: 3, width: 4, height: 3, label: 'KPI 6' }
      ]
    };
    
    const canvas = document.getElementById('canvas-3')!;
    const slots = templates[templateType as keyof typeof templates] || [];
    
    slots.forEach((slot, index) => {
      const slotElement = document.createElement('div');
      slotElement.className = 'template-slot';
      slotElement.textContent = `+ ${slot.label}`;
      slotElement.dataset.slotIndex = index.toString();
      
      const canvasRect = canvas.getBoundingClientRect();
      const cellWidth = (canvasRect.width - 30 - (11 * 8)) / 12;
      const cellHeight = 50;
      
      const x = slot.col * cellWidth + (slot.col * 8);
      const y = slot.row * cellHeight + (slot.row * 8);
      const width = slot.width * cellWidth + (slot.width - 1) * 8;
      const height = slot.height * cellHeight + (slot.height - 1) * 8;
      
      slotElement.style.left = `${x + 15}px`;
      slotElement.style.top = `${y + 15}px`;
      slotElement.style.width = `${width}px`;
      slotElement.style.height = `${height}px`;
      
      slotElement.addEventListener('click', () => {
        if (!slotElement.classList.contains('filled')) {
          slotElement.textContent = slot.label;
          slotElement.classList.add('filled');
        } else {
          slotElement.textContent = `+ ${slot.label}`;
          slotElement.classList.remove('filled');
        }
        this.saveState();
      });
      
      canvas.appendChild(slotElement);
      this.templateSlots.push(slotElement);
    });
    
    this.saveState();
  },
  
  clearTemplate() {
    this.templateSlots.forEach(slot => slot.remove());
    this.templateSlots = [];
  },
  
  saveState() {
    saveLayoutState('demo3', {
      currentTemplate: this.currentTemplate,
      filledSlots: this.templateSlots.map((slot, index) => ({
        index,
        filled: slot.classList.contains('filled'),
        label: slot.textContent
      }))
    });
  },
  
  restoreSlots(filledSlots: any[]) {
    filledSlots.forEach((slotData: any) => {
      if (slotData.filled && this.templateSlots[slotData.index]) {
        this.templateSlots[slotData.index].classList.add('filled');
        this.templateSlots[slotData.index].textContent = slotData.label;
      }
    });
  }
};

// Initialize layout engines only (without event listeners)
layoutEngines['demo1'] = new LayoutEngine('canvas-1');
layoutEngines['demo1'].setReflowEnabled(true);
setupAutoSave('demo1', layoutEngines['demo1']);

layoutEngines['demo2'] = new LayoutEngine('canvas-2');
layoutEngines['demo2'].setReflowEnabled(false);
setupAutoSave('demo2', layoutEngines['demo2']);

// Initialize modals
modals['demo1'] = new Modal(
  'component-modal',
  () => layoutEngines['demo1'].addComponent('chart'),
  () => layoutEngines['demo1'].addComponent('kpi')
);
modals['demo2'] = new Modal(
  'component-modal',
  () => layoutEngines['demo2'].addComponent('chart'),
  () => layoutEngines['demo2'].addComponent('kpi')
);

// Initialize with demo1
switchDemo('demo1');

// Tab event listeners
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const demoId = btn.getAttribute('data-demo')!;
    switchDemo(demoId);
  });
});

// Task navigation functionality
const taskImages = ['/dash-1.png', '/dash-2.png'];
let currentTaskIndex = 0;

function updateTaskDisplay() {
  const taskImage = document.getElementById('task-image') as HTMLImageElement;
  const taskCounter = document.getElementById('task-counter')!;
  const prevBtn = document.getElementById('task-prev') as HTMLButtonElement;
  const nextBtn = document.getElementById('task-next') as HTMLButtonElement;
  
  // Update image
  taskImage.src = taskImages[currentTaskIndex];
  
  // Update counter
  taskCounter.textContent = `${currentTaskIndex + 1} / ${taskImages.length}`;
  
  // Update button states
  prevBtn.disabled = currentTaskIndex === 0;
  nextBtn.disabled = currentTaskIndex === taskImages.length - 1;
}

// Task navigation event listeners
document.getElementById('task-prev')!.addEventListener('click', () => {
  if (currentTaskIndex > 0) {
    currentTaskIndex--;
    updateTaskDisplay();
  }
});

document.getElementById('task-next')!.addEventListener('click', () => {
  if (currentTaskIndex < taskImages.length - 1) {
    currentTaskIndex++;
    updateTaskDisplay();
  }
});

// Initialize task display
updateTaskDisplay();

// Expose for API access
(window as any).layoutEngines = layoutEngines;
(window as any).switchDemo = switchDemo;
(window as any).taskImages = taskImages;
(window as any).setTask = (index: number) => {
  if (index >= 0 && index < taskImages.length) {
    currentTaskIndex = index;
    updateTaskDisplay();
  }
};

// Export/Import functionality for Demo 1
document.getElementById('export-layout-btn-1')!.addEventListener('click', async () => {
  try {
    const layout = layoutEngines['demo1'].exportLayout();
    const layoutJson = JSON.stringify(layout, null, 2);
    
    await navigator.clipboard.writeText(layoutJson);
    
    const button = document.getElementById('export-layout-btn-1')!;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to export layout:', error);
    alert('Failed to copy layout to clipboard.');
  }
});

// Export/Import functionality for Demo 2
document.getElementById('export-layout-btn-2')!.addEventListener('click', async () => {
  try {
    const layout = layoutEngines['demo2'].exportLayout();
    const layoutJson = JSON.stringify(layout, null, 2);
    
    await navigator.clipboard.writeText(layoutJson);
    
    const button = document.getElementById('export-layout-btn-2')!;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to export layout:', error);
    alert('Failed to copy layout to clipboard.');
  }
});


// Import layout functionality
const importModal = document.getElementById('import-modal')!;
const importTextarea = document.getElementById('import-textarea') as HTMLTextAreaElement;
const importError = document.getElementById('import-error')!;

let currentImportDemo = 'demo1';

function setupImportFor(demoId: string, buttonId: string) {
  document.getElementById(buttonId)!.addEventListener('click', () => {
    currentImportDemo = demoId;
    importModal.classList.add('show');
    importTextarea.value = '';
    importError.classList.remove('show');
    importTextarea.focus();
  });
}

setupImportFor('demo1', 'import-layout-btn-1');
setupImportFor('demo2', 'import-layout-btn-2');

document.getElementById('import-cancel-btn')!.addEventListener('click', () => {
  importModal.classList.remove('show');
});

document.getElementById('import-confirm-btn')!.addEventListener('click', () => {
  try {
    const layoutJson = importTextarea.value.trim();
    if (!layoutJson) {
      throw new Error('Please paste a layout JSON');
    }
    
    const layoutState = JSON.parse(layoutJson);
    
    // Basic validation
    if (!layoutState.components || !Array.isArray(layoutState.components)) {
      throw new Error('Invalid layout format: missing components array');
    }
    
    // Import the layout to current demo
    layoutEngines[currentImportDemo].importLayout(layoutState);
    
    // Close modal and show success
    importModal.classList.remove('show');
    
    const button = document.getElementById(`import-layout-btn-${currentImportDemo.slice(-1)}`)!;
    const originalText = button.textContent;
    button.textContent = 'Imported!';
    button.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
    
  } catch (error) {
    importError.textContent = `Error: ${(error as Error).message}`;
    importError.classList.add('show');
  }
});

// Close import modal when clicking outside
importModal.addEventListener('click', (e) => {
  if (e.target === importModal) {
    importModal.classList.remove('show');
  }
});