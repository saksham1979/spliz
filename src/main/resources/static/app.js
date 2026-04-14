/* ============================================
   SPLIZ — Smart Bill Splitting App
   Core Application Logic
   ============================================ */

// ==========================================
// DATA STORE
// ==========================================
const Store = {
    groups: [],
    expenses: [],
    currentTab: 'dashboard',
    currentFilter: 'all',
    currentSplitType: 'equal',
    selectedGroupIcon: '🏠',
    currency: '₹',
    currentDetailExpenseId: null,

    save() {
        localStorage.setItem('spliz_groups', JSON.stringify(this.groups));
        localStorage.setItem('spliz_expenses', JSON.stringify(this.expenses));
        localStorage.setItem('spliz_currency', this.currency);
    },

    load() {
        try {
            const groups = localStorage.getItem('spliz_groups');
            const expenses = localStorage.getItem('spliz_expenses');
            const currency = localStorage.getItem('spliz_currency');
            if (groups) this.groups = JSON.parse(groups);
            if (expenses) this.expenses = JSON.parse(expenses);
            if (currency) this.currency = currency;
        } catch (e) {
            console.error('Failed to load data:', e);
        }
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatAmount(amount) {
    const num = parseFloat(amount) || 0;
    return `${Store.currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'short', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
}

function getCategoryEmoji(cat) {
    const emojis = { food: '🍕', transport: '🚗', entertainment: '🎬', shopping: '🛍️', bills: '📄', travel: '✈️', other: '📦' };
    return emojis[cat] || '📦';
}

function getCategoryLabel(cat) {
    const labels = { food: 'Food & Drinks', transport: 'Transport', entertainment: 'Entertainment', shopping: 'Shopping', bills: 'Bills & Utilities', travel: 'Travel', other: 'Other' };
    return labels[cat] || 'Other';
}

const AVATAR_COLORS = [
    'linear-gradient(135deg, #a78bfa, #6d28d9)',
    'linear-gradient(135deg, #f97316, #ea580c)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #14b8a6, #0d9488)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name) {
    return name.charAt(0).toUpperCase();
}

// ==========================================
// TAB NAVIGATION
// ==========================================
function switchTab(tabName) {
    Store.currentTab = tabName;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });

    // Refresh tab data
    switch(tabName) {
        case 'dashboard': refreshDashboard(); break;
        case 'groups': refreshGroups(); break;
        case 'expenses': refreshExpenses(); break;
        case 'settle': refreshSettle(); break;
        case 'analytics': refreshAnalytics(); break;
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==========================================
// CONFETTI ANIMATION
// ==========================================
function showConfetti() {
    const colors = ['#a78bfa', '#6d28d9', '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#f59e0b'];
    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 2 + 's';
        piece.style.animationDuration = (2 + Math.random() * 2) + 's';
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 5000);
    }
}

// ==========================================
// THEME TOGGLE
// ==========================================
function initTheme() {
    const saved = localStorage.getItem('spliz_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('spliz_theme', next);
}

// ==========================================
// CURRENCY
// ==========================================
function initCurrency() {
    const select = document.getElementById('currency-select');
    select.value = Store.currency;
    select.addEventListener('change', (e) => {
        Store.currency = e.target.value;
        Store.save();
        refreshAll();
    });
}

// ==========================================
// GROUP MANAGEMENT
// ==========================================
function showGroupModal() {
    document.getElementById('group-modal').classList.add('active');
    document.getElementById('group-name').value = '';
    document.getElementById('new-member-input').value = '';
    Store.selectedGroupIcon = '🏠';
    
    // Reset icon picker
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.icon === '🏠');
    });
    
    // Reset members
    const area = document.getElementById('members-input-area');
    area.innerHTML = `
        <div class="member-tag" data-member="You">
            <span class="member-avatar" style="background: ${getAvatarColor('You')}">Y</span>
            <span>You</span>
        </div>
    `;
}

function closeGroupModal() {
    document.getElementById('group-modal').classList.remove('active');
}

function selectGroupIcon(btn) {
    document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Store.selectedGroupIcon = btn.dataset.icon;
}

function addMember() {
    const input = document.getElementById('new-member-input');
    const name = input.value.trim();
    
    if (!name) return;
    
    // Check duplicate
    const area = document.getElementById('members-input-area');
    const existing = Array.from(area.querySelectorAll('.member-tag')).map(t => t.dataset.member.toLowerCase());
    if (existing.includes(name.toLowerCase())) {
        showToast('Member already added!', 'error');
        return;
    }
    
    const tag = document.createElement('div');
    tag.className = 'member-tag';
    tag.dataset.member = name;
    tag.innerHTML = `
        <span class="member-avatar" style="background: ${getAvatarColor(name)}">${getInitial(name)}</span>
        <span>${name}</span>
        <span class="remove-member" onclick="removeMember(this)">✕</span>
    `;
    area.appendChild(tag);
    input.value = '';
    input.focus();
}

function removeMember(el) {
    el.closest('.member-tag').remove();
}

function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    if (!name) {
        showToast('Please enter a group name', 'error');
        return;
    }
    
    const area = document.getElementById('members-input-area');
    const members = Array.from(area.querySelectorAll('.member-tag')).map(t => t.dataset.member);
    
    if (members.length < 2) {
        showToast('Add at least one more member', 'error');
        return;
    }
    
    const group = {
        id: generateId(),
        name,
        icon: Store.selectedGroupIcon,
        members,
        createdAt: new Date().toISOString()
    };
    
    Store.groups.push(group);
    Store.save();
    closeGroupModal();
    showToast(`Group "${name}" created!`);
    showConfetti();
    refreshAll();
}

function deleteGroup(groupId) {
    if (!confirm('Delete this group and all its expenses?')) return;
    
    Store.groups = Store.groups.filter(g => g.id !== groupId);
    Store.expenses = Store.expenses.filter(e => e.groupId !== groupId);
    Store.save();
    showToast('Group deleted', 'info');
    refreshAll();
}

function refreshGroups() {
    const grid = document.getElementById('groups-grid');
    const empty = document.getElementById('groups-empty');
    
    if (Store.groups.length === 0) {
        grid.innerHTML = '';
        grid.appendChild(empty);
        empty.style.display = 'flex';
        return;
    }
    
    grid.innerHTML = Store.groups.map(group => {
        const groupExpenses = Store.expenses.filter(e => e.groupId === group.id);
        const totalSpent = groupExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        return `
            <div class="group-card" id="group-${group.id}">
                <div class="group-card-header">
                    <div class="group-card-icon">${group.icon}</div>
                    <div class="group-card-info">
                        <h3>${group.name}</h3>
                        <span>${group.members.length} members</span>
                    </div>
                </div>
                <div class="group-members-preview">
                    ${group.members.slice(0, 5).map(m => `
                        <div class="member-avatar-small" style="background: ${getAvatarColor(m)}" title="${m}">${getInitial(m)}</div>
                    `).join('')}
                    ${group.members.length > 5 ? `<div class="member-avatar-small" style="background: var(--bg-tertiary)">+${group.members.length - 5}</div>` : ''}
                </div>
                <div class="group-card-stats">
                    <div class="group-stat">
                        <div class="group-stat-value">${formatAmount(totalSpent)}</div>
                        <div class="group-stat-label">Total Spent</div>
                    </div>
                    <div class="group-stat">
                        <div class="group-stat-value">${groupExpenses.length}</div>
                        <div class="group-stat-label">Expenses</div>
                    </div>
                    <div class="group-stat">
                        <div class="group-stat-value">${formatAmount(totalSpent / group.members.length)}</div>
                        <div class="group-stat-label">Per Person</div>
                    </div>
                </div>
                <div class="group-card-actions">
                    <button class="btn btn-primary" onclick="addExpenseToGroup('${group.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Expense
                    </button>
                    <button class="btn btn-danger" onclick="deleteGroup('${group.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// EXPENSE MANAGEMENT
// ==========================================
function showExpenseModal(groupId = null) {
    const modal = document.getElementById('expense-modal');
    modal.classList.add('active');
    
    // Reset form
    document.getElementById('expense-description').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-notes').value = '';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-currency-prefix').textContent = Store.currency;
    
    // Populate groups dropdown
    const groupSelect = document.getElementById('expense-group');
    groupSelect.innerHTML = '<option value="">Select a group</option>' + 
        Store.groups.map(g => `<option value="${g.id}" ${g.id === groupId ? 'selected' : ''}>${g.icon} ${g.name}</option>`).join('');
    
    if (groupId) {
        onExpenseGroupChange();
    } else {
        document.getElementById('expense-paid-by').innerHTML = '<option value="">Select who paid</option>';
        document.getElementById('split-members').innerHTML = '<p class="split-hint">Select a group first to see members</p>';
    }
    
    Store.currentSplitType = 'equal';
    document.querySelectorAll('.split-tab').forEach(t => t.classList.toggle('active', t.dataset.split === 'equal'));
}

function addExpenseToGroup(groupId) {
    showExpenseModal(groupId);
}

function closeExpenseModal() {
    document.getElementById('expense-modal').classList.remove('active');
}

function onExpenseGroupChange() {
    const groupId = document.getElementById('expense-group').value;
    const group = Store.groups.find(g => g.id === groupId);
    
    if (!group) {
        document.getElementById('expense-paid-by').innerHTML = '<option value="">Select who paid</option>';
        document.getElementById('split-members').innerHTML = '<p class="split-hint">Select a group first to see members</p>';
        return;
    }
    
    // Populate paid by
    document.getElementById('expense-paid-by').innerHTML = 
        group.members.map(m => `<option value="${m}">${m}</option>`).join('');
    
    // Populate split members
    updateSplitMembers(group.members);
}

function setSplitType(type) {
    Store.currentSplitType = type;
    document.querySelectorAll('.split-tab').forEach(t => t.classList.toggle('active', t.dataset.split === type));
    
    const groupId = document.getElementById('expense-group').value;
    const group = Store.groups.find(g => g.id === groupId);
    if (group) updateSplitMembers(group.members);
}

function updateSplitMembers(members) {
    const container = document.getElementById('split-members');
    const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const perPerson = amount / members.length;
    
    container.innerHTML = members.map(m => {
        let amountField = '';
        if (Store.currentSplitType === 'equal') {
            amountField = `<span class="split-member-amount" style="border:none;background:none;color:var(--text-secondary);width:auto">${formatAmount(perPerson)}</span>`;
        } else if (Store.currentSplitType === 'exact') {
            amountField = `<input type="number" class="split-member-amount" data-member="${m}" value="${perPerson.toFixed(2)}" step="0.01" placeholder="0.00">`;
        } else {
            amountField = `<input type="number" class="split-member-amount" data-member="${m}" value="${(100 / members.length).toFixed(1)}" step="0.1" placeholder="0" max="100">
            <span style="color:var(--text-tertiary);font-size:0.8rem">%</span>`;
        }
        
        return `
            <div class="split-member-row">
                <input type="checkbox" class="split-member-check" data-member="${m}" checked>
                <span class="split-member-name">${m}</span>
                ${amountField}
            </div>
        `;
    }).join('');
}

function saveExpense() {
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const groupId = document.getElementById('expense-group').value;
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const paidBy = document.getElementById('expense-paid-by').value;
    const notes = document.getElementById('expense-notes').value.trim();
    
    // Validation
    if (!description) { showToast('Please enter a description', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
    if (!groupId) { showToast('Please select a group', 'error'); return; }
    if (!paidBy) { showToast('Please select who paid', 'error'); return; }
    
    // Calculate splits
    const checkedMembers = Array.from(document.querySelectorAll('.split-member-check:checked')).map(c => c.dataset.member);
    if (checkedMembers.length === 0) { showToast('Select at least one member to split with', 'error'); return; }
    
    let splits = {};
    
    if (Store.currentSplitType === 'equal') {
        const share = amount / checkedMembers.length;
        checkedMembers.forEach(m => splits[m] = share);
    } else if (Store.currentSplitType === 'exact') {
        let total = 0;
        checkedMembers.forEach(m => {
            const input = document.querySelector(`.split-member-amount[data-member="${m}"]`);
            const val = parseFloat(input?.value) || 0;
            splits[m] = val;
            total += val;
        });
        if (Math.abs(total - amount) > 0.01) {
            showToast(`Split amounts (${formatAmount(total)}) don't match total (${formatAmount(amount)})`, 'error');
            return;
        }
    } else {
        let totalPct = 0;
        checkedMembers.forEach(m => {
            const input = document.querySelector(`.split-member-amount[data-member="${m}"]`);
            const pct = parseFloat(input?.value) || 0;
            splits[m] = (pct / 100) * amount;
            totalPct += pct;
        });
        if (Math.abs(totalPct - 100) > 0.1) {
            showToast(`Percentages must add up to 100% (currently ${totalPct.toFixed(1)}%)`, 'error');
            return;
        }
    }
    
    const expense = {
        id: generateId(),
        description,
        amount,
        groupId,
        category,
        date,
        paidBy,
        notes,
        splits,
        splitType: Store.currentSplitType,
        createdAt: new Date().toISOString()
    };
    
    Store.expenses.push(expense);
    Store.save();
    closeExpenseModal();
    showToast(`"${description}" added — ${formatAmount(amount)}`);
    refreshAll();
}

function deleteExpense(expenseId) {
    Store.expenses = Store.expenses.filter(e => e.id !== expenseId);
    Store.save();
    showToast('Expense deleted', 'info');
    refreshAll();
}

function showExpenseDetail(expenseId) {
    const expense = Store.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    Store.currentDetailExpenseId = expenseId;
    const group = Store.groups.find(g => g.id === expense.groupId);
    
    const modal = document.getElementById('detail-modal');
    document.getElementById('detail-modal-title').textContent = expense.description;
    
    const body = document.getElementById('detail-modal-body');
    body.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Amount</div>
                <div class="detail-value" style="font-size:1.3rem;color:var(--accent-primary)">${formatAmount(expense.amount)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Paid By</div>
                <div class="detail-value">${expense.paidBy}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Category</div>
                <div class="detail-value">${getCategoryEmoji(expense.category)} ${getCategoryLabel(expense.category)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date</div>
                <div class="detail-value">${formatDate(expense.date)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Group</div>
                <div class="detail-value">${group ? group.icon + ' ' + group.name : 'Unknown'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Split Type</div>
                <div class="detail-value" style="text-transform:capitalize">${expense.splitType}</div>
            </div>
        </div>
        ${expense.notes ? `<div class="detail-item" style="margin-bottom:var(--space-lg)"><div class="detail-label">Notes</div><div class="detail-value">${expense.notes}</div></div>` : ''}
        <div class="detail-split-title">Split Breakdown</div>
        <div class="detail-split-list">
            ${Object.entries(expense.splits).map(([name, share]) => `
                <div class="detail-split-item">
                    <span>${name} ${name === expense.paidBy ? '(paid)' : ''}</span>
                    <span style="font-weight:700">${formatAmount(share)}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
    Store.currentDetailExpenseId = null;
}

function deleteExpenseFromDetail() {
    if (Store.currentDetailExpenseId) {
        if (confirm('Are you sure you want to delete this expense?')) {
            deleteExpense(Store.currentDetailExpenseId);
            closeDetailModal();
        }
    }
}

function filterExpenses() {
    refreshExpenses();
}

function setExpenseFilter(filter) {
    Store.currentFilter = filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
    refreshExpenses();
}

function refreshExpenses() {
    const list = document.getElementById('expenses-list');
    const empty = document.getElementById('expenses-empty');
    const search = document.getElementById('expense-search').value.toLowerCase();
    
    let filtered = [...Store.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Category filter
    if (Store.currentFilter !== 'all') {
        filtered = filtered.filter(e => e.category === Store.currentFilter);
    }
    
    // Search filter
    if (search) {
        filtered = filtered.filter(e => 
            e.description.toLowerCase().includes(search) ||
            e.paidBy.toLowerCase().includes(search) ||
            e.category.toLowerCase().includes(search)
        );
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty.cloneNode(true)).style.display = 'flex';
        return;
    }
    
    list.innerHTML = filtered.map(expense => {
        const group = Store.groups.find(g => g.id === expense.groupId);
        return `
            <div class="expense-item" onclick="showExpenseDetail('${expense.id}')">
                <div class="expense-icon cat-${expense.category}">${getCategoryEmoji(expense.category)}</div>
                <div class="expense-details">
                    <div class="expense-name">${expense.description}</div>
                    <div class="expense-meta">
                        <span>${group ? group.name : ''}</span>
                        <span class="expense-meta-dot"></span>
                        <span>${formatDate(expense.date)}</span>
                        <span class="expense-meta-dot"></span>
                        <span>${getCategoryLabel(expense.category)}</span>
                    </div>
                </div>
                <div class="expense-right">
                    <div class="expense-amount">${formatAmount(expense.amount)}</div>
                    <div class="expense-paid-by">Paid by ${expense.paidBy}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// QUICK EXPENSE
// ==========================================
function showQuickExpense() {
    const modal = document.getElementById('quick-expense-modal');
    modal.classList.add('active');
    document.getElementById('quick-expense-text').value = '';
    
    // Populate groups
    const groupSelect = document.getElementById('quick-group');
    groupSelect.innerHTML = '<option value="">Select a group</option>' + 
        Store.groups.map(g => `<option value="${g.id}">${g.icon} ${g.name}</option>`).join('');
    
    setTimeout(() => document.getElementById('quick-expense-text').focus(), 100);
}

function closeQuickExpense() {
    document.getElementById('quick-expense-modal').classList.remove('active');
}

function processQuickExpense() {
    const text = document.getElementById('quick-expense-text').value.trim();
    const groupId = document.getElementById('quick-group').value;
    const category = document.getElementById('quick-category').value;
    
    if (!text) { showToast('Please enter expense details', 'error'); return; }
    if (!groupId) { showToast('Please select a group', 'error'); return; }
    
    // Parse: description amount
    const amountMatch = text.match(/(\d+\.?\d*)/);
    if (!amountMatch) { showToast('Could not find an amount. Include a number.', 'error'); return; }
    
    const amount = parseFloat(amountMatch[1]);
    const description = text.replace(amountMatch[0], '').replace(/\s+/g, ' ').trim() || 'Quick Expense';
    
    const group = Store.groups.find(g => g.id === groupId);
    const splits = {};
    const share = amount / group.members.length;
    group.members.forEach(m => splits[m] = share);
    
    const expense = {
        id: generateId(),
        description,
        amount,
        groupId,
        category,
        date: new Date().toISOString().split('T')[0],
        paidBy: 'You',
        notes: '',
        splits,
        splitType: 'equal',
        createdAt: new Date().toISOString()
    };
    
    Store.expenses.push(expense);
    Store.save();
    closeQuickExpense();
    showToast(`Quick expense "${description}" — ${formatAmount(amount)} added!`);
    refreshAll();
}

// ==========================================
// SETTLE UP / BALANCES
// ==========================================
function calculateBalances() {
    const balances = {}; // person -> net balance (positive = owed, negative = owes)
    
    Store.expenses.forEach(expense => {
        const paidBy = expense.paidBy;
        
        // The payer gets credit for the full amount
        if (!balances[paidBy]) balances[paidBy] = 0;
        balances[paidBy] += parseFloat(expense.amount);
        
        // Each person who owes their share
        Object.entries(expense.splits).forEach(([person, share]) => {
            if (!balances[person]) balances[person] = 0;
            balances[person] -= parseFloat(share);
        });
    });
    
    return balances;
}

function simplifyDebts() {
    refreshSettle();
    showToast('Debts simplified!', 'success');
}

function calculateSettlements(balances) {
    // Minimize transactions using greedy algorithm
    const debtors = []; // people who owe (negative balance)
    const creditors = []; // people who are owed (positive balance)
    
    Object.entries(balances).forEach(([name, balance]) => {
        if (balance < -0.01) debtors.push({ name, amount: -balance });
        else if (balance > 0.01) creditors.push({ name, amount: balance });
    });
    
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    
    const settlements = [];
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
        const payment = Math.min(debtors[i].amount, creditors[j].amount);
        
        if (payment > 0.01) {
            settlements.push({
                from: debtors[i].name,
                to: creditors[j].name,
                amount: payment
            });
        }
        
        debtors[i].amount -= payment;
        creditors[j].amount -= payment;
        
        if (debtors[i].amount < 0.01) i++;
        if (creditors[j].amount < 0.01) j++;
    }
    
    return settlements;
}

function settlePayment(from, to, amount) {
    if (confirm(`Mark ${from} → ${to} (${formatAmount(amount)}) as settled?`)) {
        // Create a settlement expense (reverse transaction)
        const group = Store.groups[0]; // Use first group
        if (group) {
            const expense = {
                id: generateId(),
                description: `Settlement: ${from} → ${to}`,
                amount: amount,
                groupId: group.id,
                category: 'other',
                date: new Date().toISOString().split('T')[0],
                paidBy: from,
                notes: 'Auto-generated settlement',
                splits: { [to]: amount },
                splitType: 'exact',
                createdAt: new Date().toISOString()
            };
            Store.expenses.push(expense);
            Store.save();
            showToast(`Settled! ${from} paid ${to} ${formatAmount(amount)}`);
            showConfetti();
            refreshAll();
        }
    }
}

function refreshSettle() {
    const balances = calculateBalances();
    const settlements = calculateSettlements(balances);
    
    // Render balances
    const balancesList = document.getElementById('balances-list');
    const entries = Object.entries(balances).filter(([_, b]) => Math.abs(b) > 0.01);
    
    if (entries.length === 0) {
        balancesList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                <p>All balanced!</p>
                <span>Everyone is settled up</span>
            </div>
        `;
    } else {
        balancesList.innerHTML = entries
            .sort((a, b) => b[1] - a[1])
            .map(([name, balance]) => `
                <div class="balance-item">
                    <div class="balance-avatar" style="background: ${getAvatarColor(name)}">${getInitial(name)}</div>
                    <div class="balance-info">
                        <div class="balance-name">${name}</div>
                    </div>
                    <div class="balance-amount ${balance > 0 ? 'positive' : 'negative'}">
                        ${balance > 0 ? '+' : ''}${formatAmount(Math.abs(balance))}
                    </div>
                </div>
            `).join('');
    }
    
    // Render settlements
    const settlementsList = document.getElementById('settlements-list');
    document.getElementById('settlements-count').textContent = `${settlements.length} payment${settlements.length !== 1 ? 's' : ''}`;
    
    if (settlements.length === 0) {
        settlementsList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                <p>All settled up! 🎉</p>
                <span>No pending settlements</span>
            </div>
        `;
    } else {
        settlementsList.innerHTML = settlements.map(s => `
            <div class="settlement-item">
                <div class="balance-avatar" style="background: ${getAvatarColor(s.from)};width:32px;height:32px;font-size:0.7rem">${getInitial(s.from)}</div>
                <div class="settlement-info">
                    <span class="settlement-from">${s.from}</span>
                </div>
                <span class="settlement-arrow">→</span>
                <div class="balance-avatar" style="background: ${getAvatarColor(s.to)};width:32px;height:32px;font-size:0.7rem">${getInitial(s.to)}</div>
                <div class="settlement-info">
                    <span class="settlement-to">${s.to}</span>
                </div>
                <span class="settlement-amount">${formatAmount(s.amount)}</span>
                <button class="settle-btn" onclick="settlePayment('${s.from}','${s.to}',${s.amount})">Settle</button>
            </div>
        `).join('');
    }
}

// ==========================================
// DASHBOARD
// ==========================================
function refreshDashboard() {
    const totalExpenses = Store.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balances = calculateBalances();
    
    let youAreOwed = 0;
    let youOwe = 0;
    const youBalance = balances['You'] || 0;
    if (youBalance > 0) youAreOwed = youBalance;
    else youOwe = Math.abs(youBalance);
    
    document.getElementById('stat-total-value').textContent = formatAmount(totalExpenses);
    document.getElementById('stat-owed-value').textContent = formatAmount(youAreOwed);
    document.getElementById('stat-owe-value').textContent = formatAmount(youOwe);
    document.getElementById('stat-groups-value').textContent = Store.groups.length;
    
    // Recent activity
    const activityList = document.getElementById('activity-list');
    const recentExpenses = [...Store.expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
    
    document.getElementById('activity-count').textContent = `${Store.expenses.length} items`;
    
    if (recentExpenses.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <p>No expenses yet</p>
                <span>Add your first expense to get started!</span>
            </div>
        `;
    } else {
        activityList.innerHTML = recentExpenses.map(expense => `
            <div class="activity-item" onclick="showExpenseDetail('${expense.id}')">
                <div class="activity-icon cat-${expense.category}">${getCategoryEmoji(expense.category)}</div>
                <div class="activity-info">
                    <div class="activity-name">${expense.description}</div>
                    <div class="activity-meta">${expense.paidBy} • ${formatDate(expense.date)}</div>
                </div>
                <div class="activity-amount">${formatAmount(expense.amount)}</div>
            </div>
        `).join('');
    }
    
    // Draw chart
    drawExpenseChart();
}

// ==========================================
// CHARTS (Canvas-based, no library needed)
// ==========================================
function drawExpenseChart() {
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth * 2;
    canvas.height = container.clientHeight * 2;
    ctx.scale(2, 2);
    
    const w = container.clientWidth;
    const h = container.clientHeight;
    
    // Calculate category totals
    const period = document.getElementById('chart-period')?.value || 'month';
    let filtered = [...Store.expenses];
    
    const now = new Date();
    if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => new Date(e.date) >= weekAgo);
    } else if (period === 'month') {
        filtered = filtered.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    }
    
    const categories = {};
    filtered.forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + parseFloat(e.amount);
    });
    
    const catColors = {
        food: '#f97316', transport: '#3b82f6', entertainment: '#ec4899',
        shopping: '#8b5cf6', bills: '#14b8a6', travel: '#f59e0b', other: '#6b7280'
    };
    
    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [_, v]) => sum + v, 0);
    
    // Draw donut chart
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const innerRadius = radius * 0.6;
    
    ctx.clearRect(0, 0, w, h);
    
    if (total === 0) {
        // Empty state
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-input').trim() || 'rgba(255,255,255,0.05)';
        ctx.fill();
        
        ctx.font = '500 14px Outfit';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#6b6b85';
        ctx.textAlign = 'center';
        ctx.fillText('No data', centerX, centerY);
        
        document.getElementById('chart-legend').innerHTML = '';
        return;
    }
    
    let startAngle = -Math.PI / 2;
    
    entries.forEach(([cat, amount]) => {
        const sliceAngle = (amount / total) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = catColors[cat] || '#6b7280';
        ctx.fill();
        
        // Gap
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle + sliceAngle - 0.01, startAngle + sliceAngle + 0.01);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle + 0.01, startAngle + sliceAngle - 0.01, true);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#16162380';
        ctx.fill();
        
        startAngle += sliceAngle;
    });
    
    // Center text
    ctx.font = '800 18px Outfit';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#f0f0f5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatAmount(total), centerX, centerY - 8);
    
    ctx.font = '400 11px Outfit';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#6b6b85';
    ctx.fillText('Total', centerX, centerY + 12);
    
    // Legend
    document.getElementById('chart-legend').innerHTML = entries.map(([cat, amount]) => `
        <div class="legend-item">
            <span class="legend-dot" style="background:${catColors[cat]}"></span>
            <span>${getCategoryEmoji(cat)} ${getCategoryLabel(cat)}: ${formatAmount(amount)} (${((amount/total)*100).toFixed(0)}%)</span>
        </div>
    `).join('');
}

// ==========================================
// ANALYTICS
// ==========================================
function refreshAnalytics() {
    drawTrendsChart();
    drawCategoryChart();
    renderTopSpenders();
    renderMonthlySummary();
}

function drawTrendsChart() {
    const canvas = document.getElementById('trends-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 400;
    ctx.scale(2, 2);
    
    const w = rect.width;
    const h = 200;
    
    ctx.clearRect(0, 0, w, h);
    
    // Group expenses by day (last 30 days)
    const days = 30;
    const now = new Date();
    const dailyTotals = [];
    const labels = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const total = Store.expenses
            .filter(e => e.date === dateStr)
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        dailyTotals.push(total);
        labels.push(date.getDate());
    }
    
    const maxVal = Math.max(...dailyTotals, 1);
    const padding = { top: 20, right: 20, bottom: 30, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(167, 139, 250, 0.3)');
    gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
    
    // Draw area
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    
    dailyTotals.forEach((val, i) => {
        const x = padding.left + (i / (days - 1)) * chartW;
        const y = padding.top + (1 - val / maxVal) * chartH;
        
        if (i === 0) ctx.lineTo(x, y);
        else {
            const prevX = padding.left + ((i - 1) / (days - 1)) * chartW;
            const prevY = padding.top + (1 - dailyTotals[i-1] / maxVal) * chartH;
            const cpX = (prevX + x) / 2;
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
    });
    
    ctx.lineTo(padding.left + chartW, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    dailyTotals.forEach((val, i) => {
        const x = padding.left + (i / (days - 1)) * chartW;
        const y = padding.top + (1 - val / maxVal) * chartH;
        
        if (i === 0) ctx.moveTo(x, y);
        else {
            const prevX = padding.left + ((i - 1) / (days - 1)) * chartW;
            const prevY = padding.top + (1 - dailyTotals[i-1] / maxVal) * chartH;
            const cpX = (prevX + x) / 2;
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
    });
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Draw dots for non-zero days
    dailyTotals.forEach((val, i) => {
        if (val > 0) {
            const x = padding.left + (i / (days - 1)) * chartW;
            const y = padding.top + (1 - val / maxVal) * chartH;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#a78bfa';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    });
    
    // X-axis labels (every 5 days)
    ctx.font = '400 10px Outfit';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#6b6b85';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
        if (i % 5 === 0) {
            const x = padding.left + (i / (days - 1)) * chartW;
            ctx.fillText(label, x, h - 8);
        }
    });
}

function drawCategoryChart() {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 400;
    ctx.scale(2, 2);
    
    const w = rect.width;
    const h = 200;
    
    ctx.clearRect(0, 0, w, h);
    
    const categories = {};
    Store.expenses.forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + parseFloat(e.amount);
    });
    
    const catColors = {
        food: '#f97316', transport: '#3b82f6', entertainment: '#ec4899',
        shopping: '#8b5cf6', bills: '#14b8a6', travel: '#f59e0b', other: '#6b7280'
    };
    
    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length ? entries[0][1] : 1;
    
    const barHeight = 28;
    const gap = 10;
    const labelWidth = 100;
    const barAreaWidth = w - labelWidth - 80;
    const startY = 10;
    
    entries.forEach(([cat, amount], i) => {
        const y = startY + i * (barHeight + gap);
        const barW = (amount / maxVal) * barAreaWidth;
        
        // Label
        ctx.font = '500 12px Outfit';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#9898b0';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${getCategoryEmoji(cat)} ${getCategoryLabel(cat)}`, labelWidth, y + barHeight / 2);
        
        // Bar background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-input').trim() || 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.roundRect(labelWidth + 10, y, barAreaWidth, barHeight, 6);
        ctx.fill();
        
        // Bar fill
        ctx.fillStyle = catColors[cat] || '#6b7280';
        ctx.beginPath();
        ctx.roundRect(labelWidth + 10, y, Math.max(barW, 4), barHeight, 6);
        ctx.fill();
        
        // Amount
        ctx.font = '600 11px Outfit';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#f0f0f5';
        ctx.textAlign = 'left';
        ctx.fillText(formatAmount(amount), labelWidth + barW + 18, y + barHeight / 2);
    });
}

function renderTopSpenders() {
    const container = document.getElementById('top-spenders');
    
    const spending = {};
    Store.expenses.forEach(e => {
        spending[e.paidBy] = (spending[e.paidBy] || 0) + parseFloat(e.amount);
    });
    
    const sorted = Object.entries(spending).sort((a, b) => b[1] - a[1]);
    const maxSpending = sorted.length ? sorted[0][1] : 1;
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
        return;
    }
    
    container.innerHTML = sorted.map(([name, amount], i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'default';
        const medals = ['🥇', '🥈', '🥉'];
        return `
            <div class="spender-item">
                <div class="spender-rank ${rankClass}">${i < 3 ? medals[i] : i + 1}</div>
                <div class="spender-info">
                    <div class="spender-name">${name}</div>
                    <div class="spender-bar">
                        <div class="spender-bar-fill" style="width:${(amount/maxSpending)*100}%"></div>
                    </div>
                </div>
                <div class="spender-amount">${formatAmount(amount)}</div>
            </div>
        `;
    }).join('');
}

function renderMonthlySummary() {
    const container = document.getElementById('monthly-summary');
    
    const months = {};
    Store.expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!months[key]) months[key] = { total: 0, count: 0 };
        months[key].total += parseFloat(e.amount);
        months[key].count++;
    });
    
    const sorted = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
        return;
    }
    
    container.innerHTML = sorted.map(([key, data]) => {
        const [year, month] = key.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        return `
            <div class="month-item">
                <div>
                    <div class="month-name">${monthName}</div>
                    <div class="month-count">${data.count} expense${data.count !== 1 ? 's' : ''}</div>
                </div>
                <div class="month-amount">${formatAmount(data.total)}</div>
            </div>
        `;
    }).join('');
}

// ==========================================
// EXPORT
// ==========================================
function exportData() {
    if (Store.expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Paid By', 'Group', 'Split Type', 'Notes'];
    const rows = Store.expenses.map(e => {
        const group = Store.groups.find(g => g.id === e.groupId);
        return [
            e.date,
            `"${e.description}"`,
            e.amount,
            getCategoryLabel(e.category),
            e.paidBy,
            group ? `"${group.name}"` : '',
            e.splitType,
            `"${e.notes || ''}"`
        ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spliz_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported to CSV!', 'success');
}

// ==========================================
// REFRESH ALL
// ==========================================
function refreshAll() {
    switch (Store.currentTab) {
        case 'dashboard': refreshDashboard(); break;
        case 'groups': refreshGroups(); break;
        case 'expenses': refreshExpenses(); break;
        case 'settle': refreshSettle(); break;
        case 'analytics': refreshAnalytics(); break;
    }
    
    // Update group dropdowns
    updateGroupDropdowns();
}

function updateGroupDropdowns() {
    const selects = ['expense-group', 'quick-group'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select a group</option>' + 
            Store.groups.map(g => `<option value="${g.id}">${g.icon} ${g.name}</option>`).join('');
        if (Store.groups.find(g => g.id === currentVal)) select.value = currentVal;
    });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Load data
    Store.load();
    initTheme();
    initCurrency();
    
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Chart period change
    document.getElementById('chart-period')?.addEventListener('change', drawExpenseChart);
    
    // Amount change updates split display
    document.getElementById('expense-amount')?.addEventListener('input', () => {
        const groupId = document.getElementById('expense-group').value;
        const group = Store.groups.find(g => g.id === groupId);
        if (group) updateSplitMembers(group.members);
    });
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
        // Ctrl+N for new expense
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            if (Store.groups.length > 0) showExpenseModal();
            else showToast('Create a group first', 'info');
        }
        // Ctrl+G for new group
        if (e.ctrlKey && e.key === 'g') {
            e.preventDefault();
            showGroupModal();
        }
    });
    
    // Window resize for charts
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (Store.currentTab === 'dashboard') drawExpenseChart();
            if (Store.currentTab === 'analytics') refreshAnalytics();
        }, 250);
    });
    
    // Initial render
    refreshDashboard();
    
    console.log('%c✨ Spliz loaded!', 'color: #a78bfa; font-size: 16px; font-weight: bold;');
});
