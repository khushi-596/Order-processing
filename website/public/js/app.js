/* ═══════════════════════════════════════════════════════
   OrderFlow — Application Logic
   ═══════════════════════════════════════════════════════ */

const API = '';

// ─── NAVIGATION ───────────────────────────────────────

let currentPage = 'dashboard';
const pageTitles = {
  dashboard: { title: 'Dashboard',     subtitle: 'Overview of your delivery operations' },
  orders:    { title: 'Orders',        subtitle: 'Manage and track all orders' },
  map:       { title: 'Delivery Map',  subtitle: 'Visualize routes and network' },
  add:       { title: 'New Order',     subtitle: 'Create a new delivery order' }
};

// Dijkstra distances (pre-computed for priority preview)
const dijkstraDistances = { 0: 0, 1: 10, 2: 22, 3: 26, 4: 17, 5: 31, 6: 37, 7: 28, 8: 22, 9: 12, 10: 8, 11: 23 };

function navigateTo(page) {
  currentPage = page;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
    targetPage.classList.add('active');
    // Re-trigger animation
    targetPage.style.animation = 'none';
    targetPage.offsetHeight;
    targetPage.style.animation = '';
  }

  // Update topbar
  const info = pageTitles[page];
  if (info) {
    document.getElementById('page-title').textContent = info.title;
    document.getElementById('page-subtitle').textContent = info.subtitle;
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Page-specific init
  if (page === 'dashboard') loadDashboard();
  if (page === 'orders') loadOrders();
  if (page === 'map') drawDeliveryMap();
}

// Hash-based routing
function initRouter() {
  window.addEventListener('hashchange', () => {
    const page = location.hash.slice(1) || 'dashboard';
    navigateTo(page);
  });

  // Nav link clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      location.hash = page;
    });
  });

  // Mobile menu
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Initial route
  const startPage = location.hash.slice(1) || 'dashboard';
  navigateTo(startPage);
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" class="toast-icon"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span class="toast-message">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── ANIMATED COUNTER ─────────────────────────────────

