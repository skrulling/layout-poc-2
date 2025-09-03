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
          <button class="tab-button" data-demo="demo3">Demo 3: Dashboard</button>
        </div>
      </div>
      
      <div class="task-navigator">
        <div class="task-left">
          <h3>Challenge</h3>
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
          <div id="single-image-display" class="single-image-display">
            <img id="task-image" src="/dash-1.png" alt="Task Layout" />
          </div>
          <div id="dual-image-display" class="dual-image-display" style="display: none;">
            <img id="task-image-1" src="/dash-3.png" alt="First Task Layout" />
            <div class="arrow-container">
              <span class="arrow">→</span>
            </div>
            <img id="task-image-2" src="/dash-1.png" alt="Target Task Layout" />
          </div>
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
        <div id="canvas-3" class="canvas template-canvas">
          <div id="container"></div>
        </div>
      </div>
    </div>
  </div>

  <div id="component-modal" class="modal">
    <div class="modal-content">
      <h3>Select Component Type</h3>
      <button id="add-chart" class="btn btn-chart">Chart (6x6)</button>
      <button id="add-kpi" class="btn btn-kpi">KPI (2x3)</button>
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
      <button id="add-component-btn-1" class="btn btn-add-component">Add Component</button>
      <button id="clear-canvas-btn-1" class="btn btn-warning">Clear Canvas</button>
      <button id="export-layout-btn-1" class="btn btn-secondary">Export Layout</button>
      <button id="import-layout-btn-1" class="btn btn-secondary">Import Layout</button>
    `;
  } else if (demoId === 'demo2') {
    canvasControls.innerHTML = `
      <button id="add-component-btn-2" class="btn btn-add-component">Add Component</button>
      <button id="clear-canvas-btn-2" class="btn btn-warning">Clear Canvas</button>
      <button id="export-layout-btn-2" class="btn btn-secondary">Export Layout</button>
      <button id="import-layout-btn-2" class="btn btn-secondary">Import Layout</button>
    `;
  } else if (demoId === 'demo3') {
    canvasControls.innerHTML = `
      <div class="dashboard-info">
        <p>Highsoft Dashboards Demo - Interactive dashboard with drag & drop layout editing</p>
      </div>
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
  
  // Update current demo first
  currentDemo = demoId;
  
  // Reinitialize modal for current demo
  initializeModal();
  
  // Update canvas controls
  updateCanvasControls(demoId);
}

// Attach event listeners for each demo
function attachDemoEventListeners(demoId: string) {
  if (demoId === 'demo1') {
    document.getElementById('add-component-btn-1')?.addEventListener('click', () => componentModal.show());
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
    document.getElementById('add-component-btn-2')?.addEventListener('click', () => componentModal.show());
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
    // Load and initialize dashboard
    initializeDashboardDemo();
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

// Dashboard initialization function
function initializeDashboardDemo() {
  // Check if dash.js is already loaded
  if ((window as any).initializeDashboard) {
    (window as any).initializeDashboard();
    return;
  }
  
  // Load dash.js script
  const script = document.createElement('script');
  script.src = '/src/dash.js';
  script.onload = () => {
    // Call the initialization function once the script is loaded
    if ((window as any).initializeDashboard) {
      (window as any).initializeDashboard();
    }
  };
  document.head.appendChild(script);
}

// Initialize layout engines only (without event listeners)
layoutEngines['demo1'] = new LayoutEngine('canvas-1');
layoutEngines['demo1'].setReflowEnabled(true);
setupAutoSave('demo1', layoutEngines['demo1']);

layoutEngines['demo2'] = new LayoutEngine('canvas-2');
layoutEngines['demo2'].setReflowEnabled(false);
setupAutoSave('demo2', layoutEngines['demo2']);

// Initialize single modal that works with current demo
let componentModal: Modal;

function initializeModal() {
  if (!componentModal) {
    // Create modal only once
    componentModal = new Modal(
      'component-modal',
      () => layoutEngines[currentDemo].addComponent('chart'),
      () => layoutEngines[currentDemo].addComponent('kpi')
    );
  } else {
    // Update callbacks for current demo
    componentModal.updateCallbacks(
      () => layoutEngines[currentDemo].addComponent('chart'),
      () => layoutEngines[currentDemo].addComponent('kpi')
    );
  }
}

// Initialize modal and start with demo1
initializeModal();
switchDemo('demo1');

// Tab event listeners
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const demoId = btn.getAttribute('data-demo')!;
    switchDemo(demoId);
  });
});

// Task navigation functionality
const taskImages = ['/dash-1.png', '/dash-2.png', '/dash-3.png'];
const taskTexts = [
  'Create the displayed layout',
  'Create the displayed layout', 
  'First create the first layout, then adjust it to match the second'
];
let currentTaskIndex = 0;

function updateTaskDisplay() {
  const taskImage = document.getElementById('task-image') as HTMLImageElement;
  const taskCounter = document.getElementById('task-counter')!;
  const taskText = document.getElementById('task-text')!;
  const prevBtn = document.getElementById('task-prev') as HTMLButtonElement;
  const nextBtn = document.getElementById('task-next') as HTMLButtonElement;
  const singleImageDisplay = document.getElementById('single-image-display')!;
  const dualImageDisplay = document.getElementById('dual-image-display')!;
  
  // Update task text
  taskText.textContent = taskTexts[currentTaskIndex];
  
  // Update counter
  taskCounter.textContent = `${currentTaskIndex + 1} / ${taskImages.length}`;
  
  // Show appropriate image display based on task
  if (currentTaskIndex === 2) { // Task 3 (0-indexed) - show dual images
    singleImageDisplay.style.display = 'none';
    dualImageDisplay.style.display = 'flex';
  } else { // Tasks 1 & 2 - show single image
    singleImageDisplay.style.display = 'block';
    dualImageDisplay.style.display = 'none';
    taskImage.src = taskImages[currentTaskIndex];
  }
  
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