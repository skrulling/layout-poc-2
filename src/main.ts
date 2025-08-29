import './style.css'
import { LayoutEngine } from './layout-engine'
import { Modal } from './modal'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <div class="toolbar">
      <button id="add-component-btn" class="btn">Add Component</button>
      <button id="reflow-toggle-btn" class="btn btn-toggle active">Reflow: ON</button>
      <button id="collision-resize-toggle-btn" class="btn btn-toggle">Collision Resize: OFF</button>
      <button id="export-layout-btn" class="btn btn-secondary">Export Layout</button>
      <button id="import-layout-btn" class="btn btn-secondary">Import Layout</button>
    </div>
    <div id="canvas" class="canvas"></div>
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

const layoutEngine = new LayoutEngine('canvas');

// Expose layout engine globally for API access
(window as any).layoutEngine = layoutEngine;

const modal = new Modal(
  'component-modal',
  () => layoutEngine.addComponent('chart'),
  () => layoutEngine.addComponent('kpi')
);

document.getElementById('add-component-btn')!.addEventListener('click', () => {
  modal.show();
});

// Reflow toggle functionality
const reflowToggleBtn = document.getElementById('reflow-toggle-btn')!;
let reflowEnabled = true;

reflowToggleBtn.addEventListener('click', () => {
  reflowEnabled = !reflowEnabled;
  layoutEngine.setReflowEnabled(reflowEnabled);
  
  if (reflowEnabled) {
    reflowToggleBtn.textContent = 'Reflow: ON';
    reflowToggleBtn.classList.add('active');
  } else {
    reflowToggleBtn.textContent = 'Reflow: OFF';
    reflowToggleBtn.classList.remove('active');
  }
});

// Collision resize toggle functionality
const collisionResizeToggleBtn = document.getElementById('collision-resize-toggle-btn')!;
let collisionResizeEnabled = false;

collisionResizeToggleBtn.addEventListener('click', () => {
  collisionResizeEnabled = !collisionResizeEnabled;
  layoutEngine.setCollisionResizeEnabled(collisionResizeEnabled);
  
  if (collisionResizeEnabled) {
    collisionResizeToggleBtn.textContent = 'Collision Resize: ON';
    collisionResizeToggleBtn.classList.add('active');
  } else {
    collisionResizeToggleBtn.textContent = 'Collision Resize: OFF';
    collisionResizeToggleBtn.classList.remove('active');
  }
});

// Export layout functionality
document.getElementById('export-layout-btn')!.addEventListener('click', async () => {
  try {
    const layout = layoutEngine.exportLayout();
    const layoutJson = JSON.stringify(layout, null, 2);
    
    await navigator.clipboard.writeText(layoutJson);
    
    // Show temporary success message
    const button = document.getElementById('export-layout-btn')!;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
    
  } catch (error) {
    console.error('Failed to export layout:', error);
    alert('Failed to copy layout to clipboard. Please try again.');
  }
});

// Import layout functionality
const importModal = document.getElementById('import-modal')!;
const importTextarea = document.getElementById('import-textarea') as HTMLTextAreaElement;
const importError = document.getElementById('import-error')!;

document.getElementById('import-layout-btn')!.addEventListener('click', () => {
  importModal.classList.add('show');
  importTextarea.value = '';
  importError.classList.remove('show');
  importTextarea.focus();
});

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
    
    // Import the layout
    layoutEngine.importLayout(layoutState);
    
    // Close modal and show success
    importModal.classList.remove('show');
    
    const button = document.getElementById('import-layout-btn')!;
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