function animateCounter(element, target) {
  const start = parseInt(element.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (target - start) * eased);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ─── DASHBOARD ────────────────────────────────────────

async function loadDashboard() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const data = await res.json();

    // Animate stat counters
    animateCounter(document.querySelector('#stat-total .stat-number'), data.total);
    animateCounter(document.querySelector('#stat-pending .stat-number'), data.pending);
    animateCounter(document.querySelector('#stat-processed .stat-number'), data.processed);
    animateCounter(document.querySelector('#stat-canceled .stat-number'), data.canceled);

    // Recent orders
    const recentEl = document.getElementById('recent-orders-list');
    if (data.recentOrders && data.recentOrders.length > 0) {
      recentEl.innerHTML = data.recentOrders.map(o => `
        <div class="recent-order-item">
          <div class="recent-order-left">
            <div class="order-avatar">${o.orderID}</div>
            <div class="recent-order-info">
              <span class="recent-order-id">#${o.orderID}</span>
              <span class="recent-order-loc">${o.locationName}</span>
            </div>
          </div>
          <span class="badge badge-${o.status.toLowerCase()}">${o.status}</span>
        </div>
      `).join('');
    } else {
      recentEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <p>No orders yet</p>
          <button class="btn btn-primary btn-sm" onclick="navigateTo('add')">Create First Order</button>
        </div>`;
    }

    // Zone stats
    const zoneEl = document.getElementById('location-stats');
    if (data.locationStats && data.locationStats.length > 0) {
      const maxCount = Math.max(...data.locationStats.map(s => s.count));
      zoneEl.innerHTML = data.locationStats.map(s => `
        <div class="zone-bar-item">
          <span class="zone-bar-name">${s.locationName}</span>
          <div class="zone-bar-track">
            <div class="zone-bar-fill" style="width: ${(s.count / maxCount) * 100}%"></div>
          </div>
          <span class="zone-bar-count">${s.count}</span>
        </div>
      `).join('');
    } else {
      zoneEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <rect x="3" y="12" width="4" height="8" rx="1"/>
            <rect x="10" y="8" width="4" height="12" rx="1"/>
            <rect x="17" y="4" width="4" height="16" rx="1"/>
          </svg>
          <p>No zone data available</p>
        </div>`;
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// ─── ORDERS ───────────────────────────────────────────

let currentFilter = 'all';
let searchDebounce = null;

async function loadOrders() {
  try {
    const params = new URLSearchParams();
    if (currentFilter !== 'all') params.append('status', currentFilter);
    const searchVal = document.getElementById('order-search').value.trim();
    if (searchVal) params.append('search', searchVal);

    const res = await fetch(`${API}/api/orders?${params}`);
    const orders = await res.json();

    const tbody = document.getElementById('orders-tbody');
    const emptyEl = document.getElementById('orders-empty');
    const tableEl = document.querySelector('.orders-table');

    if (orders.length === 0) {
      tbody.innerHTML = '';
      tableEl.style.display = 'none';
      emptyEl.style.display = 'block';
    } else {
      tableEl.style.display = '';
      emptyEl.style.display = 'none';
      tbody.innerHTML = orders.map(o => `
        <tr>
          <td class="order-id-cell">#${o.orderID}</td>
          <td>${o.locationName}</td>
          <td>
            <span style="display:inline-flex;align-items:center;gap:4px;">
              ${generateUrgencyDots(o.urgency)}
              <span style="font-size:0.75rem;color:var(--gray-400);margin-left:2px;">${o.urgency}</span>
            </span>
          </td>
          <td class="order-value-cell">₹${o.value.toFixed(2)}</td>
          <td>${o.deadline} min</td>
          <td class="order-priority-cell">${o.priority.toFixed(1)}</td>
          <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
          <td class="order-actions">
            <button class="action-btn action-btn-view" onclick="viewOrder(${o.orderID})">View</button>
            ${o.status === 'Pending' ? `<button class="action-btn action-btn-cancel" onclick="cancelOrder(${o.orderID})">Cancel</button>` : ''}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load orders:', err);
  }
}

function generateUrgencyDots(urgency) {
  const filled = Math.min(urgency, 10);
  let html = '';
  for (let i = 0; i < 5; i++) {
    const isFilled = i < Math.ceil(filled / 2);
    html += `<span style="width:6px;height:6px;border-radius:50%;background:${isFilled ? 'var(--warning-500)' : 'var(--gray-200)'};display:inline-block;"></span>`;
  }
  return html;
}

// Filter tabs
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      loadOrders();
    });
  });

  // Search debounce
  document.getElementById('order-search').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadOrders, 300);
  });
});

// View order modal
async function viewOrder(id) {
  try {
    const res = await fetch(`${API}/api/orders/${id}`);
    if (!res.ok) {
      showToast(`Order #${id} not found`, 'error');
      return;
    }
    const order = await res.json();

    document.getElementById('modal-title').textContent = `Order #${order.orderID}`;
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Location</span>
        <span class="modal-detail-value">${order.locationName} (Zone ${order.location})</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Urgency</span>
        <span class="modal-detail-value">${order.urgency} / 10</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Order Value</span>
        <span class="modal-detail-value">₹${order.value.toFixed(2)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Deadline</span>
        <span class="modal-detail-value">${order.deadline} minutes</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Priority Score</span>
        <span class="modal-detail-value" style="color:var(--primary-600);font-weight:700;">${order.priority.toFixed(2)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Route Time</span>
        <span class="modal-detail-value">${order.routeTime} minutes from warehouse</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Status</span>
        <span class="badge badge-${order.status.toLowerCase()}">${order.status}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Created</span>
        <span class="modal-detail-value">${new Date(order.created_at).toLocaleString()}</span>
      </div>
    `;

    document.getElementById('order-modal').style.display = 'flex';
  } catch (err) {
    showToast('Failed to load order details', 'error');
  }
}

function closeModal() {
  document.getElementById('order-modal').style.display = 'none';
}

function closeProcessModal() {
  document.getElementById('process-modal').style.display = 'none';
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
});

// Cancel order
async function cancelOrder(id) {
  try {
    const res = await fetch(`${API}/api/orders/${id}/cancel`, { method: 'PATCH' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }

    showToast(`Order #${id} canceled successfully`, 'success');
    loadOrders();
    if (currentPage === 'dashboard') loadDashboard();
  } catch (err) {
    showToast('Failed to cancel order', 'error');
  }
}

// Process next order
async function processNextOrder() {
  try {
    const res = await fetch(`${API}/api/orders/process`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }

    showToast(`Order #${data.order.orderID} dispatched!`, 'success');

    // Show process result modal
    const pathHtml = data.route.path.map((n, i) => {
      const isLast = i === data.route.path.length - 1;
      return `<span class="route-node">${n.name}</span>${isLast ? '' : '<span class="route-arrow">→</span>'}`;
    }).join('');

    document.getElementById('process-modal-body').innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:3rem;margin-bottom:4px;">🚚</div>
        <div style="font-size:1rem;color:var(--gray-500);">Order <strong>#${data.order.orderID}</strong> has been dispatched</div>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Destination</span>
        <span class="modal-detail-value">${data.order.locationName}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Priority Score</span>
        <span class="modal-detail-value" style="color:var(--primary-600);">${data.order.priority.toFixed(2)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Estimated Time</span>
        <span class="modal-detail-value" style="font-weight:700;color:var(--success-600);">${data.route.time} minutes</span>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:0.8rem;color:var(--gray-500);margin-bottom:8px;font-weight:600;">Optimal Route:</div>
        <div class="route-path">${pathHtml}</div>
      </div>
    `;

    document.getElementById('process-modal').style.display = 'flex';

    // Refresh pages
    if (currentPage === 'dashboard') loadDashboard();
    if (currentPage === 'orders') loadOrders();
  } catch (err) {
    showToast('Failed to process order', 'error');
  }
}

// ─── ADD ORDER ────────────────────────────────────────

function updateUrgencyLabel(val) {
  document.getElementById('urgency-value').textContent = val;
}

function updatePriorityPreview() {
  const locationRadio = document.querySelector('input[name="location"]:checked');
  const urgency  = parseInt(document.getElementById('order-urgency').value) || 0;
  const value    = parseFloat(document.getElementById('order-value').value) || 0;
  const deadline = parseInt(document.getElementById('order-deadline').value) || 0;

  const location = locationRadio ? parseInt(locationRadio.value) : 0;
  const graphDistance = location > 0 ? (dijkstraDistances[location] || 0) : 0;

  const urgencyScore    = urgency  * 5.0;
  const valueScore      = value    * 2.0;
  const deadlineScore   = deadline * 3.0;
  const distancePenalty = graphDistance * 1.0;
  const priority = urgencyScore + valueScore + deadlineScore - distancePenalty;

  // Update breakdown
  document.getElementById('bd-urgency').textContent  = `+${urgencyScore.toFixed(1)}`;
  document.getElementById('bd-value').textContent    = `+${valueScore.toFixed(1)}`;
  document.getElementById('bd-deadline').textContent = `+${deadlineScore.toFixed(1)}`;
  document.getElementById('bd-distance').textContent = location > 0 ? `-${distancePenalty.toFixed(1)}` : '—';

  // Update priority display
  const displayPriority = Math.max(0, priority);
  document.getElementById('priority-value-text').textContent = displayPriority.toFixed(0);

  // Update ring
  const maxPriority = 500; // reasonable max for visual
  const fraction = Math.min(displayPriority / maxPriority, 1);
  const circumference = 2 * Math.PI * 54; // radius = 54
  const offset = circumference * (1 - fraction);
  document.getElementById('priority-ring').setAttribute('stroke-dashoffset', offset);
}

// Listen to zone picker changes for priority preview
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="location"]').forEach(radio => {
    radio.addEventListener('change', updatePriorityPreview);
  });
});

async function submitOrder(e) {
  e.preventDefault();

  const locationRadio = document.querySelector('input[name="location"]:checked');
  if (!locationRadio) {
    showToast('Please select a delivery zone', 'error');
    return;
  }

  const body = {
    location: parseInt(locationRadio.value),
    urgency:  parseInt(document.getElementById('order-urgency').value),
    value:    parseFloat(document.getElementById('order-value').value),
    deadline: parseInt(document.getElementById('order-deadline').value)
  };

  try {
    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }

    showToast(`Order #${data.orderID} created! Priority: ${data.priority.toFixed(1)}`, 'success');

    // Reset form
    document.getElementById('add-order-form').reset();
    document.getElementById('urgency-value').textContent = '5';
    document.getElementById('priority-value-text').textContent = '—';
    document.getElementById('priority-ring').setAttribute('stroke-dashoffset', '339.29');
    document.getElementById('bd-urgency').textContent = '—';
    document.getElementById('bd-value').textContent = '—';
    document.getElementById('bd-deadline').textContent = '—';
    document.getElementById('bd-distance').textContent = '—';

    // Navigate to orders
    setTimeout(() => navigateTo('orders'), 800);
  } catch (err) {
    showToast('Failed to create order', 'error');
  }
}

// ─── DELIVERY MAP ─────────────────────────────────────

const nodePositions = {
  0:  { x: 500, y: 70,  label: 'Central Warehouse' },
  1:  { x: 340, y: 190, label: 'MG Road' },
  2:  { x: 340, y: 360, label: 'Koramangala' },
  3:  { x: 860, y: 250, label: 'Whitefield' },
  4:  { x: 540, y: 250, label: 'Indiranagar' },
  5:  { x: 180, y: 450, label: 'Jayanagar' },
  6:  { x: 500, y: 580, label: 'Electronic City' },
  7:  { x: 500, y: 440, label: 'HSR Layout' },
  8:  { x: 740, y: 300, label: 'Marathahalli' },
  9:  { x: 160, y: 160, label: 'Rajajinagar' },
  10: { x: 700, y: 100, label: 'Hebbal' },
  11: { x: 180, y: 580, label: 'Banashankari' }
};

const graphEdges = [
  { from: 0, to: 1,  weight: 10 },
  { from: 0, to: 9,  weight: 12 },
  { from: 0, to: 10, weight: 8  },
  { from: 1, to: 4,  weight: 7  },
  { from: 1, to: 2,  weight: 12 },
  { from: 1, to: 9,  weight: 14 },
  { from: 2, to: 5,  weight: 9  },
  { from: 2, to: 7,  weight: 6  },
  { from: 3, to: 8,  weight: 8  },
  { from: 3, to: 10, weight: 18 },
  { from: 4, to: 8,  weight: 10 },
  { from: 4, to: 2,  weight: 11 },
  { from: 5, to: 11, weight: 7  },
  { from: 5, to: 7,  weight: 10 },
  { from: 6, to: 7,  weight: 9  },
  { from: 6, to: 11, weight: 15 },
  { from: 8, to: 10, weight: 14 },
  { from: 9, to: 11, weight: 11 }
];

let highlightedPath = [];

function drawDeliveryMap() {
  const canvas = document.getElementById('delivery-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = 1000 * dpr;
  canvas.height = 650 * dpr;
  canvas.style.width = '1000px';
  canvas.style.height = '650px';
  ctx.scale(dpr, dpr);

  // Clear
  ctx.clearRect(0, 0, 1000, 650);

  // Draw edges
  for (const edge of graphEdges) {
    const from = nodePositions[edge.from];
    const to   = nodePositions[edge.to];

    const isHighlighted = highlightedPath.some((p, i) => {
      if (i === 0) return false;
      return (highlightedPath[i-1] === edge.from && p === edge.to) ||
             (highlightedPath[i-1] === edge.to && p === edge.from);
    });

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (isHighlighted) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Weight label
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;

    ctx.fillStyle = isHighlighted ? '#6366f1' : '#9ca3af';
    ctx.font = `600 ${isHighlighted ? '13' : '11'}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background for label
    const labelText = `${edge.weight} min`;
    const tw = ctx.measureText(labelText).width + 12;
    const th = 20;
    ctx.fillStyle = isHighlighted ? '#eef2ff' : '#f9fafb';
    ctx.beginPath();
    ctx.roundRect(mx - tw/2, my - th/2, tw, th, 4);
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#c7d2fe' : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isHighlighted ? '#4f46e5' : '#9ca3af';
    ctx.fillText(labelText, mx, my);
  }

  // Draw nodes
  for (const [id, pos] of Object.entries(nodePositions)) {
    const nodeId = parseInt(id);
    const isWarehouse = nodeId === 0;
    const isOnPath = highlightedPath.includes(nodeId);
    const radius = isWarehouse ? 26 : 20;

    // Shadow
    ctx.shadowColor = isOnPath ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = isOnPath ? 16 : 8;
    ctx.shadowOffsetY = 2;

    // Node circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

    if (isWarehouse) {
      const grad = ctx.createLinearGradient(pos.x - radius, pos.y - radius, pos.x + radius, pos.y + radius);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad;
    } else if (isOnPath) {
      ctx.fillStyle = '#eef2ff';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = isWarehouse ? 'transparent' : (isOnPath ? '#6366f1' : '#e5e7eb');
    ctx.lineWidth = isOnPath ? 3 : 2;
    ctx.stroke();

    // Node text
    ctx.fillStyle = isWarehouse ? '#ffffff' : (isOnPath ? '#4f46e5' : '#6b7280');
    ctx.font = `700 ${isWarehouse ? '11' : '10'}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isWarehouse ? '🏭' : `Z${id}`, pos.x, pos.y);

    // Label below
    ctx.fillStyle = isOnPath ? '#4f46e5' : '#374151';
    ctx.font = `600 12px Inter, sans-serif`;
    ctx.fillText(pos.label, pos.x, pos.y + radius + 16);
  }
}

async function calculateRoute() {
  const dest = document.getElementById('route-destination').value;
  if (!dest) {
    showToast('Please select a destination zone', 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/api/graph/route/${dest}`);
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error, 'error');
      return;
    }

    // Highlight path on map
    highlightedPath = data.path.map(n => n.id);
    drawDeliveryMap();

    // Show result
    const pathHtml = data.path.map((n, i) => {
      const isLast = i === data.path.length - 1;
      return `<span class="route-node">${n.name}</span>${isLast ? '' : '<span class="route-arrow">→</span>'}`;
    }).join('');

    const resultEl = document.getElementById('route-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="route-time">${data.time} min</div>
      <div class="route-time-label">Shortest travel time from warehouse</div>
      <div class="route-path">${pathHtml}</div>
    `;
  } catch (err) {
    showToast('Failed to calculate route', 'error');
  }
}

// ─── INIT ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initRouter();
});
